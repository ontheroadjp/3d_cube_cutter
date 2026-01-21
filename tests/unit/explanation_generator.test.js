import { describe, expect, it } from 'vitest';
import { generateExplanation } from '../../dist/js/education/explanationGenerator.js';

  const createStructure = () => ({
    vertexMap: new Map([
      ['V:0', { id: 'V:0', label: 'A', vertices: [], edges: [], faces: [] }],
      ['V:1', { id: 'V:1', label: 'B', vertices: [], edges: [], faces: [] }],
    ]),
    edgeMap: new Map([
      ['E:0-1', { id: 'E:0-1', vertices: ['V:0', 'V:1'] }],
    ]),
    faceMap: new Map(),
  });

describe('explanationGenerator', () => {
  it('should classify pentagon from outline refs', () => {
    const outlineRefs = [
      { id: 'V:0' },
      { id: 'V:1' },
      { id: 'V:2' },
      { id: 'V:3' },
      { id: 'V:4' },
    ];
    const text = generateExplanation({
      snapIds: ['V:0', 'V:1', 'V:2'],
      outlineRefs,
      structure: createStructure()
    });
    expect(text).toContain('五角形');
  });

  it('should classify hexagon from outline refs', () => {
    const outlineRefs = [
      { id: 'V:0' },
      { id: 'V:1' },
      { id: 'V:2' },
      { id: 'V:3' },
      { id: 'V:4' },
      { id: 'V:5' },
    ];
    const text = generateExplanation({
      snapIds: ['V:0', 'V:1', 'V:2'],
      outlineRefs,
      structure: createStructure()
    });
    expect(text).toContain('六角形');
  });

  it('should include ratio text for edge snap points', () => {
    const text = generateExplanation({
      snapIds: ['E:0-1@1/3'],
      outlineRefs: [],
      structure: createStructure()
    });
    expect(text).toContain('比率 1:2');
  });
});
