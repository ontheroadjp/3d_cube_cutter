import type { CutFacePolygon, DisplayState, IntersectionPoint } from '../types.js';
import * as THREE from 'three';
import type { Cube } from '../Cube.js';
import type { GeometryResolver } from '../geometry/GeometryResolver.js';
import type { UIManager } from '../UIManager.js';

type SelectionLike = {
  toggleVertexLabels: (visible: boolean) => void;
  setEdgeLabelMode: (mode: DisplayState['edgeLabelMode']) => void;
};
import type { ObjectCutAdjacency, ObjectCutSegment, ObjectModel, ObjectNetFace, ObjectNetState } from './objectModel.js';
import { buildObjectSolidModel } from './objectModelBuilder.js';
import { normalizeSnapPointId, parseSnapPointId } from '../geometry/snapPointId.js';

const DEFAULT_DISPLAY: DisplayState = {
  showVertexLabels: true,
  showFaceLabels: true,
  edgeLabelMode: 'visible',
  showCutSurface: true,
  showPyramid: false,
  cubeTransparent: true,
  showCutPoints: true,
  colorizeCutLines: false
};

export class ObjectModelManager {
  cube: Cube;
  resolver: GeometryResolver;
  ui: UIManager | null;
  selection: SelectionLike | null;
  model: ObjectModel | null;
  edgeMap: Map<string, ObjectModel['solid']['edges'][number]> | null;
  vertexMap: Map<string, ObjectModel['solid']['vertices'][number]> | null;
  cutIntersections: IntersectionPoint[];
  cutSegments: ObjectCutSegment[];
  cutFacePolygons: CutFacePolygon[];
  cutFaceAdjacency: ObjectCutAdjacency[];
  netFaces: ObjectNetFace[];
  netState: ObjectNetState;
  netVisible: boolean;

  constructor({
    cube,
    resolver,
    ui,
    selection
  }: {
    cube: Cube;
    resolver: GeometryResolver;
    ui?: UIManager | null;
    selection?: SelectionLike | null;
  }) {
    this.cube = cube;
    this.resolver = resolver;
    this.ui = ui || null;
    this.selection = selection || null;
    this.model = null;
    this.edgeMap = null;
    this.vertexMap = null;
    this.cutIntersections = [];
    this.cutSegments = [];
    this.cutFacePolygons = [];
    this.cutFaceAdjacency = [];
    this.netFaces = [];
    this.netState = this.createDefaultNetState();
    this.netVisible = false;
  }

  build(displayOverride?: DisplayState) {
    const structure = this.cube.getStructure();
    const solid = buildObjectSolidModel({
      structure,
      resolver: this.resolver,
      size: this.cube.getSize()
    });
    if (!solid) {
      this.model = null;
      return null;
    }
    const display = displayOverride || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
    this.model = {
      solid,
      display,
      cut: {
        showCutSurface: display.showCutSurface,
        intersections: [],
        cutSegments: [],
        facePolygons: [],
        faceAdjacency: []
      },
      net: {
        faces: [],
        animation: this.createDefaultNetState(),
        visible: false
      }
    };
    this.edgeMap = new Map(solid.edges.map(edge => [edge.id, edge]));
    this.vertexMap = new Map(solid.vertices.map(vertex => [vertex.id, vertex]));
    this.cutIntersections = [];
    this.cutSegments = [];
    this.cutFacePolygons = [];
    this.cutFaceAdjacency = [];
    this.netFaces = [];
    this.netState = this.createDefaultNetState();
    this.netVisible = false;
    return this.model;
  }

  syncFromCube() {
    const display = this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY;
    return this.build(display);
  }

  setDisplay(display: DisplayState) {
    if (!this.model) {
      this.build(display);
      return;
    }
    this.model.display = { ...display };
    this.ensureCutModel();
    if (this.model.cut) {
      this.model.cut.showCutSurface = display.showCutSurface;
    }
  }

  applyDisplayToView(displayOverride?: DisplayState) {
    const display = displayOverride
      || (this.model ? this.model.display : null)
      || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
    this.cube.toggleVertexLabels(display.showVertexLabels);
    this.cube.toggleFaceLabels(display.showFaceLabels);
    if (this.selection) {
      this.selection.toggleVertexLabels(display.showVertexLabels);
      this.selection.setEdgeLabelMode(display.edgeLabelMode);
    }
    this.cube.setEdgeLabelMode(display.edgeLabelMode);
    this.cube.toggleTransparency(display.cubeTransparent);
  }

  getDisplayState() {
    return (this.model ? this.model.display : null)
      || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
  }

  applyTransparencyToView(displayOverride?: DisplayState) {
    const display = displayOverride
      || (this.model ? this.model.display : null)
      || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
    this.cube.toggleTransparency(display.cubeTransparent);
  }

