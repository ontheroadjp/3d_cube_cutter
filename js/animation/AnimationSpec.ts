export type AnimationSpec = {
  id: string;
  version: number;
  timeline: AnimationStep[];
  meta?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
};

export type AnimationStep = {
  id?: string;
  at: number;
  duration: number;
  stagger?: number;
  ease?: EaseType;
  action: ActionType;
  targets?: TargetRef;
  params?: ActionParams;
};

export type EaseType = 'linear' | 'easeOutCubic';

export type ActionType =
  | 'rotateFace'
  | 'scaleGroup'
  | 'moveCamera'
  | 'setVisibility'
  | 'highlight'
  | 'showText'
  | 'hideText'
  | 'playSound'
  | 'stopSound';

export type TargetRef =
  | { type: 'netFaces'; ids: string[] }
  | { type: 'netGroup' }
  | { type: 'camera' }
  | { type: 'htmlOverlay'; ids: string[] }
  | { type: 'audioChannel'; ids: string[] };

export type RotateFaceParams = {
  faceId: string;
  hingeEdgeId: string;
  angleRad: number;
};

export type ScaleGroupParams = {
  scale: number;
};

export type MoveCameraParams = {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
};

export type SetVisibilityParams = {
  visible: boolean;
};

export type HighlightParams = {
  color?: string;
  opacity?: number;
  mode?: 'pulse' | 'solid';
};

export type ShowTextParams = {
  textId: string;
  content?: string;
  position?: { x: number; y: number };
  style?: Record<string, string>;
};

export type HideTextParams = {
  textId: string;
};

export type PlaySoundParams = {
  soundId: string;
  volume?: number;
  loop?: boolean;
};

export type StopSoundParams = {
  soundId: string;
};

export type ActionParams =
  | RotateFaceParams
  | ScaleGroupParams
  | MoveCameraParams
  | SetVisibilityParams
  | HighlightParams
  | ShowTextParams
  | HideTextParams
  | PlaySoundParams
  | StopSoundParams;

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const ACTIONS_NEED_TARGET: Record<ActionType, boolean> = {
  rotateFace: true,
  scaleGroup: true,
  moveCamera: true,
  setVisibility: true,
  highlight: true,
  showText: true,
  hideText: true,
  playSound: true,
  stopSound: true,
};

export function validateAnimationSpec(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['spec must be an object'] };
  }
  const { id, version, timeline } = input;
  if (!isString(id) || id.length === 0) {
    errors.push('id must be a non-empty string');
  }
  if (!isNumber(version)) {
    errors.push('version must be a number');
  }
  if (!Array.isArray(timeline)) {
    errors.push('timeline must be an array');
  } else {
    timeline.forEach((step, index) => {
      errors.push(...validateStep(step, index));
    });
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function parseAnimationSpec(input: unknown): AnimationSpec {
  const result = validateAnimationSpec(input);
  if (!result.ok) {
    throw new Error(`Invalid AnimationSpec: ${result.errors.join('; ')}`);
  }
  return input as AnimationSpec;
}

function validateStep(step: unknown, index: number): string[] {
  const errors: string[] = [];
  if (!isRecord(step)) {
    errors.push(`timeline[${index}] must be an object`);
    return errors;
  }
  if (!isNumber(step.at) || step.at < 0) {
    errors.push(`timeline[${index}].at must be a number >= 0`);
  }
  if (!isNumber(step.duration) || step.duration < 0) {
    errors.push(`timeline[${index}].duration must be a number >= 0`);
  }
  if (typeof step.stagger !== 'undefined' && (!isNumber(step.stagger) || step.stagger < 0)) {
    errors.push(`timeline[${index}].stagger must be a number >= 0`);
  }
  if (!isString(step.action) || !isActionType(step.action)) {
    errors.push(`timeline[${index}].action must be a known action`);
    return errors;
  }
  if (ACTIONS_NEED_TARGET[step.action]) {
    if (!isRecord(step.targets)) {
      errors.push(`timeline[${index}].targets is required for ${step.action}`);
    } else {
      errors.push(...validateTarget(step.targets, index));
    }
  }
  errors.push(...validateParams(step.action, step.params, index));
  return errors;
}

function validateTarget(targets: unknown, index: number): string[] {
  if (!isRecord(targets) || !isString(targets.type)) {
    return [`timeline[${index}].targets.type must be a string`];
  }
  switch (targets.type) {
    case 'netFaces':
    case 'htmlOverlay':
    case 'audioChannel':
      if (!Array.isArray(targets.ids) || targets.ids.length === 0 || !targets.ids.every(isString)) {
        return [`timeline[${index}].targets.ids must be a non-empty string array`];
      }
      return [];
    case 'netGroup':
    case 'camera':
      return [];
    default:
      return [`timeline[${index}].targets.type is not supported`];
  }
}

function validateParams(action: ActionType, params: unknown, index: number): string[] {
  if (!isRecord(params)) {
    return [`timeline[${index}].params is required for ${action}`];
  }
  switch (action) {
    case 'rotateFace':
      return [
        ...requireString(params.faceId, `timeline[${index}].params.faceId`),
        ...requireString(params.hingeEdgeId, `timeline[${index}].params.hingeEdgeId`),
        ...requireNumber(params.angleRad, `timeline[${index}].params.angleRad`),
      ];
    case 'scaleGroup':
      return requireNumber(params.scale, `timeline[${index}].params.scale`);
    case 'moveCamera':
      return [
        ...requireVec3(params.position, `timeline[${index}].params.position`),
        ...requireVec3(params.lookAt, `timeline[${index}].params.lookAt`),
      ];
    case 'setVisibility':
      return requireBoolean(params.visible, `timeline[${index}].params.visible`);
    case 'highlight':
      return [];
    case 'showText':
      return requireString(params.textId, `timeline[${index}].params.textId`);
    case 'hideText':
      return requireString(params.textId, `timeline[${index}].params.textId`);
    case 'playSound':
      return requireString(params.soundId, `timeline[${index}].params.soundId`);
    case 'stopSound':
      return requireString(params.soundId, `timeline[${index}].params.soundId`);
    default:
      return [`timeline[${index}].params is not supported for ${action}`];
  }
}

function isActionType(value: string): value is ActionType {
  return [
    'rotateFace',
    'scaleGroup',
    'moveCamera',
    'setVisibility',
    'highlight',
    'showText',
    'hideText',
    'playSound',
    'stopSound',
  ].includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function requireString(value: unknown, path: string): string[] {
  return isString(value) && value.length > 0 ? [] : [`${path} must be a non-empty string`];
}

function requireNumber(value: unknown, path: string): string[] {
  return isNumber(value) ? [] : [`${path} must be a number`];
}

function requireBoolean(value: unknown, path: string): string[] {
  return typeof value === 'boolean' ? [] : [`${path} must be a boolean`];
}

function requireVec3(value: unknown, path: string): string[] {
  if (!isRecord(value)) {
    return [`${path} must be an object`];
  }
  return [
    ...requireNumber(value.x, `${path}.x`),
    ...requireNumber(value.y, `${path}.y`),
    ...requireNumber(value.z, `${path}.z`),
  ];
}
