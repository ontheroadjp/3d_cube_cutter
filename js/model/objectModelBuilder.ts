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

// Derived geometry fields are resolved through GeometryResolver.
const buildVertex = (vertex: StructureVertex, resolver: GeometryResolver): ObjectVertex | null => {
  const position = resolver.resolveVertex(vertex.id);
  if (!position) return null;
  return {
    id: vertex.id,
    index: vertex.index,
    label: vertex.label || null,
    position,
    flags: createDefaultVertexFlags()
  };
};

const buildEdge = (
  edge: StructureEdge,
  vertexMap: Map<string, ObjectVertex>,
  resolver: GeometryResolver
): ObjectEdge | null => {
  const v1 = vertexMap.get(edge.vertices[0]);
  const v2 = vertexMap.get(edge.vertices[1]);
  if (!v1 || !v2) return null;
  const resolved = resolver.resolveEdge(edge.id);
  if (!resolved) return null;
  return {
    id: edge.id,
    vertices: [v1, v2],
    faces: edge.faces.slice(),
    length: resolved.length,
    flags: createDefaultEdgeFlags()
  };
};

const buildFace = (
  face: StructureFace,
  vertexMap: Map<string, ObjectVertex>,
  edgeMap: Map<string, ObjectEdge>,
  resolver: GeometryResolver
): ObjectFace | null => {
  const resolved = resolver.resolveFace(face.id);
  if (!resolved) return null;
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
    normal: resolved.normal.clone(),
    uvBasis: {
      origin: resolved.vertices[0].clone(),
      u: resolved.basisU.clone(),
      v: resolved.basisV.clone()
    },
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
    .map(vertex => buildVertex(vertex, resolver))
    .filter((vertex): vertex is ObjectVertex => !!vertex);
  if (!vertices.length) return null;

  const vertexMap = new Map(vertices.map(vertex => [vertex.id, vertex]));
  const edges = structure.edges
    .map(edge => buildEdge(edge, vertexMap, resolver))
    .filter((edge): edge is ObjectEdge => !!edge);
  const edgeMap = new Map(edges.map(edge => [edge.id, edge]));
  const faces = structure.faces
    .map(face => buildFace(face, vertexMap, edgeMap, resolver))
    .filter((face): face is ObjectFace => !!face);

  return {
    id: solidId,
    vertices,
    edges,
    faces,
    meta: { size }
  };
};
