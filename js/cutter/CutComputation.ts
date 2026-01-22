import * as THREE from 'three';
import { buildFaceAdjacency } from './cutFaceGraph.js';
import { canonicalizeSnapPointId, normalizeSnapPointId, parseSnapPointId, stringifySnapPointId } from '../geometry/snapPointId.js';
import type { CutFacePolygon, CutSegmentMeta, IntersectionPoint, Ratio, SnapPointID } from '../types.js';
import type { ObjectCutAdjacency, SolidSSOT, TopologyIndex } from '../model/objectModel.js';

const isSolidSSOT = (solid: any): solid is SolidSSOT => {
  return !!(solid && solid.meta && solid.vertices && typeof solid.getStructure !== 'function');
};

const resolveEdgeIdFromVertices = (
  solid: SolidSSOT,
  v0: string,
  v1: string,
  topologyIndex: TopologyIndex | null
): string | null => {
  if (topologyIndex) {
    const edgeIds = topologyIndex.vertexToEdges[v0] || [];
    for (let i = 0; i < edgeIds.length; i++) {
      const edge = solid.edges[edgeIds[i]];
      if (!edge) continue;
      if ((edge.v0 === v0 && edge.v1 === v1) || (edge.v0 === v1 && edge.v1 === v0)) {
        return edge.id;
      }
    }
    return null;
  }
  const edges = Object.values(solid.edges);
  const match = edges.find((edge: any) =>
    (edge.v0 === v0 && edge.v1 === v1) || (edge.v0 === v1 && edge.v1 === v0)
  );
  return match ? match.id : null;
};

