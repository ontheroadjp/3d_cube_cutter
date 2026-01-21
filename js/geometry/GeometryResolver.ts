import * as THREE from 'three';
import { parseSnapPointId, normalizeSnapPointId } from './snapPointId.js';
import { getDefaultIndexMap } from './indexMap.js';

import type { CubeSize, Ratio, SnapPointID } from '../types.js';

export class GeometryResolver {
  size: CubeSize;
  origin: THREE.Vector3;
  axis: { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 };
  indexMap: Record<string, { x: number; y: number; z: number }>;
  labelMap: Record<string, string> | null;

  constructor({
    size,
    origin,
    axis,
    indexMap,
    labelMap
  }: {
    size?: CubeSize;
    origin?: THREE.Vector3;
    axis?: { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 };
    indexMap?: Record<string, { x: number; y: number; z: number }>;
    labelMap?: Record<string, string>;
  } = {}) {
    this.size = size || { lx: 1, ly: 1, lz: 1 };
    this.origin = origin || new THREE.Vector3(0, 0, 0);
    this.axis = axis || {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1)
    };
    this.indexMap = indexMap || getDefaultIndexMap();
    this.labelMap = labelMap || null;
  }

  setSize(size: Partial<CubeSize>) {
    this.size = { ...this.size, ...size };
  }

  setLabelMap(labelMap: Record<string, string> | null) {
    this.labelMap = labelMap || null;
  }

  resolveVertex(vertexId: string) {
    if (!vertexId || !vertexId.startsWith('V:')) return null;
    const index = vertexId.slice(2);
    const sign = this.indexMap[index];
    if (!sign) return null;
    const { lx, ly, lz } = this.size;
    const half = new THREE.Vector3(
      (sign.x * lx) / 2,
      (sign.y * ly) / 2,
      (sign.z * lz) / 2
    );
    const pos = new THREE.Vector3().copy(this.origin);
    pos.add(this.axis.x.clone().multiplyScalar(half.x));
    pos.add(this.axis.y.clone().multiplyScalar(half.y));
    pos.add(this.axis.z.clone().multiplyScalar(half.z));
    return pos;
  }

  resolveEdge(edgeId: string) {
    if (!edgeId || !edgeId.startsWith('E:')) return null;
    const content = edgeId.slice(2);
    const indices = content.split('-').map(s => s.replace(/^V:/, ''));

    if (indices.length !== 2) return null;
    const start = this.resolveVertex(`V:${indices[0]}`);
    const end = this.resolveVertex(`V:${indices[1]}`);
    if (!start || !end) return null;
    return { start, end, length: start.distanceTo(end) };
  }

  resolveFace(faceId: string) {
    if (!faceId || !faceId.startsWith('F:')) return null;
    const indices = faceId.slice(2).split('');
    if (indices.length !== 4) return null;
    const vertices = indices.map(index => this.resolveVertex(`V:${index}`));
    if (vertices.some(v => !v)) return null;
    const v0 = vertices[0];
    const v1 = vertices[1];
    const v2 = vertices[2];
    const normal = new THREE.Vector3()
      .subVectors(v1, v0)
      .cross(new THREE.Vector3().subVectors(v2, v0))
      .normalize();
    const basisU = new THREE.Vector3().subVectors(v1, v0).normalize();
    const basisV = new THREE.Vector3().crossVectors(normal, basisU).normalize();
    return { vertices, normal, basisU, basisV };
  }

  resolveFaceCenter(faceId: string) {
    const face = this.resolveFace(faceId);
    if (!face) return null;
    const center = new THREE.Vector3();
    face.vertices.forEach(v => center.add(v));
    center.divideScalar(face.vertices.length);
    return center;
  }

  getBasisForFace(faceId: string) {
    const face = this.resolveFace(faceId);
    if (!face) return null;
    return { origin: face.vertices[0].clone(), basisU: face.basisU, basisV: face.basisV };
  }

  resolveSnapPoint(snapId: SnapPointID) {
    const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
    return this.resolveSnapPointRef(parsed);
  }

  resolveSnapPointRef(
    ref:
      | { type: 'vertex'; vertexIndex: string }
      | { type: 'edge'; edgeIndex: string; ratio: Ratio }
      | { type: 'face'; faceIndex: string }
      | null
  ) {
    if (!ref) return null;
    if (ref.type === 'vertex') {
      return this.resolveVertex(`V:${ref.vertexIndex}`);
    }
    if (ref.type === 'edge') {
      if (!ref.edgeIndex || !ref.ratio) return null;
      const edge = this.resolveEdge(`E:${ref.edgeIndex}`);
      if (!edge) return null;
      const t = ref.ratio.numerator / ref.ratio.denominator;
      return new THREE.Vector3().lerpVectors(edge.start, edge.end, t);
    }
    if (ref.type === 'face') {
      return this.resolveFaceCenter(`F:${ref.faceIndex}`);
    }
    return null;
  }
}
