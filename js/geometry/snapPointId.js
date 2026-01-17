export function parseSnapPointId(id) {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  let match = trimmed.match(/^V:(\d+)$/);
  if (match) {
    return { type: 'vertex', vertexIndex: match[1] };
  }
  match = trimmed.match(/^E:(\d+)(\d+)@(\d+)\/(\d+)$/);
  if (match) {
    return {
      type: 'edge',
      edgeIndex: `${match[1]}${match[2]}`,
      ratio: { numerator: Number(match[3]), denominator: Number(match[4]) },
    };
  }
  match = trimmed.match(/^F:(\d+)(\d+)(\d+)(\d+)@center$/);
  if (match) {
    return {
      type: 'face',
      faceIndex: `${match[1]}${match[2]}${match[3]}${match[4]}`,
    };
  }
  return null;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function normalizeRatio(ratio) {
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

export function normalizeSnapPointId(parsed) {
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
    const i1 = parsed.edgeIndex[0];
    const i2 = parsed.edgeIndex[1];
    if (i1 === undefined || i2 === undefined) return null;
    if (i1 <= i2) {
      return { type: 'edge', edgeIndex: `${i1}${i2}`, ratio };
    }
    return {
      type: 'edge',
      edgeIndex: `${i2}${i1}`,
      ratio: {
        numerator: ratio.denominator - ratio.numerator,
        denominator: ratio.denominator,
      },
    };
  }
  return null;
}

export function stringifySnapPointId(parsed) {
  if (!parsed || !parsed.type) return null;
  if (parsed.type === 'vertex') return `V:${parsed.vertexIndex}`;
  if (parsed.type === 'face') return `F:${parsed.faceIndex}@center`;
  if (parsed.type === 'edge') {
    if (!parsed.edgeIndex || !parsed.ratio) return null;
    return `E:${parsed.edgeIndex}@${parsed.ratio.numerator}/${parsed.ratio.denominator}`;
  }
  return null;
}

export function canonicalizeSnapPointId(id) {
  const parsed = parseSnapPointId(id);
  const normalized = normalizeSnapPointId(parsed);
  if (!normalized) return null;
  if (normalized.type !== 'edge') return stringifySnapPointId(normalized);
  const { numerator, denominator } = normalized.ratio;
  if (numerator === 0) {
    return `V:${normalized.edgeIndex[0]}`;
  }
  if (numerator === denominator) {
    return `V:${normalized.edgeIndex[1]}`;
  }
  return stringifySnapPointId(normalized);
}