  applyCutDisplayToView({ cutter }: { cutter: { toggleSurface: (visible: boolean) => void; togglePyramid: (visible: boolean) => void; setCutPointsVisible: (visible: boolean) => void; setCutLineColorize: (enabled: boolean) => void } }) {
    const display = this.model ? this.model.display : null;
    if (!display) return;
    const showCutSurface = this.model && this.model.cut ? this.model.cut.showCutSurface : display.showCutSurface;
    cutter.toggleSurface(showCutSurface);
    cutter.togglePyramid(display.showPyramid);
    cutter.setCutPointsVisible(display.showCutPoints);
    cutter.setCutLineColorize(display.colorizeCutLines);
  }

  resetCutFlags() {
    if (!this.model) return;
    this.model.solid.vertices.forEach(vertex => {
      vertex.flags.isCutPoint = false;
    });
    this.model.solid.edges.forEach(edge => {
      edge.flags.hasCutPoint = false;
      edge.flags.isMidpointCut = false;
      edge.flags.isCutEdge = false;
    });
  }

  applyCutIntersections(intersections: IntersectionPoint[]) {
    if (!this.model) return;
    this.resetCutFlags();
    const normalized = Array.isArray(intersections)
      ? intersections
          .map(ref => {
            if (!ref || !ref.id) return null;
            return {
              id: ref.id,
              type: ref.type,
              edgeId: ref.edgeId,
              ratio: ref.ratio ? { ...ref.ratio } : undefined,
              faceIds: Array.isArray(ref.faceIds) ? [...ref.faceIds] : undefined
            };
          })
          .filter(Boolean)
      : [];
    this.cutIntersections = normalized;
    this.ensureCutModel();
    if (this.model && this.model.cut) {
      this.model.cut.intersections = this.cutIntersections.slice();
    }
    const vertexMap = this.vertexMap || new Map(this.model.solid.vertices.map(vertex => [vertex.id, vertex]));
    const edgeMap = this.edgeMap || new Map(this.model.solid.edges.map(edge => [edge.id, edge]));

    this.cutIntersections.forEach(ref => {
      const parsed = ref && ref.id ? normalizeSnapPointId(parseSnapPointId(ref.id)) : null;
      if (!parsed) return;

      if (parsed.type === 'vertex') {
        const vertexId = `V:${parsed.vertexIndex}`;
        const vertex = vertexMap.get(vertexId);
        if (vertex) vertex.flags.isCutPoint = true;
        edgeMap.forEach(edge => {
          if (edge.vertices.some(v => v.id === vertexId)) {
            edge.flags.hasCutPoint = true;
            edge.flags.isCutEdge = true;
          }
        });
        return;
      }

      if (parsed.type === 'edge') {
        const edgeId = `E:${parsed.edgeIndex}`;
        const edge = edgeMap.get(edgeId);
        if (edge) {
          edge.flags.hasCutPoint = true;
          edge.flags.isCutEdge = true;
          const ratio = parsed.ratio;
          if (ratio && ratio.denominator) {
            const isMidpoint = ratio.numerator * 2 === ratio.denominator;
            edge.flags.isMidpointCut = isMidpoint;
            if (ratio.numerator === 0 || ratio.numerator === ratio.denominator) {
              const vertexId = ratio.numerator === 0 ? edge.vertices[0].id : edge.vertices[1].id;
              const vertex = vertexMap.get(vertexId);
              if (vertex) vertex.flags.isCutPoint = true;
            }
          }
        }
      }
    });
  }

  getEdgeHighlightColor(edgeId: string, fallback = 0x444444) {
    if (!this.model) return fallback;
    const edgeMap = this.edgeMap || new Map(this.model.solid.edges.map(edge => [edge.id, edge]));
    const edge = edgeMap.get(edgeId);
    if (!edge || !edge.flags.hasCutPoint) return fallback;
    return edge.flags.isMidpointCut ? 0x00cc66 : 0xff8800;
  }

  clearCutIntersections() {
    this.cutIntersections = [];
    this.resetCutFlags();
    this.cutSegments = [];
    this.cutFacePolygons = [];
    this.cutFaceAdjacency = [];
    if (this.model && this.model.cut) {
      this.model.cut.intersections = [];
      this.model.cut.cutSegments = [];
      this.model.cut.facePolygons = [];
      this.model.cut.faceAdjacency = [];
    }
  }

  getCutIntersections() {
    return this.cutIntersections.slice();
  }

  resolveCutIntersectionPositions() {
    return this.cutIntersections
      .map(ref => {
        if (!ref || !ref.id) return null;
        const position = this.resolver.resolveSnapPoint(ref.id);
        if (!position) return null;
        return { ...ref, position };
      })
      .filter((ref): ref is IntersectionPoint & { position: THREE.Vector3 } => !!ref);
  }

  getModel() {
    return this.model;
  }

