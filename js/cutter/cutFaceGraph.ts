import * as THREE from 'three';
import type { CutFacePolygon, SnapPointID } from '../types.js';

type Adjacency = {
  a: string;
  b: string;
  sharedEdgeIds?: [SnapPointID, SnapPointID];
};

const defaultEpsilon = 1e-3;

const makeKey = (value: number, epsilon: number) => Math.round(value / epsilon).toString(10);

const makeVertexKey = (v: THREE.Vector3, epsilon: number) =>
  `${makeKey(v.x, epsilon)}|${makeKey(v.y, epsilon)}|${makeKey(v.z, epsilon)}`;

export const buildFaceAdjacency = (polygons: CutFacePolygon[], epsilon = defaultEpsilon): Adjacency[] => {
  const edgeMap = new Map<string, { faceId: string; edgeIds?: [SnapPointID, SnapPointID]; edge?: [THREE.Vector3, THREE.Vector3] }>();
  const adjacency: Adjacency[] = [];

  polygons.forEach(polygon => {
    const faceId = polygon.faceId;
    const vertexIds = Array.isArray(polygon.vertexIds) ? polygon.vertexIds : [];
    const vertices = (polygon.vertices || []) as THREE.Vector3[];
    if (!faceId || (vertexIds.length < 2 && vertices.length < 2)) return;
    const total = vertexIds.length || vertices.length;
    for (let i = 0; i < total; i++) {
      const startId = vertexIds.length ? vertexIds[i] : null;
      const endId = vertexIds.length ? vertexIds[(i + 1) % vertexIds.length] : null;
      const start = vertexIds.length ? null : vertices[i];
      const end = vertexIds.length ? null : vertices[(i + 1) % vertices.length];
      if (!startId && (!(start instanceof THREE.Vector3) || !(end instanceof THREE.Vector3))) continue;
      const startKey = startId ? startId : makeVertexKey(start, epsilon);
      const endKey = endId ? endId : makeVertexKey(end, epsilon);
      const edgeKey = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
      const existing = edgeMap.get(edgeKey);
      if (!existing) {
        edgeMap.set(edgeKey, {
          faceId,
          edgeIds: startId && endId ? [startId, endId] : undefined,
          edge: start && end ? [start.clone(), end.clone()] : undefined
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
