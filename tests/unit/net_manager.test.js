import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { NetManager } from '../../js/net/NetManager.js';
import { GeometryResolver } from '../../js/geometry/GeometryResolver.js';
import { getDefaultIndexMap } from '../../js/geometry/indexMap.js';
import { buildCubeStructure } from '../../js/structure/structureModel.js';

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
  global.document = {
    body: { appendChild: vi.fn() },
    createElement,
    getElementById: (id) => elements.get(id) || null,
  };
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
      startId: 'E:01@1/2',
      endId: 'E:04@1/2',
      start: resolver.resolveSnapPoint('E:01@1/2'),
      end: resolver.resolveSnapPoint('E:04@1/2'),
      faceIds: ['F:0154']
    };

    netManager.update([segment], cube, resolver);

    const ctx = netManager.ctx;
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});
