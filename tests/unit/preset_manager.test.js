import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

import { PresetManager } from '../../dist/js/presets/PresetManager.js';
import { PRESETS } from '../../dist/js/presets/presetData.js';

describe('PresetManager', () => {
  it('should apply snapId presets through selection manager', () => {
    const selectionManager = { addPoint: vi.fn() };
    const cube = {
      getVertexObjectById: () => null,
      getVertexLabelByIndex: () => null,
      getVertexObjectByName: () => null,
      getEdgeObjectById: () => null,
      getEdgeNameByIndex: () => null,
      getEdgeObjectByName: () => null,
    };
    const resolver = {
      resolveSnapPointRef: () => new THREE.Vector3(1, 2, 3),
    };

    const manager = new PresetManager(selectionManager, cube, {}, resolver);
    const preset = PRESETS.find(p => p.name === '正三角形 (角切り)');
    manager.applyPreset(preset.name);

    expect(selectionManager.addPoint).toHaveBeenCalledTimes(preset.snapIds.length);
    preset.snapIds.forEach((id, index) => {
      expect(selectionManager.addPoint.mock.calls[index][0].snapId).toBe(id);
    });
  });
});
