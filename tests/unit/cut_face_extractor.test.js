import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { extractFacePolygonsFromMesh } from '../../dist/js/cutter/cutFaceExtractor.js';

const roundKey = (v) => `${v.x.toFixed(3)}|${v.y.toFixed(3)}|${v.z.toFixed(3)}`;

describe('extractFacePolygonsFromMesh', () => {
  it('should extract a single polygon from a square face', () => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1,  1, 0
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.clearGroups();
    geometry.addGroup(0, 6, 1);

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0x333333 }),
      new THREE.MeshBasicMaterial({ color: 0xff0000, name: 'cutFace' })
    ];

    const mesh = new THREE.Mesh(geometry, materials);
    const polygons = extractFacePolygonsFromMesh(mesh);

    expect(polygons.length).toBe(1);
    expect(polygons[0].type).toBe('cut');
    const unique = new Set(polygons[0].vertices.map(roundKey));
    expect(unique.size).toBe(4);
    polygons[0].vertices.forEach((v) => {
      expect(Math.abs(v.z)).toBeLessThan(1e-6);
    });
  });
});
