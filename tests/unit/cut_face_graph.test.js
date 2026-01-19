import { describe, expect, it } from 'vitest';
import { buildFaceAdjacency } from '../../dist/js/cutter/cutFaceGraph.js';

describe('buildFaceAdjacency', () => {
  it('should detect shared edge between two faces', () => {
    const faceA = {
      faceId: 'F:A',
      type: 'original',
      vertexIds: ['V:0', 'V:1', 'V:2', 'V:3']
    };
    const faceB = {
      faceId: 'F:B',
      type: 'original',
      vertexIds: ['V:1', 'V:4', 'V:5', 'V:2']
    };

    const adjacency = buildFaceAdjacency([faceA, faceB]);

    expect(adjacency.length).toBe(1);
    expect([adjacency[0].a, adjacency[0].b].sort()).toEqual(['F:A', 'F:B']);
  });
});
