import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../dist/js/utils.js', () => ({
  createLabel: () => new THREE.Sprite(),
}));

import { Cube } from '../../dist/js/Cube.js';

describe('Cube', () => {
  it('should resolve snap point ids from labels', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);

    expect(cube.getSnapPointIdForVertexLabel('A')).toBe('V:0');
    expect(cube.getSnapPointIdForEdgeName('AB', 1, 2)).toBe('E:0-1@1/2');
  });

  it('should apply vertex label map to display properties', () => {
    const scene = new THREE.Scene();
    const cube = new Cube(scene, 10);

    cube.setVertexLabelMap({ 'V:0': 'X' });
    expect(cube.getDisplayLabelByIndex(0)).toBe('X');
    // Note: structure update is no longer Cube's responsibility
  });
});