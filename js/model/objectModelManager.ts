import type { CutFacePolygon, DisplayState, IntersectionPoint, SnapPointID } from '../types.js';
import * as THREE from 'three';
import type { Cube } from '../Cube.js';
import type { GeometryResolver } from '../geometry/GeometryResolver.js';
import type { UIManager } from '../UIManager.js';

type SelectionLike = {
  toggleVertexLabels: (visible: boolean) => void;
  setEdgeLabelMode: (mode: DisplayState['edgeLabelMode']) => void;
};
import {
  type ObjectCutAdjacency,
  type ObjectCutSegment,
  type ObjectModel,
  type ObjectNetFace,
  type ObjectNetState,
  type VertexID,
  type EdgeID,
  type FaceID,
  type VertexSSOT,
  type EdgeSSOT,
  type FaceSSOT,
  type VertexPresentation,
  type EdgePresentation,
  type FacePresentation,
  createDefaultFacePresentation,
  createDefaultVertexPresentation,
  createDefaultEdgePresentation,
  createDefaultNetDerived
} from './objectModel.js';
import { buildObjectModelData } from './objectModelBuilder.js';
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

// Helper to create default empty cut derived
const createDefaultCutDerived = () => ({
  showCutSurface: true,
  intersections: [],
  cutSegments: [],
  facePolygons: [],
  faceAdjacency: []
});


export type EngineEvent =
  | { type: "SSOT_UPDATED"; payload?: ObjectModel }
  | { type: "DERIVED_UPDATED"; payload?: any }
  | { type: "CUT_RESULT_UPDATED"; payload?: any }
  | { type: "NET_DERIVED_UPDATED"; payload?: any }
  | { type: "ERROR"; message: string };

type Listener = (event: EngineEvent) => void;

export class ObjectModelManager {
  cube: Cube;
  resolver: GeometryResolver;
  ui: UIManager | null;
  selection: SelectionLike | null;
  model: ObjectModel | null;
  
  // Local caches are removed in favor of model.derived
  
  private listeners: Listener[] = [];

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
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(event: EngineEvent) {
    this.listeners.forEach(l => l(event));
  }

  build(displayOverride?: DisplayState) {
    const structure = this.cube.getStructure();
    const display = displayOverride || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
    
    const built = buildObjectModelData({
      structure,
      size: this.cube.getSize(),
      display
    });

    if (!built) {
      this.model = null;
      this.notify({ type: "ERROR", message: "Failed to build solid model" });
      return null;
    }

    this.model = {
      ssot: built.ssot,
      presentation: built.presentation,
      derived: {
        cut: createDefaultCutDerived(),
        net: createDefaultNetDerived()
      }
    };
    
    // Sync cut surface visibility
    if (this.model.derived.cut) {
        this.model.derived.cut.showCutSurface = display.showCutSurface;
    }

    this.notify({ type: "SSOT_UPDATED", payload: this.model });
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
    // Update Presentation
    this.model.presentation.display = { ...display };
    
    // Update Derived (if relevant)
    if (this.model.derived.cut) {
      this.model.derived.cut.showCutSurface = display.showCutSurface;
    }
    
    this.notify({ type: "SSOT_UPDATED", payload: this.model });
  }

  applyDisplayToView(displayOverride?: DisplayState) {
    const display = displayOverride
      || (this.model ? this.model.presentation.display : null)
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
    return (this.model ? this.model.presentation.display : null)
      || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
  }

  applyTransparencyToView(displayOverride?: DisplayState) {
    const display = displayOverride
      || (this.model ? this.model.presentation.display : null)
      || (this.ui ? this.ui.getDisplayState() : DEFAULT_DISPLAY);
    this.cube.toggleTransparency(display.cubeTransparent);
  }

  applyCutDisplayToView({ cutter }: { cutter: { toggleSurface: (visible: boolean) => void; togglePyramid: (visible: boolean) => void; setCutPointsVisible: (visible: boolean) => void; setCutLineColorize: (enabled: boolean) => void } }) {
    const display = this.model ? this.model.presentation.display : null;
    if (!display) return;
    
    const showCutSurface = this.model && this.model.derived.cut ? this.model.derived.cut.showCutSurface : display.showCutSurface;
    cutter.toggleSurface(showCutSurface);
    cutter.togglePyramid(display.showPyramid);
    cutter.setCutPointsVisible(display.showCutPoints);
    cutter.setCutLineColorize(display.colorizeCutLines);
  }

