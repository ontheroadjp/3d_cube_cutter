import type { CutFacePolygon, SnapPointID } from '../types.js';

type Adjacency = {
  a: string;
  b: string;
  sharedEdgeIds?: [SnapPointID, SnapPointID];
};

export const buildFaceAdjacency = (polygons: CutFacePolygon[]): Adjacency[] => {
  const edgeMap = new Map<string, { faceId: string; edgeIds?: [SnapPointID, SnapPointID] }>();
  const adjacency: Adjacency[] = [];

  polygons.forEach(polygon => {
    const faceId = polygon.faceId;
    const vertexIds = Array.isArray(polygon.vertexIds) ? polygon.vertexIds : [];
    if (!faceId || vertexIds.length < 2) return;
    for (let i = 0; i < vertexIds.length; i++) {
      const startId = vertexIds[i];
      const endId = vertexIds[(i + 1) % vertexIds.length];
      if (!startId || !endId) continue;
      const edgeKey = startId < endId ? `${startId}|${endId}` : `${endId}|${startId}`;
      const existing = edgeMap.get(edgeKey);
      if (!existing) {
        edgeMap.set(edgeKey, {
          faceId,
          edgeIds: startId && endId ? [startId, endId] : undefined,
        });
        continue;
      }
      if (existing.faceId !== faceId) {
        adjacency.push({
          a: existing.faceId,
          b: faceId,
          sharedEdgeIds: existing.edgeIds
        });
      }
    }
  });

  return adjacency;
};
