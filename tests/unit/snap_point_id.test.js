import { describe, expect, it } from 'vitest';
import {
  parseSnapPointId,
  normalizeSnapPointId,
  stringifySnapPointId,
  canonicalizeSnapPointId,
} from '../../dist/js/geometry/snapPointId.js';

describe('snapPointId parsing', () => {
  it('parses vertex ids', () => {
    expect(parseSnapPointId('V:0')).toEqual({ type: 'vertex', vertexIndex: '0' });
  });

  it('parses edge ids', () => {
    expect(parseSnapPointId('E:0-1@1/2')).toEqual({
      type: 'edge',
      edgeIndex: '0-1',
      ratio: { numerator: 1, denominator: 2 },
    });
  });

  it('parses face center ids', () => {
    expect(parseSnapPointId('F:0123@center')).toEqual({
      type: 'face',
      faceIndex: '0123',
    });
  });
});

describe('snapPointId normalization', () => {
  it('reduces fractions', () => {
    const parsed = parseSnapPointId('E:0-1@2/4');
    const normalized = normalizeSnapPointId(parsed);
    expect(normalized).toEqual({
      type: 'edge',
      edgeIndex: '0-1',
      ratio: { numerator: 1, denominator: 2 },
    });
    expect(stringifySnapPointId(normalized)).toBe('E:0-1@1/2');
  });

  it('normalizes reversed edge and inverts ratio', () => {
    const parsed = parseSnapPointId('E:1-0@1/4');
    const normalized = normalizeSnapPointId(parsed);
    expect(normalized).toEqual({
      type: 'edge',
      edgeIndex: '0-1',
      ratio: { numerator: 3, denominator: 4 },
    });
    expect(stringifySnapPointId(normalized)).toBe('E:0-1@3/4');
  });

  it('normalizes reversed edge with arbitrary ratio', () => {
    const parsed = parseSnapPointId('E:2-1@3/10');
    const normalized = normalizeSnapPointId(parsed);
    expect(normalized).toEqual({
      type: 'edge',
      edgeIndex: '1-2',
      ratio: { numerator: 7, denominator: 10 },
    });
    expect(stringifySnapPointId(normalized)).toBe('E:1-2@7/10');
  });

  it('canonicalizes edge endpoints to vertex ids', () => {
    expect(canonicalizeSnapPointId('E:0-1@0/1')).toBe('V:0');
    expect(canonicalizeSnapPointId('E:0-1@1/1')).toBe('V:1');
  });
});