  createDefaultNetState(): ObjectNetState {
    return {
      state: 'closed',
      progress: 0,
      duration: 0,
      faceDuration: 0,
      stagger: 0,
      scale: 1,
      scaleTarget: 1,
      startAt: 0,
      preScaleDelay: 0,
      postScaleDelay: 0,
      camera: {
        startPos: null,
        startTarget: null,
        endPos: null,
        endTarget: null
      }
    };
  }

  ensureNetModel() {
    if (!this.model) return;
    if (!this.model.net) {
      this.model.net = {
        faces: [],
        animation: this.createDefaultNetState(),
        visible: false
      };
      return;
    }
    if (!this.model.net.faces) this.model.net.faces = [];
    if (!this.model.net.animation) this.model.net.animation = this.createDefaultNetState();
    if (typeof this.model.net.visible !== 'boolean') this.model.net.visible = false;
  }

  ensureCutModel() {
    if (!this.model) return;
    if (!this.model.cut) {
      this.model.cut = {
        showCutSurface: this.model.display.showCutSurface,
        intersections: [],
        cutSegments: [],
        facePolygons: [],
        faceAdjacency: []
      };
      return;
    }
    if (!this.model.cut.intersections) this.model.cut.intersections = [];
    if (!this.model.cut.cutSegments) this.model.cut.cutSegments = [];
    if (!this.model.cut.facePolygons) this.model.cut.facePolygons = [];
    if (!this.model.cut.faceAdjacency) this.model.cut.faceAdjacency = [];
  }

  setCutSegments(segments: ObjectCutSegment[]) {
    this.ensureCutModel();
    this.cutSegments = Array.isArray(segments)
      ? segments
          .map(seg => {
            if (!seg || !seg.startId || !seg.endId) return null;
            return {
              startId: seg.startId,
              endId: seg.endId,
              faceIds: Array.isArray(seg.faceIds) ? [...seg.faceIds] : undefined
            };
          })
          .filter(Boolean)
      : [];
    if (this.model && this.model.cut) {
      this.model.cut.cutSegments = this.cutSegments.slice();
    }
  }

  setCutFacePolygons(polygons: CutFacePolygon[], adjacency: ObjectCutAdjacency[] = []) {
    this.ensureCutModel();
    this.cutFacePolygons = Array.isArray(polygons) ? polygons.slice() : [];
    this.cutFaceAdjacency = Array.isArray(adjacency)
      ? adjacency
          .map(entry => {
            if (!entry || !entry.a || !entry.b) return null;
            return { a: entry.a, b: entry.b };
          })
          .filter(Boolean)
      : [];
    if (this.model && this.model.cut) {
      this.model.cut.facePolygons = this.cutFacePolygons.slice();
      this.model.cut.faceAdjacency = this.cutFaceAdjacency.slice();
    }
  }

  syncCutState({
    intersections,
    cutSegments,
    facePolygons,
    faceAdjacency
  }: {
    intersections?: IntersectionPoint[];
    cutSegments?: ObjectCutSegment[];
    facePolygons?: CutFacePolygon[];
    faceAdjacency?: ObjectCutAdjacency[];
  }) {
    if (!this.model) this.build();
    if (intersections) {
      this.applyCutIntersections(intersections);
    } else {
      this.applyCutIntersections([]);
    }
    if (cutSegments) {
      this.setCutSegments(cutSegments);
    } else {
      this.setCutSegments([]);
    }
    if (facePolygons || faceAdjacency) {
      this.setCutFacePolygons(facePolygons || [], faceAdjacency || []);
    } else {
      this.setCutFacePolygons([], []);
    }
  }

  getCutSegments() {
    return this.cutSegments.slice();
  }

  getCutFacePolygons() {
    return this.cutFacePolygons.slice();
  }

  getCutFaceAdjacency() {
    return this.cutFaceAdjacency.slice();
  }

  syncNetState({
    faces,
    animation,
    visible
  }: {
    faces?: ObjectNetFace[];
    animation?: Partial<ObjectNetState>;
    visible?: boolean;
  }) {
    if (!this.model) this.build();
    this.ensureNetModel();
    if (faces) {
      this.netFaces = faces.slice();
      if (this.model && this.model.net) {
        this.model.net.faces = this.netFaces.slice();
      }
    }
    if (animation) {
      this.netState = { ...this.netState, ...animation };
      if (this.model && this.model.net) {
        this.model.net.animation = { ...this.netState };
      }
    }
    if (typeof visible === 'boolean') {
      this.netVisible = visible;
      if (this.model && this.model.net) {
        this.model.net.visible = visible;
      }
    }
  }

  getNetState() {
    return this.netState;
  }

  getNetFaces() {
    return this.netFaces.slice();
  }

  getNetVisible() {
    return this.netVisible;
  }

  setNetVisible(visible: boolean) {
    this.ensureNetModel();
    this.netVisible = !!visible;
    if (this.model && this.model.net) {
      this.model.net.visible = this.netVisible;
    }
  }
}