  resetCutFlags() {
    if (!this.model) return;
    const { vertices, edges } = this.model.presentation;
    
    Object.values(vertices).forEach(v => {
      v.isCutPoint = false;
    });
    Object.values(edges).forEach(e => {
      e.hasCutPoint = false;
      e.isMidpointCut = false;
      e.isCutEdge = false;
    });
  }

  applyCutIntersections(intersections: IntersectionPoint[]) {
    if (!this.model) return;
    this.resetCutFlags();
    
    const normalized = Array.isArray(intersections)
      ? intersections
          .map(ref => {
            if (!ref || !ref.id) return null;
            return { ...ref }; // Simple clone
          })
          .filter(Boolean)
      : [];
      
    // Update Derived
    if (!this.model.derived.cut) this.model.derived.cut = createDefaultCutDerived();
    this.model.derived.cut.intersections = normalized as IntersectionPoint[];
    
    // Update Presentation based on Intersections
    const { vertices: presVertices, edges: presEdges } = this.model.presentation;
    const { vertices: ssotVertices, edges: ssotEdges } = this.model.ssot;
    
    normalized.forEach(ref => {
      if (!ref) return;
      const parsed = normalizeSnapPointId(parseSnapPointId(ref.id));
      if (!parsed) return;

      if (parsed.type === 'vertex') {
        const vertexId = `V:${parsed.vertexIndex}`;
        const presV = presVertices[vertexId];
        if (presV) presV.isCutPoint = true;
        
        // Find edges connected to this vertex
        Object.values(ssotEdges).forEach(edge => {
          if (edge.v0 === vertexId || edge.v1 === vertexId) {
             const presE = presEdges[edge.id];
             if (presE) {
                 presE.hasCutPoint = true;
                 presE.isCutEdge = true;
             }
          }
        });
        return;
      }

      if (parsed.type === 'edge') {
        const edgeId = `E:${parsed.edgeIndex}`;
        const presE = presEdges[edgeId];
        const ssotE = ssotEdges[edgeId];
        
        if (presE) {
          presE.hasCutPoint = true;
          presE.isCutEdge = true;
          const ratio = parsed.ratio;
          if (ratio && ratio.denominator) {
            const isMidpoint = ratio.numerator * 2 === ratio.denominator;
            presE.isMidpointCut = isMidpoint;
            
            // If cut is at vertex (0/n or n/n)
            if (ratio.numerator === 0 || ratio.numerator === ratio.denominator) {
              const vertexId = ratio.numerator === 0 ? ssotE.v0 : ssotE.v1;
              const presV = presVertices[vertexId];
              if (presV) presV.isCutPoint = true;
            }
          }
        }
      }
    });
  }

  getEdgeHighlightColor(edgeId: string, fallback = 0x444444) {
    if (!this.model) return fallback;
    const edge = this.model.presentation.edges[edgeId];
    if (!edge || !edge.hasCutPoint) return fallback;
    return edge.isMidpointCut ? 0x00cc66 : 0xff8800;
  }

  clearCutIntersections() {
    this.resetCutFlags();
    if (this.model) {
      // Re-initialize derived.cut
      this.model.derived.cut = createDefaultCutDerived();
      // Restore showCutSurface setting
      if (this.model.presentation.display) {
          this.model.derived.cut.showCutSurface = this.model.presentation.display.showCutSurface;
      }
    }
  }

  getCutIntersections() {
    return this.model?.derived.cut?.intersections.slice() || [];
  }

