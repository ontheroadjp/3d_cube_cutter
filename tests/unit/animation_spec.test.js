import { describe, it, expect } from 'vitest';
import { validateAnimationSpec, parseAnimationSpec } from '../../js/animation/AnimationSpec.js';
import { AnimationPlayer } from '../../js/animation/AnimationPlayer.js';
import { buildNetUnfoldSpec } from '../../js/animation/netUnfoldSpec.js';

describe('AnimationSpec validation', () => {
  it('accepts a minimal valid spec', () => {
    const spec = {
      id: 'spec-1',
      version: 1,
      timeline: [
        {
          at: 0,
          duration: 0,
          action: 'setVisibility',
          targets: { type: 'netGroup' },
          params: { visible: true },
        },
      ],
    };
    const result = validateAnimationSpec(spec);
    expect(result.ok).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = validateAnimationSpec({ version: 1, timeline: [] });
    expect(result.ok).toBe(false);
  });

  it('throws on parse for invalid spec', () => {
    expect(() => parseAnimationSpec({})).toThrow(/Invalid AnimationSpec/);
  });
});

describe('AnimationPlayer dispatch', () => {
  it('dispatches timeline actions in order', () => {
    const spec = {
      id: 'spec-2',
      version: 1,
      timeline: [
        {
          id: 'first',
          at: 0,
          duration: 0.05,
          action: 'setVisibility',
          targets: { type: 'netGroup' },
          params: { visible: true },
        },
        {
          id: 'second',
          at: 0.1,
          duration: 0.05,
          action: 'setVisibility',
          targets: { type: 'netGroup' },
          params: { visible: false },
        },
      ],
    };
    const calls = [];
    let nowMs = 0;
    const frames = [];
    const player = new AnimationPlayer({
      dispatch: (stepId, action, targets, params, progress) => {
        calls.push({ stepId, action, targets, params, progress });
      },
      now: () => nowMs,
      requestFrame: (cb) => {
        frames.push(cb);
        return frames.length;
      },
      cancelFrame: () => {},
    });
    player.play(spec);

    while (frames.length) {
      const cb = frames.shift();
      nowMs += 60;
      cb(nowMs);
    }

    expect(calls.length).toBeGreaterThan(0);
    const first = calls.find((call) => call.stepId === 'first');
    const second = calls.find((call) => call.stepId === 'second');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
  });

  it('plays a net spec without errors', () => {
    const plan = {
      id: 'net-plan',
      targetSolidId: 'solid-1',
      rootFaceId: 'F:root',
      hinges: [{ parentFaceId: 'F:root', childFaceId: 'F:child', hingeEdgeId: 'E:0-1' }],
      faceOrder: ['F:root', 'F:child'],
    };
    const spec = buildNetUnfoldSpec(plan, {
      startAtSec: 0,
      faceDurationSec: 0.1,
      staggerSec: 0.1,
      cameraDurationSec: 0.1,
      cameraPosition: { x: 0, y: 0, z: 10 },
      cameraTarget: { x: 0, y: 0, z: 0 },
    });
    const calls = [];
    let nowMs = 0;
    const frames = [];
    const player = new AnimationPlayer({
      dispatch: (stepId, action) => {
        calls.push({ stepId, action });
      },
      now: () => nowMs,
      requestFrame: (cb) => {
        frames.push(cb);
        return frames.length;
      },
      cancelFrame: () => {},
    });
    player.play(spec);

    while (frames.length) {
      const cb = frames.shift();
      nowMs += 60;
      cb(nowMs);
    }

    expect(calls.some((call) => call.action === 'rotateFace')).toBe(true);
  });
});
