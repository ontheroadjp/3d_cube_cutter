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
    // Access presentation.display instead of display
    expect(model.presentation.display.showVertexLabels).toBe(true);

    manager.setDisplay({
      ...model.presentation.display,
      showVertexLabels: false
    });
    expect(manager.getModel().presentation.display.showVertexLabels).toBe(false);

    globalThis.document = originalDocument;
  });

  it('tracks cut intersections on edges', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    manager.applyCutIntersections([
      { id: 'E:0-1@1/2', type: 'intersection' },
      { id: 'V:2', type: 'intersection' }
    ]);

    const model = manager.getModel();
    
    // Access presentation edges/vertices by ID directly (no find needed)
    const edgePres = model.presentation.edges['E:0-1'];
    const vertexPres = model.presentation.vertices['V:2'];
    
    expect(edgePres).toBeTruthy();
    expect(vertexPres).toBeTruthy();
    
    // Check flags on presentation objects
    expect(edgePres.hasCutPoint).toBe(true);
    expect(edgePres.isMidpointCut).toBe(true);
    expect(vertexPres.isCutPoint).toBe(true);

    expect(manager.getEdgeHighlightColor('E:0-1')).toBe(0x00cc66);
    expect(manager.getEdgeHighlightColor('E:1-2')).toBe(0xff8800);

    const resolved = manager.resolveCutIntersectionPositions();
    const midpoint = resolved.find(ref => ref.id === 'E:0-1@1/2');
    const vertexResolved = resolved.find(ref => ref.id === 'V:2');
    const edgeResolved = resolver.resolveEdge('E:0-1');
    expect(midpoint.position).toBeInstanceOf(THREE.Vector3);
    expect(vertexResolved.position).toBeInstanceOf(THREE.Vector3);
    if (edgeResolved) {
      const expectedMid = edgeResolved.start.clone().add(edgeResolved.end).multiplyScalar(0.5);
      expect(midpoint.position.distanceTo(expectedMid)).toBeLessThan(1e-6);
    }
  });

  it('resolves cut intersection positions via resolver', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    const resolveSpy = vi.spyOn(resolver, 'resolveSnapPoint');
    manager.applyCutIntersections([
      { id: 'V:0', type: 'intersection' },
      { id: 'E:0-1@1/2', type: 'intersection' }
    ]);

    const resolved = manager.resolveCutIntersectionPositions();
    const midpoint = resolved.find(ref => ref.id === 'E:0-1@1/2');
    const vertexResolved = resolved.find(ref => ref.id === 'V:0');

    expect(resolveSpy).toHaveBeenCalledWith('E:0-1@1/2');
    expect(resolveSpy).toHaveBeenCalledWith('V:0');
    expect(midpoint?.position).toBeInstanceOf(THREE.Vector3);
    expect(vertexResolved?.position).toBeInstanceOf(THREE.Vector3);
  });

  it('syncs cut segments and face polygons', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const manager = new ObjectModelManager({ cube, resolver, ui: null });
    manager.build();

    const polygon = {
      faceId: 'F:test',
      type: 'original',
      vertexIds: ['V:0', 'V:1', 'V:2']
    };

    manager.syncCutState({
      intersections: [{ id: 'V:0', type: 'intersection' }],
      cutSegments: [{ startId: 'V:0', endId: 'V:1' }],
      facePolygons: [polygon],
      faceAdjacency: [{ a: 'F:test', b: 'F:neighbor' }]
    });

    const model = manager.getModel();
    // Access derived.cut instead of cut
    expect(model.derived.cut.cutSegments.length).toBe(1);
    expect(manager.getCutSegments().length).toBe(1);
    expect(model.derived.cut.facePolygons.length).toBe(1);
    expect(manager.getCutFaceAdjacency().length).toBe(1);
    expect(manager.getCutFaceAdjacency()[0].sharedEdgeIds).toBeUndefined();
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
    // Access derived.net instead of net
    expect(model.derived.net.faces.length).toBe(1);
    expect(model.derived.net.animation.state).toBe('opening');
    expect(model.derived.net.animation.progress).toBe(0.5);
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
    expect(model.derived.net.animation.startAt).toBe(1234);
    expect(model.derived.net.animation.camera.endPos).toBeInstanceOf(THREE.Vector3);
    expect(model.derived.net.animation.camera.endPos.x).toBe(4);
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
    expect(model.derived.net.animation.camera.startPos.x).toBe(1);
    expect(model.derived.net.animation.progress).toBe(0.25);
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
    // Access derived.net.visible
    expect(manager.getModel().derived.net.visible).toBe(true);
  });

  it('applies display state to cube and selection', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const selection = {
      toggleVertexLabels: vi.fn(),
      setEdgeLabelMode: vi.fn(),
    };
    const toggleTransparencySpy = vi.spyOn(cube, 'toggleTransparency');
    const manager = new ObjectModelManager({ cube, resolver, ui: null, selection });
    const cutter = {
      toggleSurface: vi.fn(),
      togglePyramid: vi.fn(),
      setCutPointsVisible: vi.fn(),
      setCutLineColorize: vi.fn(),
      setShowNormalHelper: vi.fn(),
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
      showNormalHelper: false,
      faceColorTheme: 'blue',
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
      showNormalHelper: false,
      faceColorTheme: 'blue',
    });
    manager.applyCutDisplayToView({ cutter });

    expect(selection.toggleVertexLabels).toHaveBeenCalledWith(false);
    expect(selection.setEdgeLabelMode).toHaveBeenCalledWith('popup');
    expect(toggleTransparencySpy).toHaveBeenCalledWith(true);
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
      showNormalHelper: false,
      faceColorTheme: 'blue',
    });
    manager.applyCutDisplayToView({ cutter });
    expect(cutter.toggleSurface).toHaveBeenCalledWith(false);
  });
});
