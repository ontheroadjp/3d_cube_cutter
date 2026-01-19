import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildFaceAdjacency } from '../../dist/js/cutter/cutFaceGraph.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

describe('buildFaceAdjacency', () => {
  it('should detect shared edge between two faces', () => {
    const faceA = {
      faceId: 'F:A',
      type: 'original',
      vertices: [v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0)]
    };
    const faceB = {
      faceId: 'F:B',
      type: 'original',
      vertices: [v(1, 0, 0), v(2, 0, 0), v(2, 1, 0), v(1, 1, 0)]
    };

    const adjacency = buildFaceAdjacency([faceA, faceB]);

    expect(adjacency.length).toBe(1);
    expect([adjacency[0].a, adjacency[0].b].sort()).toEqual(['F:A', 'F:B']);
  });
});
