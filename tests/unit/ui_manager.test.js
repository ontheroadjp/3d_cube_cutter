import { describe, expect, it } from 'vitest';
import { UIManager } from '../../dist/js/UIManager.js';

const createDocumentStub = () => {
  const elements = new Map();
  const createEl = (id) => {
    const el = { id, style: {}, classList: { add() {}, remove() {} }, textContent: '' };
    return el;
  };
  [
    'tooltip',
    'count',
    'alert-container',
    'explanation-panel',
    'explanation-text'
  ].forEach(id => elements.set(id, createEl(id)));

  global.document = /** @type {any} */ ({
    getElementById: (id) => elements.get(id) || null
  });
  return elements;
};

describe('UIManager', () => {
  it('setExplanation should toggle panel visibility', () => {
    const elements = createDocumentStub();
    const ui = new UIManager();
    const panel = elements.get('explanation-panel');
    const text = elements.get('explanation-text');

    ui.setExplanation('test');
    expect(text.textContent).toBe('test');
    expect(panel.style.display).toBe('block');

    ui.setExplanation('');
    expect(text.textContent).toBe('');
    expect(panel.style.display).toBe('none');
  });
});
