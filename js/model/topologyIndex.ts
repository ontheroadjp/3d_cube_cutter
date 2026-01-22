import type { EdgeID, FaceID, SolidSSOT, TopologyIndex, VertexID } from './objectModel.js';

const ensureArray = <T>(record: Record<string, T[]>, key: string) => {
  if (!record[key]) record[key] = [] as T[];
  return record[key];
};

export const buildTopologyIndex = (ssot: SolidSSOT): TopologyIndex => {
  const vertexToEdges: Record<VertexID, EdgeID[]> = {};
  const vertexToFaces: Record<VertexID, FaceID[]> = {};
  const edgeToFaces: Record<EdgeID, FaceID[]> = {};
  const faceAdjacencySets: Record<FaceID, Set<FaceID>> = {};

  Object.values(ssot.vertices).forEach(vertex => {
    vertexToEdges[vertex.id] = [];
    vertexToFaces[vertex.id] = [];
  });

  Object.values(ssot.edges).forEach(edge => {
    edgeToFaces[edge.id] = [];
    ensureArray(vertexToEdges, edge.v0).push(edge.id);
    ensureArray(vertexToEdges, edge.v1).push(edge.id);
  });

  const edgeKeyToId = new Map<string, EdgeID>();
  Object.values(ssot.edges).forEach(edge => {
    edgeKeyToId.set(`${edge.v0}|${edge.v1}`, edge.id);
    edgeKeyToId.set(`${edge.v1}|${edge.v0}`, edge.id);
  });

  Object.values(ssot.faces).forEach(face => {
    faceAdjacencySets[face.id] = new Set();
    face.vertices.forEach(vertexId => {
      ensureArray(vertexToFaces, vertexId).push(face.id);
    });

    for (let i = 0; i < face.vertices.length; i++) {
      const v0 = face.vertices[i];
      const v1 = face.vertices[(i + 1) % face.vertices.length];
      const edgeId = edgeKeyToId.get(`${v0}|${v1}`);
      if (!edgeId) continue;
      ensureArray(edgeToFaces, edgeId).push(face.id);
    }
  });

  Object.values(edgeToFaces).forEach(faceIds => {
    const uniqueFaces = Array.from(new Set(faceIds));
    for (let i = 0; i < uniqueFaces.length; i++) {
      for (let j = i + 1; j < uniqueFaces.length; j++) {
        const a = uniqueFaces[i];
        const b = uniqueFaces[j];
        if (!faceAdjacencySets[a]) faceAdjacencySets[a] = new Set();
        if (!faceAdjacencySets[b]) faceAdjacencySets[b] = new Set();
        faceAdjacencySets[a].add(b);
        faceAdjacencySets[b].add(a);
      }
    }
  });

  const faceAdjacency: Record<FaceID, FaceID[]> = {};
  Object.keys(faceAdjacencySets).forEach(faceId => {
    faceAdjacency[faceId] = Array.from(faceAdjacencySets[faceId]);
  });

  Object.keys(vertexToEdges).forEach(vertexId => {
    vertexToEdges[vertexId] = Array.from(new Set(vertexToEdges[vertexId]));
  });
  Object.keys(vertexToFaces).forEach(vertexId => {
    vertexToFaces[vertexId] = Array.from(new Set(vertexToFaces[vertexId]));
  });
  Object.keys(edgeToFaces).forEach(edgeId => {
    edgeToFaces[edgeId] = Array.from(new Set(edgeToFaces[edgeId]));
  });

  return {
    vertexToEdges,
    vertexToFaces,
    edgeToFaces,
    faceAdjacency
  };
};
