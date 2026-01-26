import { describe, expect, it, vi } from 'vitest';
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

const createDocumentStubWithoutCount = () => {
  const elements = new Map();
  const createEl = (id) => {
    const el = { id, style: {}, classList: { add() {}, remove() {} }, textContent: '' };
    return el;
  };
  [
    'tooltip',
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

  it('applyDisplayState should update internal state without DOM controls', () => {
    createDocumentStub();
    const ui = new UIManager();

    ui.applyDisplayState({
      showVertexLabels: false,
      showFaceLabels: false,
      edgeLabelMode: 'hidden',
      showCutSurface: false,
      showPyramid: true,
      cubeTransparent: false,
      showCutPoints: false,
      colorizeCutLines: true
    });

    expect(ui.getDisplayState()).toEqual({
      showVertexLabels: false,
      showFaceLabels: false,
      edgeLabelMode: 'hidden',
      showCutSurface: false,
      showPyramid: true,
      cubeTransparent: false,
      showCutPoints: false,
      colorizeCutLines: true,
      showNormalHelper: false
    });
  });

  it('getDisplayState should reflect toggles when present', () => {
    const elements = createDocumentStub();
    const createInput = (checked = false) => ({ checked });
    const createSelect = (value = 'visible') => ({ value });

    elements.set('edgeLabelMode', createSelect('popup'));
    elements.set('toggleVertexLabels', createInput(false));
    elements.set('toggleFaceLabels', createInput(true));
    elements.set('toggleCutSurface', createInput(false));
    elements.set('toggleCutPoints', createInput(true));
    elements.set('toggleCutLineColor', createInput(true));
    elements.set('togglePyramid', createInput(true));
    elements.set('toggleCubeTransparency', createInput(false));

    const ui = new UIManager();
    const state = ui.getDisplayState();

    expect(state).toEqual({
      showVertexLabels: false,
      showFaceLabels: true,
      edgeLabelMode: 'popup',
      showCutSurface: false,
      showPyramid: true,
      cubeTransparent: false,
      showCutPoints: true,
      colorizeCutLines: true,
      showNormalHelper: false
    });
  });

  it('should allow disabling legacy controls without accessing legacy DOM', () => {
    createDocumentStub();
    const ui = new UIManager({ legacyControls: false });

    ui.showSettingsPanels(false);
    ui.showSettingsPanel('display');
    ui.resetToFreeSelectMode();

    expect(ui.getDisplayState()).toEqual({
      showVertexLabels: true,
      showFaceLabels: true,
      edgeLabelMode: 'visible',
      showCutSurface: true,
      showPyramid: false,
      cubeTransparent: false,
      showCutPoints: true,
      colorizeCutLines: false,
      showNormalHelper: false
    });
  });

  it('should not throw when selection count element is missing', () => {
    createDocumentStubWithoutCount();
    const ui = new UIManager();

    ui.updateSelectionCount(2);
    expect(ui.getDisplayState().showVertexLabels).toBe(true);
  });

});
