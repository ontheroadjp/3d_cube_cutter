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

  it('should expose presets with snapIds for selection-based cuts', () => {
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
    const presets = manager.getPresets();

    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(0);
    presets.forEach(preset => {
      expect(['triangle', 'quad', 'poly']).toContain(preset.category);
      expect(Array.isArray(preset.snapIds)).toBe(true);
      expect(preset.snapIds.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('should skip presets without snapIds', () => {
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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const manager = new PresetManager(selectionManager, cube, {}, resolver);
    manager.presets = [{ name: 'LegacyPreset', category: 'triangle' }];
    manager.applyPreset('LegacyPreset');

    expect(selectionManager.addPoint).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Preset is missing snapIds: LegacyPreset');
    warnSpy.mockRestore();
  });
});
