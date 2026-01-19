import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../dist/js/utils.js', () => ({
  createLabel: () => new THREE.Sprite(),
}));

import { Cube } from '../../dist/js/Cube.js';
import { GeometryResolver } from '../../dist/js/geometry/GeometryResolver.js';
import { UIManager } from '../../dist/js/UIManager.js';
import { ObjectModelManager } from '../../dist/js/model/objectModelManager.js';

describe('object model manager', () => {
  it('builds and updates display state', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });

    const elements = new Map();
    const createInput = (checked = false) => ({ checked });
    elements.set('edgeLabelMode', { value: 'visible' });
    elements.set('toggleVertexLabels', createInput(true));
    elements.set('toggleFaceLabels', createInput(true));
    elements.set('toggleCutSurface', createInput(true));
    elements.set('togglePyramid', createInput(false));
    elements.set('toggleCubeTransparency', createInput(true));
    elements.set('toggleCutPoints', createInput(true));
    elements.set('toggleCutLineColor', createInput(false));
    const originalDocument = globalThis.document;
    globalThis.document = {
      getElementById: (id) => elements.get(id) || null,
    };

    const ui = new UIManager();
    const manager = new ObjectModelManager({ cube, resolver, ui });
    const model = manager.build();

    expect(model).not.toBeNull();
    expect(model.display.showVertexLabels).toBe(true);

    manager.setDisplay({
      ...model.display,
      showVertexLabels: false
    });
    expect(manager.getModel().display.showVertexLabels).toBe(false);

    globalThis.document = originalDocument;
  });

  it('tracks cut intersections on edges', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    manager.applyCutIntersections([
      { id: 'E:01@1/2', type: 'intersection' },
      { id: 'V:2', type: 'intersection' }
    ]);

    const model = manager.getModel();
    const edgeModel = model.solid.edges.find(e => e.id === 'E:01');
    const vertexModel = model.solid.vertices.find(v => v.id === 'V:2');
    expect(edgeModel.flags.hasCutPoint).toBe(true);
    expect(edgeModel.flags.isMidpointCut).toBe(true);
    expect(vertexModel.flags.isCutPoint).toBe(true);

    expect(manager.getEdgeHighlightColor('E:01')).toBe(0x00cc66);
    expect(manager.getEdgeHighlightColor('E:12')).toBe(0xff8800);

    const resolved = manager.resolveCutIntersectionPositions();
    const midpoint = resolved.find(ref => ref.id === 'E:01@1/2');
    const vertexResolved = resolved.find(ref => ref.id === 'V:2');
    const edgeResolved = resolver.resolveEdge('E:01');
    expect(midpoint.position).toBeInstanceOf(THREE.Vector3);
    expect(vertexResolved.position).toBeInstanceOf(THREE.Vector3);
    if (edgeResolved) {
      const expectedMid = edgeResolved.start.clone().add(edgeResolved.end).multiplyScalar(0.5);
      expect(midpoint.position.distanceTo(expectedMid)).toBeLessThan(1e-6);
    }
  });

  it('syncs cut segments and face polygons', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(1, 0, 0);
    const polygon = {
      faceId: 'F:test',
      type: 'original',
      vertices: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 0)],
      normal: new THREE.Vector3(0, 0, 1)
    };

    manager.syncCutState({
      intersections: [{ id: 'V:0', type: 'intersection' }],
      cutSegments: [{ startId: 'V:0', endId: 'V:1', start, end }],
      facePolygons: [polygon],
      faceAdjacency: [{ a: 'F:test', b: 'F:neighbor', sharedEdge: [start, end] }]
    });

    const model = manager.getModel();
    expect(model.cut.cutSegments.length).toBe(1);
    expect(manager.getCutSegments().length).toBe(1);
    expect(model.cut.facePolygons.length).toBe(1);
    expect(manager.getCutFaceAdjacency().length).toBe(1);
  });

  it('syncs net state', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    manager.syncNetState({
      faces: [{ faceId: 'F:0154', delayIndex: 0 }],
      animation: { state: 'opening', progress: 0.5, duration: 1000 }
    });

    const model = manager.getModel();
    expect(model.net.faces.length).toBe(1);
    expect(model.net.animation.state).toBe('opening');
    expect(model.net.animation.progress).toBe(0.5);
  });

  it('syncs net timing and camera info', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    const camera = {
      startPos: new THREE.Vector3(1, 2, 3),
      startTarget: new THREE.Vector3(0, 0, 0),
      endPos: new THREE.Vector3(4, 5, 6),
      endTarget: new THREE.Vector3(1, 1, 1)
    };

    manager.syncNetState({
      animation: { startAt: 1234, camera }
    });

    const model = manager.getModel();
    expect(model.net.animation.startAt).toBe(1234);
    expect(model.net.animation.camera.endPos).toBeInstanceOf(THREE.Vector3);
    expect(model.net.animation.camera.endPos.x).toBe(4);
  });

  it('keeps net camera when partial updates omit it', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    manager.syncNetState({
      animation: {
        camera: {
          startPos: new THREE.Vector3(1, 0, 0),
          startTarget: new THREE.Vector3(0, 0, 0),
          endPos: new THREE.Vector3(2, 0, 0),
          endTarget: new THREE.Vector3(0, 0, 0)
        }
      }
    });

    manager.syncNetState({
      animation: { progress: 0.25 }
    });

    const model = manager.getModel();
    expect(model.net.animation.camera.startPos.x).toBe(1);
    expect(model.net.animation.progress).toBe(0.25);
  });

  it('tracks net visibility', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    expect(manager.getNetVisible()).toBe(false);
    manager.setNetVisible(true);
    expect(manager.getNetVisible()).toBe(true);
    expect(manager.getModel().net.visible).toBe(true);
  });

  it('applies display state to cube and selection', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const selection = {
      toggleVertexLabels: vi.fn(),
      setEdgeLabelMode: vi.fn(),
    };
    const manager = new ObjectModelManager({ cube, resolver, ui: null, selection });
    const cutter = {
      toggleSurface: vi.fn(),
      togglePyramid: vi.fn(),
      setCutPointsVisible: vi.fn(),
      setCutLineColorize: vi.fn(),
    };

    manager.applyDisplayToView({
      showVertexLabels: false,
      showFaceLabels: true,
      edgeLabelMode: 'popup',
      showCutSurface: true,
      showPyramid: false,
      cubeTransparent: true,
      showCutPoints: true,
      colorizeCutLines: false,
    });
    manager.setDisplay({
      showVertexLabels: false,
      showFaceLabels: true,
      edgeLabelMode: 'popup',
      showCutSurface: true,
      showPyramid: false,
      cubeTransparent: true,
      showCutPoints: true,
      colorizeCutLines: false,
    });
    manager.applyCutDisplayToView({ cutter });

    expect(selection.toggleVertexLabels).toHaveBeenCalledWith(false);
    expect(selection.setEdgeLabelMode).toHaveBeenCalledWith('popup');
    expect(cube.cubeMesh.material.transparent).toBe(true);
    expect(cutter.toggleSurface).toHaveBeenCalledWith(true);
    expect(cutter.togglePyramid).toHaveBeenCalledWith(false);
    expect(cutter.setCutPointsVisible).toHaveBeenCalledWith(true);
    expect(cutter.setCutLineColorize).toHaveBeenCalledWith(false);

    manager.setDisplay({
      showVertexLabels: false,
      showFaceLabels: true,
      edgeLabelMode: 'popup',
      showCutSurface: false,
      showPyramid: false,
      cubeTransparent: true,
      showCutPoints: true,
      colorizeCutLines: false,
    });
    manager.applyCutDisplayToView({ cutter });
    expect(cutter.toggleSurface).toHaveBeenCalledWith(false);
  });
});
