import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../dist/js/utils.js', () => ({
  createLabel: () => new THREE.Sprite(),
}));

import { Cube } from '../../dist/js/Cube.js';
import { GeometryResolver } from '../../dist/js/geometry/GeometryResolver.js';
import { buildObjectSolidModel } from '../../dist/js/model/objectModelBuilder.js';

describe('object model builder', () => {
  it('builds a solid model from structure and resolver', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);
    const resolver = new GeometryResolver({ size: cube.getSize(), indexMap: cube.getIndexMap() });
    const structure = cube.getStructure();

    const model = buildObjectSolidModel({
      structure,
      resolver,
      size: cube.getSize()
    });

    expect(model).not.toBeNull();
    expect(model.vertices).toHaveLength(8);
    expect(model.edges).toHaveLength(12);
    expect(model.faces).toHaveLength(6);

    const v0 = model.vertices.find(vertex => vertex.id === 'V:0');
    expect(v0).toBeTruthy();
    expect(v0.position).toBeInstanceOf(THREE.Vector3);

    const edge = model.edges.find(e => e.id === 'E:01');
    expect(edge).toBeTruthy();
    expect(edge.length).toBeGreaterThan(0);

    const face = model.faces.find(f => f.id === 'F:0154');
    expect(face).toBeTruthy();
    expect(face.vertices).toHaveLength(4);
    expect(face.normal).toBeInstanceOf(THREE.Vector3);
  });
});
