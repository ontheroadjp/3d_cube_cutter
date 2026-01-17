import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../dist/js/utils.js', () => ({
  createLabel: () => new THREE.Sprite(),
  createMarker: () => new THREE.Mesh(),
}));

import { SelectionManager } from '../../dist/js/SelectionManager.js';

describe('SelectionManager', () => {
  it('should add a snap point and update selection count', () => {
    const scene = new THREE.Scene();
    const cube = { size: 10 };
    const ui = { updateSelectionCount: vi.fn() };

    const manager = new SelectionManager(scene, cube, ui, null);
    const point = new THREE.Vector3(0, 0, 0);
    manager.addPoint({ point, snapId: 'V:0' });

    expect(manager.getSelectedSnapIds()).toEqual(['V:0']);
    expect(manager.markers.length).toBe(2);
    expect(ui.updateSelectionCount).toHaveBeenCalledWith(1);
  });
});
