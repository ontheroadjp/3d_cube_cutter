import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../dist/js/utils.js', () => ({
  createLabel: () => new THREE.Sprite(),
}));

import { Cube } from '../../dist/js/Cube.js';
import { GeometryResolver } from '../../dist/js/geometry/GeometryResolver.js';
import { buildObjectModelData } from '../../dist/js/model/objectModelBuilder.js';

describe('object model builder', () => {
  it('builds a solid model from structure and resolver', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    // resolver is not needed for buildObjectModelData but kept for context if needed later
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const structure = cube.getStructure();

    const modelData = buildObjectModelData({
      structure,
      size: cube.getSize(),
      display: { showVertexLabels: true }
    });

    expect(modelData).not.toBeNull();
    const { ssot, presentation } = modelData;

    expect(Object.keys(ssot.vertices)).toHaveLength(8);
    expect(Object.keys(ssot.edges)).toHaveLength(12);
    expect(Object.keys(ssot.faces)).toHaveLength(6);

    const v0 = ssot.vertices['V:0'];
    expect(v0).toBeTruthy();
    // position is derived, not in SSOT
    expect(v0.position).toBeUndefined();

    const edge = ssot.edges['E:0-1'];
    expect(edge).toBeTruthy();
    // length is derived
    expect(edge.length).toBeUndefined();

    const face = ssot.faces['F:0-1-5-4'];
    expect(face).toBeTruthy();
    expect(face.vertices).toHaveLength(4);
    // normal is derived
    expect(face.normal).toBeUndefined();
    
    // Check presentation
    expect(presentation).toBeTruthy();
    expect(presentation.vertices['V:0']).toBeTruthy();
  });
});