import type { GeometryResolver } from '../geometry/GeometryResolver.js';
import type { Edge as StructureEdge, Face as StructureFace, Vertex as StructureVertex } from '../structure/structureModel.js';
import {
  createDefaultEdgeFlags,
  createDefaultFaceFlags,
  createDefaultVertexFlags,
  type ObjectEdge,
  type ObjectFace,
  type ObjectSolid,
  type ObjectVertex
} from './objectModel.js';

const buildVertex = (vertex: StructureVertex): ObjectVertex => {
  return {
    id: vertex.id,
    index: vertex.index,
    label: vertex.label || null,
    flags: createDefaultVertexFlags()
  };
};

const buildEdge = (
  edge: StructureEdge,
  vertexMap: Map<string, ObjectVertex>
): ObjectEdge | null => {
  const v1 = vertexMap.get(edge.vertices[0]);
  const v2 = vertexMap.get(edge.vertices[1]);
  if (!v1 || !v2) return null;
  return {
    id: edge.id,
    vertices: [v1, v2],
    faces: edge.faces.slice(),
    flags: createDefaultEdgeFlags()
  };
};

const buildFace = (
  face: StructureFace,
  vertexMap: Map<string, ObjectVertex>,
  edgeMap: Map<string, ObjectEdge>
): ObjectFace | null => {
  const vertices = face.vertices
    .map(id => vertexMap.get(id))
    .filter((vertex): vertex is ObjectVertex => !!vertex);
  const edges = face.edges
    .map(id => edgeMap.get(id))
    .filter((edge): edge is ObjectEdge => !!edge);
  if (vertices.length !== face.vertices.length) return null;
  return {
    id: face.id,
    vertices,
    edges,
    flags: createDefaultFaceFlags(),
    polygons: []
  };
};

export const buildObjectSolidModel = ({
  structure,
  resolver,
  size,
  solidId = 'solid:primary'
}: {
  structure: {
    vertices: StructureVertex[];
    edges: StructureEdge[];
    faces: StructureFace[];
  } | null;
  resolver: GeometryResolver | null;
  size: { lx: number; ly: number; lz: number };
  solidId?: string;
}): ObjectSolid | null => {
  if (!structure || !resolver) return null;
  const vertices = structure.vertices
    .map(vertex => buildVertex(vertex));
  if (!vertices.length) return null;

  const vertexMap = new Map(vertices.map(vertex => [vertex.id, vertex]));
  const edges = structure.edges
    .map(edge => buildEdge(edge, vertexMap))
    .filter((edge): edge is ObjectEdge => !!edge);
  const edgeMap = new Map(edges.map(edge => [edge.id, edge]));
  const faces = structure.faces
    .map(face => buildFace(face, vertexMap, edgeMap))
    .filter((face): face is ObjectFace => !!face);

  return {
    id: solidId,
    vertices,
    edges,
    faces,
    meta: { size }
  };
};