  resolveCutIntersectionPositions() {
    const intersections = this.getCutIntersections();
    return intersections
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
  
  // Helpers to ensure derived objects exist
  private ensureCutDerived() {
      if (this.model && !this.model.derived.cut) {
          this.model.derived.cut = createDefaultCutDerived();
      }
  }
  
  private ensureNetDerived() {
      if (this.model && !this.model.derived.net) {
          this.model.derived.net = createDefaultNetDerived();
      }
  }

  setCutSegments(segments: ObjectCutSegment[]) {
    this.ensureCutDerived();
    const normalized = Array.isArray(segments)
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
      
    if (this.model && this.model.derived.cut) {
      this.model.derived.cut.cutSegments = normalized as ObjectCutSegment[];
    }
  }

  setCutFacePolygons(polygons: CutFacePolygon[], adjacency: ObjectCutAdjacency[] = []) {
    this.ensureCutDerived();
    if (this.model && this.model.derived.cut) {
        this.model.derived.cut.facePolygons = Array.isArray(polygons) ? polygons.slice() : [];
        this.model.derived.cut.faceAdjacency = Array.isArray(adjacency)
            ? adjacency.map(e => ({...e})).filter(Boolean) as ObjectCutAdjacency[]
            : [];
    }
  }

  private updateSolidFromCutResult() {
    if (!this.model || !this.model.derived.cut) return;
    const { facePolygons } = this.model.derived.cut;
    if (!facePolygons || facePolygons.length === 0) return;

    const newVertices: Record<VertexID, VertexSSOT> = {};
    const newEdges: Record<EdgeID, EdgeSSOT> = {};
    const newFaces: Record<FaceID, FaceSSOT> = {};
    const newPresVertices: Record<VertexID, VertexPresentation> = {};
    const newPresEdges: Record<EdgeID, EdgePresentation> = {};
    const newPresFaces: Record<FaceID, FacePresentation> = {};

    facePolygons.forEach(poly => {
      const faceId = poly.faceId;
      const vertexIds = poly.vertexIds || [];
      newFaces[faceId] = { id: faceId, vertices: vertexIds };
      
      const presFace = createDefaultFacePresentation();
      if (poly.type === 'cut') presFace.isCutFace = true;
      newPresFaces[faceId] = presFace;

      vertexIds.forEach((vId, i) => {
        if (!newVertices[vId]) {
          newVertices[vId] = { id: vId };
          newPresVertices[vId] = this.model!.presentation.vertices[vId] || createDefaultVertexPresentation();
        }

        const nextVId = vertexIds[(i + 1) % vertexIds.length];
        const sortedIds = [vId, nextVId].sort();
        const edgeId = `E:${sortedIds[0]}-${sortedIds[1]}`;
        
        if (!newEdges[edgeId]) {
          newEdges[edgeId] = { id: edgeId, v0: sortedIds[0], v1: sortedIds[1] };
          newPresEdges[edgeId] = this.model!.presentation.edges[edgeId] || createDefaultEdgePresentation();
        }
      });
    });

    this.model.ssot.faces = newFaces;
    this.model.ssot.edges = newEdges;
    this.model.ssot.vertices = newVertices;
    
    this.model.presentation.faces = newPresFaces;
    this.model.presentation.edges = newPresEdges;
    this.model.presentation.vertices = newPresVertices;
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

    this.updateSolidFromCutResult();
    
    this.notify({ type: "CUT_RESULT_UPDATED", payload: { intersections, cutSegments, facePolygons } });
  }

  getCutSegments() {
    return this.model?.derived.cut?.cutSegments.slice() || [];
  }

  getCutFacePolygons() {
    return this.model?.derived.cut?.facePolygons.slice() || [];
  }

  getCutFaceAdjacency() {
    return this.model?.derived.cut?.faceAdjacency.slice() || [];
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
    this.ensureNetDerived();
    const net = this.model!.derived.net!; // ensureNetDerived ensures this is not null/undefined if model exists
    
    if (faces) {
      net.faces = faces.slice();
    }
    if (animation) {
      net.animation = { ...net.animation, ...animation };
    }
    if (typeof visible === 'boolean') {
      net.visible = visible;
    }
    this.notify({ type: "NET_DERIVED_UPDATED", payload: { faces, animation, visible } });
  }

  getNetState() {
    return this.model?.derived.net?.animation || createDefaultNetDerived().animation; // Fallback if no model
  }

  getNetFaces() {
    return this.model?.derived.net?.faces.slice() || [];
  }

  getNetVisible() {
    return this.model?.derived.net?.visible || false;
  }

  setNetVisible(visible: boolean) {
    this.ensureNetDerived();
    if (this.model && this.model.derived.net) {
      this.model.derived.net.visible = !!visible;
    }
  }
}