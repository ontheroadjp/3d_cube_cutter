import * as THREE from 'three';
import type { CutFacePolygon } from '../types.js';

type Adjacency = {
  a: string;
  b: string;
  sharedEdge: [THREE.Vector3, THREE.Vector3];
};

const defaultEpsilon = 1e-3;

const makeKey = (value: number, epsilon: number) => Math.round(value / epsilon).toString(10);

const makeVertexKey = (v: THREE.Vector3, epsilon: number) =>
  `${makeKey(v.x, epsilon)}|${makeKey(v.y, epsilon)}|${makeKey(v.z, epsilon)}`;

export const buildFaceAdjacency = (polygons: CutFacePolygon[], epsilon = defaultEpsilon): Adjacency[] => {
  const edgeMap = new Map<string, { faceId: string; edge: [THREE.Vector3, THREE.Vector3] }>();
  const adjacency: Adjacency[] = [];

  polygons.forEach(polygon => {
    const faceId = polygon.faceId;
    const vertices = (polygon.vertices || []) as THREE.Vector3[];
    if (!faceId || vertices.length < 2) return;
    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      if (!(start instanceof THREE.Vector3) || !(end instanceof THREE.Vector3)) continue;
      const startKey = makeVertexKey(start, epsilon);
      const endKey = makeVertexKey(end, epsilon);
      const edgeKey = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
      const existing = edgeMap.get(edgeKey);
      if (!existing) {
        edgeMap.set(edgeKey, { faceId, edge: [start.clone(), end.clone()] });
        continue;
      }
      if (existing.faceId !== faceId) {
        adjacency.push({
          a: existing.faceId,
          b: faceId,
          sharedEdge: existing.edge
        });
      }
    }
  });

  return adjacency;
};
