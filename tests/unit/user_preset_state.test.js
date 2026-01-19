import { describe, expect, it } from 'vitest';
import { buildUserPresetState } from '../../dist/js/presets/userPresetState.js';

describe('buildUserPresetState', () => {
  it('should include cut result meta without positions', () => {
    const cube = {
      getSize: () => ({ lx: 10, ly: 20, lz: 30 }),
      getVertexLabelMap: () => ({ 'V:0': 'A' })
    };
    const selection = {
      getSelectedSnapIds: () => ['V:0', 'E:01@1/2', 'E:12@1/4']
    };
    const cutter = {
      isCutInverted: () => true,
      getCutResult: () => ({
        outline: { points: [
          { id: 'V:0', type: /** @type {'snap'} */ ('snap') },
          { id: 'E:01@1/2', type: /** @type {'intersection'} */ ('intersection') },
          { id: 'E:12@1/4', type: /** @type {'intersection'} */ ('intersection') }
        ] },
        intersections: [
          { id: 'V:0', type: /** @type {'snap'} */ ('snap') },
          { id: 'E:01@1/2', type: /** @type {'intersection'} */ ('intersection'), edgeId: 'E:01', ratio: { numerator: 1, denominator: 2 }, faceIds: ['F:0154'] }
        ],
        cutSegments: [
          { startId: 'V:0', endId: 'E:01@1/2', faceIds: ['F:0154'] }
        ]
      })
    };
    const ui = {
      getDisplayState: () => ({
        showVertexLabels: true,
        showFaceLabels: true,
        edgeLabelMode: /** @type {'visible'} */ ('visible'),
        showCutSurface: true,
        showPyramid: false,
        cubeTransparent: true,
        showCutPoints: true,
        colorizeCutLines: false
      })
    };

    const state = buildUserPresetState({
      cube,
      selection,
      cutter,
      ui,
      meta: { id: 'test-id', name: 'Test Preset' },
      now: () => '2024-01-01T00:00:00.000Z',
      idFactory: () => 'test-id'
    });

    expect(state.cut.result.outline).toEqual(['V:0', 'E:01@1/2', 'E:12@1/4']);
    expect(state.cut.result.intersections[0]).toEqual({
      id: 'V:0',
      type: 'snap',
      edgeId: undefined,
      ratio: undefined,
      faceIds: undefined
    });
    expect(state.cut.result.intersections[1]).toEqual({
      id: 'E:01@1/2',
      type: 'intersection',
      edgeId: 'E:01',
      ratio: { numerator: 1, denominator: 2 },
      faceIds: ['F:0154']
    });
    expect(state.cut.result.cutSegments[0]).toEqual({
      startId: 'V:0',
      endId: 'E:01@1/2',
      faceIds: ['F:0154']
    });
  });

  it('should include display state and meta in snapshot', () => {
    const cube = {
      getSize: () => ({ lx: 10, ly: 11, lz: 12 }),
      getVertexLabelMap: () => ({ 'V:0': 'A' })
    };
    const selection = {
      getSelectedSnapIds: () => ['V:0', 'V:1', 'V:2']
    };
    const cutter = {
      isCutInverted: () => true,
      getCutResult: () => null
    };
    const ui = {
      getDisplayState: () => ({
        showVertexLabels: false,
        showFaceLabels: true,
        edgeLabelMode: /** @type {'hidden'} */ ('hidden'),
        showCutSurface: false,
        showPyramid: true,
        cubeTransparent: false,
        showCutPoints: false,
        colorizeCutLines: true
      })
    };

    const state = buildUserPresetState({
      cube,
      selection,
      cutter,
      ui,
      meta: { note: 'test' },
      now: () => '2024-01-01T00:00:00.000Z',
      idFactory: () => 'test-id'
    });

    expect(state.display).toEqual({
      showVertexLabels: false,
      showFaceLabels: true,
      edgeLabelMode: 'hidden',
      showCutSurface: false,
      showPyramid: true,
      cubeTransparent: false,
      showCutPoints: false,
      colorizeCutLines: true
    });
    expect(state.name).toBe('User Preset');
    expect(state.description).toBeUndefined();
    expect(state.category).toBeUndefined();
    expect(state.cut.inverted).toBe(true);
  });
});
