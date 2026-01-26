import {
  type AnimationSpec,
  type AnimationStep,
  type ActionParams,
  type ActionType,
  type TargetRef,
  parseAnimationSpec,
} from './AnimationSpec.js';

export type AnimationDispatch = (
  action: ActionType,
  targets: TargetRef | undefined,
  params: ActionParams | undefined,
  progress: number,
  easedProgress: number,
  elapsedSeconds: number,
  durationSeconds: number,
) => void;

export type AnimationPlayerOptions = {
  dispatch: AnimationDispatch;
  now?: () => number; // milliseconds
  requestFrame?: (cb: (time: number) => void) => number;
  cancelFrame?: (handle: number) => void;
};

type ScheduledStep = {
  step: AnimationStep;
  startAt: number; // seconds
  duration: number; // seconds
  targets?: TargetRef;
  params?: ActionParams;
  action: ActionType;
  completed: boolean;
};

export class AnimationPlayer {
  private readonly dispatch: AnimationDispatch;
  private readonly now: () => number;
  private readonly requestFrame: (cb: (time: number) => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private playing = false;
  private startTimeMs = 0;
  private frameHandle: number | null = null;
  private schedule: ScheduledStep[] = [];

  constructor(options: AnimationPlayerOptions) {
    this.dispatch = options.dispatch;
    this.now = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((cb) => requestAnimationFrame(cb));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
  }

  play(specInput: AnimationSpec | unknown) {
    this.stop();
    const spec = parseAnimationSpec(specInput);
    this.schedule = buildSchedule(spec.timeline);
    this.startTimeMs = this.now();
    this.playing = true;
    this.frameHandle = this.requestFrame(this.tick);
  }

  stop() {
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.playing = false;
    this.schedule = [];
  }

  private tick = () => {
    if (!this.playing) return;
    const elapsedSeconds = (this.now() - this.startTimeMs) / 1000;
    let active = false;

    for (const entry of this.schedule) {
      if (entry.completed) continue;
      const localTime = elapsedSeconds - entry.startAt;
      if (localTime < 0) {
        active = true;
        continue;
      }
      const duration = entry.duration;
      const progress = duration <= 0 ? 1 : Math.min(1, localTime / duration);
      const eased = applyEase(entry.step.ease, progress);
      this.dispatch(
        entry.action,
        entry.targets,
        entry.params,
        progress,
        eased,
        localTime,
        duration,
      );
      if (progress >= 1) {
        entry.completed = true;
      } else {
        active = true;
      }
    }

    if (active) {
      this.frameHandle = this.requestFrame(this.tick);
    } else {
      this.stop();
    }
  };
}

function buildSchedule(timeline: AnimationStep[]): ScheduledStep[] {
  const indexed = timeline.map((step, index) => ({ step, index }));
  indexed.sort((a, b) => (a.step.at - b.step.at) || (a.index - b.index));
  const schedule: ScheduledStep[] = [];
  for (const { step } of indexed) {
    const expanded = expandStep(step);
    schedule.push(...expanded);
  }
  return schedule;
}

function expandStep(step: AnimationStep): ScheduledStep[] {
  const base = {
    step,
    duration: step.duration,
    action: step.action,
    params: step.params,
    completed: false,
  };
  if (step.targets && 'ids' in step.targets && Array.isArray(step.targets.ids) && step.targets.ids.length > 0) {
    if (typeof step.stagger === 'number' && step.stagger > 0) {
      return step.targets.ids.map((id, index) => ({
        ...base,
        startAt: step.at + index * step.stagger!,
        targets: { type: step.targets!.type, ids: [id] } as TargetRef,
      }));
    }
  }
  return [{
    ...base,
    startAt: step.at,
    targets: step.targets,
  }];
}

function applyEase(ease: AnimationStep['ease'], t: number): number {
  switch (ease) {
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3);
    case 'linear':
    default:
      return t;
  }
}
