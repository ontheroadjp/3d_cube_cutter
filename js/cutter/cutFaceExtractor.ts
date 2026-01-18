import * as THREE from 'three';
import type { CutFacePolygon } from '../types.js';

type PlaneGroup = {
  normal: THREE.Vector3;
  constant: number;
  type: 'cut' | 'original';
  triangles: Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]>;
};

type VertexEntry = {
  key: string;
  position: THREE.Vector3;
};

const defaultEpsilon = 1e-3;

const makeKey = (value: number, epsilon: number) => Math.round(value / epsilon).toString(10);

const makeVertexKey = (v: THREE.Vector3, epsilon: number) =>
  `${makeKey(v.x, epsilon)}|${makeKey(v.y, epsilon)}|${makeKey(v.z, epsilon)}`;

const normalizePlane = (normal: THREE.Vector3, constant: number, epsilon: number) => {
  const n = normal.clone().normalize();
  let c = constant;
  const absX = Math.abs(n.x);
  const absY = Math.abs(n.y);
  const absZ = Math.abs(n.z);
  const flip = (absX > epsilon && n.x < 0)
    || (absX <= epsilon && absY > epsilon && n.y < 0)
    || (absX <= epsilon && absY <= epsilon && n.z < 0);
  if (flip) {
    n.negate();
    c = -c;
  }
  return { normal: n, constant: c };
};

const makePlaneKey = (normal: THREE.Vector3, constant: number, type: string, epsilon: number) => {
  const norm = normal.clone().normalize();
  return [
    type,
    makeKey(norm.x, epsilon),
    makeKey(norm.y, epsilon),
    makeKey(norm.z, epsilon),
    makeKey(constant, epsilon)
  ].join('|');
};

const buildPolygonFromEdges = (edges: Array<[VertexEntry, VertexEntry]>) => {
  if (!edges.length) return [] as THREE.Vector3[];
  const adjacency = new Map<string, string[]>();
  const vertexMap = new Map<string, THREE.Vector3>();

  edges.forEach(([a, b]) => {
    if (!adjacency.has(a.key)) adjacency.set(a.key, []);
    if (!adjacency.has(b.key)) adjacency.set(b.key, []);
    adjacency.get(a.key)?.push(b.key);
    adjacency.get(b.key)?.push(a.key);
    if (!vertexMap.has(a.key)) vertexMap.set(a.key, a.position.clone());
    if (!vertexMap.has(b.key)) vertexMap.set(b.key, b.position.clone());
  });

  const start = edges[0][0].key;
  const orderedKeys = [start];
  let current = start;
  let previous: string | null = null;

  for (let step = 0; step < edges.length + 1; step++) {
    const neighbors = adjacency.get(current) || [];
    if (!neighbors.length) break;
    let next = neighbors[0];
    if (neighbors.length > 1 && next === previous) {
      next = neighbors[1];
    }
    if (!next) break;
    if (next === start) break;
    orderedKeys.push(next);
    previous = current;
    current = next;
  }

  return orderedKeys
    .map(key => vertexMap.get(key))
    .filter((v): v is THREE.Vector3 => !!v);
};

const getMaterialType = (mesh: THREE.Mesh, materialIndex: number) => {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const material = materials[materialIndex];
  if (material && material.name === 'cutFace') return 'cut';
  return 'original';
};

const getTriangleVertices = (
  positions: THREE.BufferAttribute,
  index: THREE.BufferAttribute | null,
  a: number,
  b: number,
  c: number
) => {
  const getVertex = (idx: number) => new THREE.Vector3(
    positions.getX(idx),
    positions.getY(idx),
    positions.getZ(idx)
  );
  if (index) {
    return [
      getVertex(index.getX(a)),
      getVertex(index.getX(b)),
      getVertex(index.getX(c))
    ] as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  }
  return [getVertex(a), getVertex(b), getVertex(c)] as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
};

export const extractFacePolygonsFromMesh = (mesh: THREE.Mesh, epsilon = defaultEpsilon): CutFacePolygon[] => {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return [];
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const index = geometry.index as THREE.BufferAttribute | null;
  const groups = geometry.groups && geometry.groups.length
    ? geometry.groups
    : [{ start: 0, count: index ? index.count : positions.count, materialIndex: 0 }];

  const planeGroups = new Map<string, PlaneGroup>();

  groups.forEach(group => {
    const start = group.start;
    const count = group.count;
    const materialType = getMaterialType(mesh, group.materialIndex);
    for (let i = start; i < start + count; i += 3) {
      const [a, b, c] = getTriangleVertices(positions, index, i, i + 1, i + 2);
      const plane = new THREE.Plane().setFromCoplanarPoints(a, b, c);
      if (plane.normal.lengthSq() < epsilon) continue;
      const normalized = normalizePlane(plane.normal, plane.constant, epsilon);
      const key = makePlaneKey(normalized.normal, normalized.constant, materialType, epsilon);
      if (!planeGroups.has(key)) {
        planeGroups.set(key, {
          normal: normalized.normal,
          constant: normalized.constant,
          type: materialType,
          triangles: []
        });
      }
      planeGroups.get(key)?.triangles.push([a, b, c]);
    }
  });

  const polygons: CutFacePolygon[] = [];

  planeGroups.forEach(group => {
    const edgeCount = new Map<string, { count: number; a: VertexEntry; b: VertexEntry }>();
    group.triangles.forEach(([a, b, c]) => {
      const edges: Array<[THREE.Vector3, THREE.Vector3]> = [
        [a, b],
        [b, c],
        [c, a]
      ];
      edges.forEach(([start, end]) => {
        const startKey = makeVertexKey(start, epsilon);
        const endKey = makeVertexKey(end, epsilon);
        const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
        const entry = edgeCount.get(key);
        if (entry) {
          entry.count += 1;
        } else {
          edgeCount.set(key, {
            count: 1,
            a: { key: startKey, position: start.clone() },
            b: { key: endKey, position: end.clone() }
          });
        }
      });
    });

    const boundaryEdges = Array.from(edgeCount.values())
      .filter(entry => entry.count === 1)
      .map(entry => [entry.a, entry.b] as [VertexEntry, VertexEntry]);

    const vertices = buildPolygonFromEdges(boundaryEdges);
    if (vertices.length < 3) return;
    polygons.push({
      faceId: `F:${polygons.length}`,
      type: group.type,
      vertices,
      normal: group.normal.clone()
    });
  });

  return polygons;
};