export const computeCutState = (
  solid: SolidSSOT | any,
  snapIds: SnapPointID[],
  resolver: any,
  topologyIndex: TopologyIndex | null = null
): {
  intersections: IntersectionPoint[];
  facePolygons: CutFacePolygon[];
  faceAdjacency: ObjectCutAdjacency[];
  cutSegments: CutSegmentMeta[];
  outlineRefs: IntersectionPoint[];
  cutPlane: THREE.Plane;
} | null => {
  if (!solid || !snapIds || snapIds.length < 3 || !resolver) return null;

  const resolvedPoints = snapIds
    .map(id => resolver.resolveSnapPoint(id))
    .filter((p: THREE.Vector3 | null): p is THREE.Vector3 => p !== null);
  if (resolvedPoints.length < 3) return null;

  const plane = new THREE.Plane();
  let validPlane = false;
  for (let i = 0; i < resolvedPoints.length; i++) {
    for (let j = i + 1; j < resolvedPoints.length; j++) {
      for (let k = j + 1; k < resolvedPoints.length; k++) {
        try {
          plane.setFromCoplanarPoints(resolvedPoints[i], resolvedPoints[j], resolvedPoints[k]);
          if (plane.normal.lengthSq() > 0.0001) {
            validPlane = true;
            break;
          }
        } catch (e) { continue; }
      }
      if (validPlane) break;
    }
    if (validPlane) break;
  }
  if (!validPlane) return null;

  const intersections: THREE.Vector3[] = resolvedPoints.slice();
  const intersectionRefs: IntersectionPoint[] = [];

  snapIds.forEach(snapId => {
    const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
    if (!parsed) return;
    const normalizedId = stringifySnapPointId(parsed);
    if (!normalizedId) return;
    intersectionRefs.push({
      id: canonicalizeSnapPointId(normalizedId) || normalizedId,
      type: 'snap'
    });
  });

  let edgesData: any[] = [];
  const isSSOT = isSolidSSOT(solid);
  if (isSSOT) {
    edgesData = Object.values((solid as SolidSSOT).edges);
  } else {
    edgesData = solid.edges || [];
  }

  const edgeLines = edgesData.map((edge: any) => {
    const edgeId = typeof edge === 'string' ? edge : edge.id;
    const resolved = resolver.resolveEdge(edgeId);
    return resolved ? new THREE.Line3(resolved.start, resolved.end) : null;
  });

  edgesData.forEach((edge: any, index: number) => {
    const line = edgeLines[index];
    if (!line) return;
    const target = new THREE.Vector3();
    if (plane.intersectLine(line, target)) {
      const distToStart = target.distanceTo(line.start);
      const distToEnd = target.distanceTo(line.end);
      const edgeLength = line.distance();
      if (Math.abs((distToStart + distToEnd) - edgeLength) < 1e-3) {
        if (!intersections.some(v => v.distanceTo(target) < 1e-2)) {
          intersections.push(target.clone());
          const ratioRaw = distToStart / edgeLength;
          const denominator = 1000;
          const numerator = Math.max(0, Math.min(denominator, Math.round(ratioRaw * denominator)));
          const edgeId = typeof edge === 'string' ? edge : edge.id;
          const parsed = normalizeSnapPointId({
            type: 'edge',
            edgeIndex: edgeId.replace(/^E:/, ''),
            ratio: { numerator, denominator }
          });
          const snapId = parsed ? stringifySnapPointId(parsed) : null;
          if (snapId) {
            const id = canonicalizeSnapPointId(snapId) || snapId;
            if (!intersectionRefs.some(ref => ref.id === id)) {
              intersectionRefs.push({
                id,
                type: 'intersection',
                edgeId,
                ratio: (parsed && parsed.type === 'edge' ? parsed.ratio : undefined) as Ratio | undefined
              });
            }
          }
        }
      }
    }
  });

  const resolveFaceIds = (ref: IntersectionPoint) => {
    if (ref.faceIds && ref.faceIds.length) return ref.faceIds;
    const foundFaces: string[] = [];
    if (ref.edgeId) {
      if (solid.meta && solid.edges && topologyIndex) {
        const edgeFaces = topologyIndex.edgeToFaces[ref.edgeId];
        if (edgeFaces && edgeFaces.length) return edgeFaces.slice();
      } else {
        const facesList = Array.isArray(solid.faces) ? solid.faces : Object.values(solid.faces);
        facesList.forEach((face: any) => {
          if (solid.meta && solid.edges) {
            const edge = solid.edges[ref.edgeId!];
            if (edge && face.vertices) {
              for (let i = 0; i < face.vertices.length; i++) {
                const v0 = face.vertices[i];
                const v1 = face.vertices[(i + 1) % face.vertices.length];
                if ((edge.v0 === v0 && edge.v1 === v1) || (edge.v0 === v1 && edge.v1 === v0)) {
                  foundFaces.push(face.id);
                  break;
                }
              }
            }
          } else {
            const edgeIds = Array.isArray(face.edges) ? face.edges.map((e: any) => typeof e === 'string' ? e : e.id) : [];
            if (edgeIds.includes(ref.edgeId)) foundFaces.push(face.id);
          }
        });
      }
    }
    return foundFaces.length ? foundFaces : undefined;
  };
  intersectionRefs.forEach(ref => {
    if (!ref.faceIds) ref.faceIds = resolveFaceIds(ref);
  });

  const keepPositive = true;
  const isInside = (dist: number) => keepPositive ? dist >= -1e-5 : dist <= 1e-5;

  const buildEdgeSnapId = (edgeId: string, t: number, startId: string, endId: string) => {
    if (t <= 1e-6) return startId;
    if (t >= 1 - 1e-6) return endId;
    const found = intersectionRefs.find(r => r.edgeId === edgeId && r.ratio && Math.abs(r.ratio.numerator / r.ratio.denominator - t) < 0.01);
    if (found) return found.id;
    const numerator = Math.round(t * 1000);
    const parsed = normalizeSnapPointId({ type: 'edge', edgeIndex: edgeId.replace(/^E:/, ''), ratio: { numerator, denominator: 1000 } });
    return parsed ? stringifySnapPointId(parsed) : null;
  };

  const polygons: CutFacePolygon[] = [];
  const facesData = isSSOT ? Object.values((solid as SolidSSOT).faces) : (Array.isArray(solid.faces) ? solid.faces : Object.values(solid.faces));

  facesData.forEach((face: any) => {
    let vertices: any[] = [];
    let edgeIds: string[] = [];

    if (isSSOT) {
      vertices = (face.vertices as string[]).map(vid => ({ id: vid, position: resolver.resolveVertex(vid) }));
      const vIds = face.vertices;
      for (let i = 0; i < vIds.length; i++) {
        const v0 = vIds[i];
        const v1 = vIds[(i + 1) % vIds.length];
        const edgeId = resolveEdgeIdFromVertices(solid as SolidSSOT, v0, v1, topologyIndex);
        if (edgeId) edgeIds.push(edgeId);
      }
    } else {
      vertices = (face.vertices as any[]).map((v: any) => {
        const id = typeof v === 'string' ? v : v.id;
        return { id, position: resolver.resolveVertex(id) };
      });
      edgeIds = Array.isArray(face.edges) ? face.edges.map((e: any) => typeof e === 'string' ? e : e.id) : [];
    }

    vertices = vertices.filter((v: any) => v.position);
    if (vertices.length < 3 || edgeIds.length !== vertices.length) return;

    const output: any[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const current = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      const edgeId = edgeIds[i];
      const d1 = plane.distanceToPoint(current.position);
      const d2 = plane.distanceToPoint(next.position);
      const inside1 = isInside(d1);
      const inside2 = isInside(d2);

      if (inside1 && inside2) {
        output.push(next);
      } else if (inside1 && !inside2) {
        const t = d1 / (d1 - d2);
        const snapId = buildEdgeSnapId(edgeId, t, current.id, next.id);
        if (snapId) {
          const pos = current.position.clone().lerp(next.position, t);
          output.push({ id: snapId, position: pos });
        }
      } else if (!inside1 && inside2) {
        const t = d1 / (d1 - d2);
        const snapId = buildEdgeSnapId(edgeId, t, current.id, next.id);
        if (snapId) {
          const pos = current.position.clone().lerp(next.position, t);
          output.push({ id: snapId, position: pos });
        }
        output.push(next);
      }
    }

    if (output.length >= 3) {
      const unique = output.filter((v, i, a) => i === 0 || v.id !== a[i - 1].id);
      if (unique.length > 0 && unique[0].id === unique[unique.length - 1].id) unique.pop();

      if (unique.length >= 3) {
        polygons.push({
          faceId: face.id,
          type: 'original',
          vertexIds: unique.map(v => v.id)
        });
      }
    }
  });

  const cutPoints = intersectionRefs
    .map(ref => ({ ref, pos: resolver.resolveSnapPoint(ref.id) }))
    .filter((p): p is { ref: IntersectionPoint; pos: THREE.Vector3 } => p.pos !== null);
  if (cutPoints.length >= 3) {
    const center = new THREE.Vector3();
    cutPoints.forEach(p => center.add(p.pos));
    center.divideScalar(cutPoints.length);
    const normal = plane.normal;
    const base = new THREE.Vector3().subVectors(cutPoints[0].pos, center).normalize();
    const up = new THREE.Vector3().crossVectors(normal, base).normalize();

    cutPoints.sort((a, b) => {
      const va = new THREE.Vector3().subVectors(a.pos, center);
      const vb = new THREE.Vector3().subVectors(b.pos, center);
      return Math.atan2(va.dot(up), va.dot(base)) - Math.atan2(vb.dot(up), vb.dot(base));
    });

    const cutVertexIds = cutPoints.map(p => p.ref.id);
    const cutFaceId = `F:${cutVertexIds.join('-')}`;

    polygons.push({
      faceId: cutFaceId,
      type: 'cut',
      vertexIds: cutVertexIds
    });
  }

  const cutSegments: CutSegmentMeta[] = cutPoints.map((p, i) => ({
    startId: p.ref.id,
    endId: cutPoints[(i + 1) % cutPoints.length].ref.id,
    faceIds: [] as string[]
  }));

  const faceAdjacency = buildFaceAdjacency(polygons);

  return {
    intersections: intersectionRefs,
    facePolygons: polygons,
    faceAdjacency,
    cutSegments,
    outlineRefs: cutPoints.map(p => p.ref),
    cutPlane: plane
  };
};
