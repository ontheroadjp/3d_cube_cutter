import type { Ratio, SnapPointID } from '../types.js';

export type SnapPointRef =
  | { type: 'vertex'; vertexIndex: string }
  | { type: 'edge'; edgeIndex: string; ratio: Ratio }
  | { type: 'face'; faceIndex: string };

export function parseSnapPointId(id: string): SnapPointRef | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  let match = trimmed.match(/^V:(\d+)$/);
  if (match) {
    return { type: 'vertex', vertexIndex: match[1] };
  }
  // Strictly enforce E:a-b@... format
  match = trimmed.match(/^E:(\d+)-(\d+)@(\d+)\/(\d+)$/);
  if (match) {
    return {
      type: 'edge',
      edgeIndex: `${match[1]}-${match[2]}`,
      ratio: { numerator: Number(match[3]), denominator: Number(match[4]) },
    };
  }
  // Support F:0154@center (legacy) or F:V:0-... (verbose)
  match = trimmed.match(/^F:(.+?)@center$/);
  if (match) {
    return {
      type: 'face',
      faceIndex: match[1],
    };
  }
  return null;
}

function gcd(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function normalizeRatio(ratio: Ratio | null | undefined) {
  if (!ratio) return null;
  let { numerator, denominator } = ratio;
  if (denominator === 0) return null;
  if (denominator < 0) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const d = gcd(numerator, denominator);
  return { numerator: numerator / d, denominator: denominator / d };
}

export function normalizeSnapPointId(parsed: SnapPointRef | null): SnapPointRef | null {
  if (!parsed || !parsed.type) return null;
  if (parsed.type === 'vertex') {
    return { type: 'vertex', vertexIndex: parsed.vertexIndex };
  }
  if (parsed.type === 'face') {
    return { type: 'face', faceIndex: parsed.faceIndex };
  }
  if (parsed.type === 'edge') {
    if (!parsed.edgeIndex || !parsed.ratio) return null;
    const ratio = normalizeRatio(parsed.ratio);
    if (!ratio) return null;
    
    // Expect "a-b" format
    const parts = parsed.edgeIndex.split('-');
    if (parts.length !== 2) return null;
    
    const i1 = parts[0];
    const i2 = parts[1];
    
    const n1 = parseInt(i1, 10);
    const n2 = parseInt(i2, 10);
    
    // Sort indices numerically
    const swap = !isNaN(n1) && !isNaN(n2) ? n1 > n2 : i1 > i2;

    if (!swap) {
      return { type: 'edge', edgeIndex: `${i1}-${i2}`, ratio };
    }
    return {
      type: 'edge',
      edgeIndex: `${i2}-${i1}`, 
      ratio: {
        numerator: ratio.denominator - ratio.numerator,
        denominator: ratio.denominator,
      },
    };
  }
  return null;
}

export function stringifySnapPointId(parsed: SnapPointRef | null): SnapPointID | null {
  if (!parsed || !parsed.type) return null;
  if (parsed.type === 'vertex') return `V:${parsed.vertexIndex}`;
  if (parsed.type === 'face') return `F:${parsed.faceIndex}@center`;
  if (parsed.type === 'edge') {
    if (!parsed.edgeIndex || !parsed.ratio) return null;
    return `E:${parsed.edgeIndex}@${parsed.ratio.numerator}/${parsed.ratio.denominator}`;
  }
  return null;
}

export function canonicalizeSnapPointId(id: SnapPointID): SnapPointID | null {
  const parsed = parseSnapPointId(id);
  const normalized = normalizeSnapPointId(parsed);
  if (!normalized) return null;
  if (normalized.type !== 'edge') return stringifySnapPointId(normalized);
  
  const { numerator, denominator } = normalized.ratio;
  const parts = normalized.edgeIndex.split('-');
  if (parts.length !== 2) return stringifySnapPointId(normalized);
  
  if (numerator === 0) {
    return `V:${parts[0]}`;
  }
  if (numerator === denominator) {
    return `V:${parts[1]}`;
  }
  return stringifySnapPointId(normalized);
}