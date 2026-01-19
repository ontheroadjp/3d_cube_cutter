import { normalizeSnapPointId, parseSnapPointId, stringifySnapPointId } from '../geometry/snapPointId.js';
import type { CubeSize, CutResult, DisplayState, UserPresetState } from '../types.js';

const defaultIdFactory = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(16).slice(2);
  return `user-${Date.now()}-${rand}`;
};

export function buildUserPresetState({
  cube,
  selection,
  cutter,
  ui,
  labelMap = null,
  meta = {},
  now = () => new Date().toISOString(),
  idFactory = defaultIdFactory
}: {
  cube?: { getSize?: () => CubeSize; getVertexLabelMap?: () => Record<string, string> | null };
  selection?: { getSelectedSnapIds?: () => string[] };
  cutter?: { isCutInverted?: () => boolean; cutInverted?: boolean; getCutResult?: () => CutResult };
  ui?: { getDisplayState?: () => DisplayState };
  labelMap?: Record<string, string> | null;
  meta?: { id?: string; name?: string; description?: string; category?: string; createdAt?: string; updatedAt?: string };
  now?: () => string;
  idFactory?: () => string;
} = {}): UserPresetState | null {
  if (!cube || !selection || !cutter || !ui) return null;

  const size = cube.getSize ? cube.getSize() : null;
  const snapIds = selection.getSelectedSnapIds
    ? selection.getSelectedSnapIds()
        .map(id => {
          const parsed = normalizeSnapPointId(parseSnapPointId(id));
          return parsed ? stringifySnapPointId(parsed) : null;
        })
        .filter(Boolean)
    : [];
  const display = ui.getDisplayState ? ui.getDisplayState() : null;
  const cutResult = cutter.getCutResult ? cutter.getCutResult() : null;
  const cutMeta = cutResult ? {
    outline: Array.isArray(cutResult.outline && cutResult.outline.points)
      ? cutResult.outline.points.map(ref => ref && ref.id).filter(Boolean)
      : [],
    intersections: Array.isArray(cutResult.intersections)
      ? cutResult.intersections.map(ref => ({
          id: ref.id,
          type: ref.type,
          edgeId: ref.edgeId,
          ratio: ref.ratio ? { ...ref.ratio } : undefined,
          faceIds: Array.isArray(ref.faceIds) ? [...ref.faceIds] : undefined
        }))
      : [],
    cutSegments: Array.isArray(cutResult.cutSegments)
      ? cutResult.cutSegments.map(seg => ({
          startId: seg.startId,
          endId: seg.endId,
          faceIds: Array.isArray(seg.faceIds) ? [...seg.faceIds] : undefined
        }))
      : []
  } : null;

  const createdAt = meta.createdAt || now();
  const updatedAt = meta.updatedAt || createdAt;

  return {
    id: meta.id || idFactory(),
    name: meta.name || 'User Preset',
    description: meta.description,
    category: meta.category,
    cube: {
      size: size ? { ...size } : null,
      labelMap: labelMap || (cube.getVertexLabelMap ? cube.getVertexLabelMap() : null)
    },
    cut: {
      snapPoints: snapIds,
      inverted: cutter.isCutInverted ? cutter.isCutInverted() : !!cutter.cutInverted,
      result: cutMeta || undefined
    },
    display: display || null,
    createdAt,
    updatedAt
  };
}
