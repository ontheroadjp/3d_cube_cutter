import type { Edge as StructureEdge, Face as StructureFace, Vertex as StructureVertex } from '../structure/structureModel.js';
import {
  createDefaultEdgePresentation,
  createDefaultFacePresentation,
  createDefaultVertexPresentation,
  type EdgeSSOT,
  type FaceSSOT,
  type SolidSSOT,
  type PresentationModel,
  type VertexSSOT,
  type EdgePresentation,
  type FacePresentation,
  type VertexPresentation,
  type VertexID,
  type EdgeID,
  type FaceID
} from './objectModel.js';
import type { DisplayState } from '../types.js';

// Internal builders for SSOT
const buildVertexSSOT = (vertex: StructureVertex): VertexSSOT => {
  return {
    id: vertex.id
  };
};

const buildEdgeSSOT = (edge: StructureEdge): EdgeSSOT => {
  return {
    id: edge.id,
    v0: edge.vertices[0],
    v1: edge.vertices[1]
  };
};

const buildFaceSSOT = (face: StructureFace): FaceSSOT => {
  return {
    id: face.id,
    vertices: [...face.vertices]
  };
};

// Internal builders for Presentation
const buildVertexPresentation = (vertex: StructureVertex): VertexPresentation => {
  return {
    ...createDefaultVertexPresentation(),
    label: vertex.label || null
  };
};

export const buildObjectModelData = ({
  structure,
  size,
  display,
  solidId = 'solid:primary'
}: {
  structure: {
    vertices: StructureVertex[];
    edges: StructureEdge[];
    faces: StructureFace[];
  } | null;
  size: { lx: number; ly: number; lz: number };
  display: DisplayState;
  solidId?: string;
}): { ssot: SolidSSOT; presentation: PresentationModel } | null => {
  if (!structure) return null;

  // SSOT Construction
  const ssotVertices: Record<VertexID, VertexSSOT> = {};
  const ssotEdges: Record<EdgeID, EdgeSSOT> = {};
  const ssotFaces: Record<FaceID, FaceSSOT> = {};

  // Presentation Construction
  const presVertices: Record<VertexID, VertexPresentation> = {};
  const presEdges: Record<EdgeID, EdgePresentation> = {};
  const presFaces: Record<FaceID, FacePresentation> = {};

  // Process Vertices
  structure.vertices.forEach(v => {
    ssotVertices[v.id] = buildVertexSSOT(v);
    presVertices[v.id] = buildVertexPresentation(v);
  });

  // Process Edges
  structure.edges.forEach(e => {
    ssotEdges[e.id] = buildEdgeSSOT(e);
    presEdges[e.id] = createDefaultEdgePresentation();
  });

  // Process Faces
  structure.faces.forEach(f => {
    ssotFaces[f.id] = buildFaceSSOT(f);
    presFaces[f.id] = createDefaultFacePresentation();
  });

  const ssot: SolidSSOT = {
    id: solidId,
    vertices: ssotVertices,
    edges: ssotEdges,
    faces: ssotFaces,
    meta: { size }
  };

  const presentation: PresentationModel = {
    display,
    vertices: presVertices,
    edges: presEdges,
    faces: presFaces
  };

  return { ssot, presentation };
};