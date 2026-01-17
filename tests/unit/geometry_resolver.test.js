import { describe, expect, it } from 'vitest';
import { GeometryResolver } from '../../js/geometry/GeometryResolver.js';
import { getDefaultIndexMap } from '../../js/geometry/indexMap.js';

describe('GeometryResolver', () => {
  it('should resolve vertex positions from indexMap', () => {
    const resolver = new GeometryResolver({
      size: { lx: 10, ly: 20, lz: 30 },
      indexMap: getDefaultIndexMap()
    });

    const v0 = resolver.resolveVertex('V:0');
    expect(v0.x).toBeCloseTo(-5);
    expect(v0.y).toBeCloseTo(-10);
    expect(v0.z).toBeCloseTo(15);

    const v7 = resolver.resolveVertex('V:7');
    expect(v7.x).toBeCloseTo(-5);
    expect(v7.y).toBeCloseTo(10);
    expect(v7.z).toBeCloseTo(-15);
  });

  it('should resolve edge length and midpoint', () => {
    const resolver = new GeometryResolver({
      size: { lx: 10, ly: 10, lz: 10 },
      indexMap: getDefaultIndexMap()
    });
    const edge = resolver.resolveEdge('E:01');
    expect(edge.length).toBeCloseTo(10);

    const mid = resolver.resolveSnapPoint('E:01@1/2');
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(-5);
    expect(mid.z).toBeCloseTo(5);
  });

  it('should resolve face normal and basis vectors', () => {
    const resolver = new GeometryResolver({
      size: { lx: 10, ly: 20, lz: 30 },
      indexMap: getDefaultIndexMap()
    });
    const face = resolver.resolveFace('F:0154');
    const normal = face.normal;
    expect(normal.x).toBeCloseTo(0);
    expect(normal.y).toBeCloseTo(0);
    expect(normal.z).toBeCloseTo(1);

    const basisU = face.basisU;
    const basisV = face.basisV;
    expect(basisU.length()).toBeCloseTo(1);
    expect(basisV.length()).toBeCloseTo(1);
    expect(basisU.dot(basisV)).toBeCloseTo(0);
  });

  it('should update positions after size change', () => {
    const resolver = new GeometryResolver({
      size: { lx: 10, ly: 10, lz: 10 },
      indexMap: getDefaultIndexMap()
    });
    const before = resolver.resolveVertex('V:1');
    resolver.setSize({ lx: 20 });
    const after = resolver.resolveVertex('V:1');
    expect(before.x).toBeCloseTo(5);
    expect(after.x).toBeCloseTo(10);
  });
});
