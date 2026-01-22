import { parseSnapPointId, normalizeSnapPointId } from '../geometry/snapPointId.js';

import type { SnapPointID } from '../types.js';

type StructureSummary = {
  vertexMap?: Map<string, { label?: string }>;
  edgeMap?: Map<string, { vertices?: string[] }>;
  faceMap?: Map<string, { vertices?: string[] }>;
};

function getVertexLabel(structure: StructureSummary | null, vertexId: string) {
  if (!structure || !structure.vertexMap) return vertexId;
  const vertex = structure.vertexMap.get(vertexId);
  if (vertex && vertex.label) return vertex.label;
  return vertexId;
}

function getEdgeLabels(structure: StructureSummary | null, edgeId: string) {
  if (!structure || !structure.edgeMap) return [edgeId, edgeId];
  const edge = structure.edgeMap.get(edgeId);
  if (!edge || !edge.vertices) return [edgeId, edgeId];
  return edge.vertices.map(vId => getVertexLabel(structure, vId));
}

function getFaceLabels(structure: StructureSummary | null, faceId: string) {
  if (!structure || !structure.faceMap) return [faceId];
  const face = structure.faceMap.get(faceId);
  if (!face || !face.vertices) return [faceId];
  return face.vertices.map(vId => getVertexLabel(structure, vId));
}

function describeSnapPoint(snapId: SnapPointID, structure: StructureSummary | null) {
  const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
  if (!parsed) return null;
  if (parsed.type === 'vertex') {
    const label = getVertexLabel(structure, `V:${parsed.vertexIndex}`);
    return `頂点 ${label} を通る切断面です。`;
  }
  if (parsed.type === 'edge') {
    const edgeId = `E:${parsed.edgeIndex}`;
    const [startLabel, endLabel] = getEdgeLabels(structure, edgeId);
    const ratio = parsed.ratio;
    if (ratio && ratio.numerator * 2 === ratio.denominator) {
      return `辺 ${startLabel}-${endLabel} の中点を通ります。`;
    }
    if (ratio) {
      const complement = ratio.denominator - ratio.numerator;
      const ratioText = complement > 0 ? `${ratio.numerator}:${complement}` : `${ratio.numerator}:${ratio.denominator}`;
      return `辺 ${startLabel}-${endLabel} 上の比率 ${ratioText} にある点を通ります。`;
    }
    return `辺 ${startLabel}-${endLabel} 上の点を通ります。`;
  }
  if (parsed.type === 'face') {
    const faceId = `F:${parsed.faceIndex}`;
    const labels = getFaceLabels(structure, faceId);
    return `面 ${labels.join('-')} の中心を通ります。`;
  }
  return null;
}

export function generateExplanation({
  snapIds,
  outlineRefs,
  structure
}: {
  snapIds: SnapPointID[];
  outlineRefs?: Array<{ id?: SnapPointID }>;
  structure?: StructureSummary | null;
}) {
  if (!snapIds || snapIds.length === 0) return '';
  const orderedIds: SnapPointID[] = [];
  const seen = new Set<SnapPointID>();
  snapIds.forEach(id => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    orderedIds.push(id);
  });
  if (Array.isArray(outlineRefs)) {
    outlineRefs.forEach(ref => {
      if (!ref || !ref.id || seen.has(ref.id)) return;
      seen.add(ref.id);
      orderedIds.push(ref.id);
    });
  }
  const lines = orderedIds.map(id => describeSnapPoint(id, structure || null)).filter(Boolean);
  const shape = classifyShape(outlineRefs, snapIds, structure || null);
  if (shape) lines.push(`切断面の形は ${shape} です。`);
  if (lines.length === 0) return '';
  lines.push('この切断面の形や辺の長さの関係を考えてみましょう。');
  return lines.join('\n');
}

function classifyShape(
  outlineRefs: Array<{ id?: SnapPointID }> | undefined,
  snapIds: SnapPointID[],
  structure: StructureSummary | null
) {
  const outlineCount = Array.isArray(outlineRefs) ? outlineRefs.length : 0;
  if (outlineCount >= 3) {
    if (outlineCount === 3) return '三角形';
    if (outlineCount === 4) return '四角形';
    if (outlineCount === 5) return '五角形';
    if (outlineCount === 6) return '六角形';
    if (outlineCount >= 7) return '多角形';
  }
  if (!snapIds || snapIds.length === 0) return null;
  const parsed = snapIds
    .map(id => normalizeSnapPointId(parseSnapPointId(id)))
    .filter((p): p is NonNullable<typeof p> => p !== null);
  if (parsed.length < 3) return null;
  if (parsed.length === 3) return '三角形';
  if (parsed.length === 4) {
    if (structure && structure.faceMap) {
      const vertexIds = new Set(parsed.filter(p => p.type === 'vertex').map(p => `V:${(p as any).vertexIndex}`));
      if (vertexIds.size === 4) {
        const faceKey = Array.from(vertexIds).map(v => v.split(':')[1]).join('');
        if (structure.faceMap.has(`F:${faceKey}`)) return '正方形';
      }
    }
    return '四角形';
  }
  if (parsed.length >= 5) return '多角形';
  return null;
}
