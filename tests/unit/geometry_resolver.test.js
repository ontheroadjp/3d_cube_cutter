import { describe, expect, it } from 'vitest';
import { GeometryResolver } from '../../dist/js/geometry/GeometryResolver.js';
import { getDefaultIndexMap } from '../../dist/js/geometry/indexMap.js';

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
    const edge = resolver.resolveEdge('E:0-1');
    expect(edge.length).toBeCloseTo(10);

    const mid = resolver.resolveSnapPoint('E:0-1@1/2');
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

  it('should preserve ratios after size change', () => {
    const resolver = new GeometryResolver({
      size: { lx: 10, ly: 10, lz: 10 },
      indexMap: getDefaultIndexMap()
    });
    const edge = resolver.resolveEdge('E:0-1');
    const point = resolver.resolveSnapPoint('E:0-1@3/10');
    const dist = point.distanceTo(edge.start);
    const ratio = dist / edge.length;
    expect(ratio).toBeCloseTo(0.3, 6);

    resolver.setSize({ lx: 20, ly: 10, lz: 10 });
    const edge2 = resolver.resolveEdge('E:0-1');
    const point2 = resolver.resolveSnapPoint('E:0-1@3/10');
    const dist2 = point2.distanceTo(edge2.start);
    const ratio2 = dist2 / edge2.length;
    expect(ratio2).toBeCloseTo(0.3, 6);
  });
});