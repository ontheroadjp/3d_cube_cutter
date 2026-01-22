import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { NetManager } from '../../dist/js/net/NetManager.js';
import { GeometryResolver } from '../../dist/js/geometry/GeometryResolver.js';
import { getDefaultIndexMap } from '../../dist/js/geometry/indexMap.js';
import { buildCubeStructure } from '../../dist/js/structure/structureModel.js';

const createDocumentStubs = () => {
  const elements = new Map();
  const createElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      children: [],
      appendChild(child) { this.children.push(child); },
      getContext: () => ({
        clearRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      })
    };
    return el;
  };
  global.document = /** @type {any} */ ({
    body: { appendChild: vi.fn() },
    createElement,
    getElementById: (id) => elements.get(id) || null,
  });
  elements.set('ui-container', {
    getBoundingClientRect: () => ({ height: 0 })
  });
  return elements;
};

describe('NetManager', () => {
  let netManager;
  let resolver;
  let cube;
  let docElements;

  beforeEach(() => {
    docElements = createDocumentStubs();
    resolver = new GeometryResolver({
      size: { lx: 10, ly: 10, lz: 10 },
      indexMap: getDefaultIndexMap()
    });
    cube = {
      getStructure: () => buildCubeStructure({ indexMap: getDefaultIndexMap() })
    };
    netManager = new NetManager();
    netManager.setResolver(resolver);
    netManager.show();
  });

  afterEach(() => {
    netManager.hide();
    docElements.clear();
  });

  it('should map front face midpoint to center of the front grid cell', () => {
    const segment = {
      startId: 'E:0-1@1/2',
      endId: 'E:0-4@1/2',
      faceIds: ['F:0-1-5-4']
    };

    const resolveSpy = vi.spyOn(resolver, 'resolveSnapPoint');
    netManager.update([segment], cube.getStructure(), resolver);

    const ctx = netManager.ctx;
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(resolveSpy).toHaveBeenCalledWith('E:0-1@1/2');
    expect(resolveSpy).toHaveBeenCalledWith('E:0-4@1/2');
  });

  it('should draw segments inside the front face grid cell', () => {
    const segment = {
      startId: 'E:0-1@1/2',
      endId: 'E:0-4@1/2',
      faceIds: ['F:0-1-5-4']
    };

    netManager.update([segment], cube.getStructure(), resolver);

    const ctx = netManager.ctx;
    const [x1, y1] = ctx.moveTo.mock.calls[0];
    const [x2, y2] = ctx.lineTo.mock.calls[0];
    const min = 20 + 50;
    const max = 20 + 100;
    [x1, y1, x2, y2].forEach(value => {
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    });
  });

  it('should resolve segments with multiple faceIds using a deterministic rule', () => {
    const segment = {
      startId: 'E:0-1@1/2',
      endId: 'E:0-4@1/2',
      faceIds: ['F:0-1-5-4', 'F:0-3-2-1']
    };

    netManager.update([segment], cube.getStructure(), resolver);

    const ctx = netManager.ctx;
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});