import type { DisplayState, UserPresetState } from './types.js';

export class UIManager {
  tooltip: HTMLElement;
  countSpan: HTMLElement;
  alertContainer: HTMLElement;
  explanationPanel: HTMLElement | null;
  explanationText: HTMLElement | null;
  modeSelector: HTMLSelectElement | null;
  presetControls: HTMLElement | null;
  presetCategoryFilter: HTMLSelectElement | null;
  presetButtonsContainer: HTMLElement | null;
  settingsControls: HTMLElement | null;
  settingsCategorySelector: HTMLSelectElement | null;
  settingsPanels: HTMLElement | null;
  learningPanels: HTMLElement | null;
  displaySettingsPanel: HTMLElement | null;
  cuboidSettingsPanel: HTMLElement | null;
  userPresetsPanel: HTMLElement | null;
  saveUserPresetBtn: HTMLButtonElement | null;
  cancelUserPresetEditBtn: HTMLButtonElement | null;
  userPresetList: HTMLElement | null;
  userPresetEmpty: HTMLElement | null;
  userPresetName: HTMLInputElement | null;
  userPresetCategory: HTMLInputElement | null;
  userPresetDescription: HTMLInputElement | null;
  userPresetStorageNote: HTMLElement | null;
  edgeLabelSelect: HTMLSelectElement | null;
  toggleVertexLabels: HTMLInputElement | null;
  toggleCutSurface: HTMLInputElement | null;
  togglePyramid: HTMLInputElement | null;
  toggleCubeTransparency: HTMLInputElement | null;
  toggleFaceLabels: HTMLInputElement | null;
  toggleCutPoints: HTMLInputElement | null;
  toggleCutLineColor: HTMLInputElement | null;
  configureVertexLabelsBtn: HTMLButtonElement | null;
  flipCutBtn: HTMLButtonElement | null;
  toggleNetBtn: HTMLButtonElement | null;
  resetBtn: HTMLButtonElement | null;
  configureBtn: HTMLButtonElement | null;
  displayState: DisplayState;
  currentMode: string;
  currentSettingsCategory: string;

  legacyControlsEnabled: boolean;

  constructor(options: { legacyControls?: boolean } = {}){
    this.legacyControlsEnabled = options.legacyControls !== false;
    this.tooltip = document.getElementById('tooltip') as HTMLElement;
    this.countSpan = document.getElementById('count') as HTMLElement;
    this.alertContainer = document.getElementById('alert-container') as HTMLElement;
    this.explanationPanel = document.getElementById('explanation-panel');
    this.explanationText = document.getElementById('explanation-text');

    // --- Mode/Preset/Settings Controls ---
    this.modeSelector = this.legacyControlsEnabled
      ? (document.getElementById('mode-selector') as HTMLSelectElement | null)
      : null;
    
    this.presetControls = this.legacyControlsEnabled ? document.getElementById('preset-controls') : null;
    this.presetCategoryFilter = this.legacyControlsEnabled
      ? (document.getElementById('preset-category-filter') as HTMLSelectElement | null)
      : null;
    this.presetButtonsContainer = this.legacyControlsEnabled ? document.getElementById('presetButtons') : null;
    
    this.settingsControls = this.legacyControlsEnabled ? document.getElementById('settings-controls') : null;
    this.settingsCategorySelector = this.legacyControlsEnabled
      ? (document.getElementById('settings-category-selector') as HTMLSelectElement | null)
      : null;
    
    this.settingsPanels = this.legacyControlsEnabled ? document.getElementById('settings-panels') : null;
    this.learningPanels = this.legacyControlsEnabled ? document.getElementById('learning-panels') : null;
    this.displaySettingsPanel = this.legacyControlsEnabled ? document.getElementById('display-settings-panel') : null;
    this.cuboidSettingsPanel = this.legacyControlsEnabled ? document.getElementById('cuboid-settings-panel') : null;
    this.userPresetsPanel = this.legacyControlsEnabled ? document.getElementById('user-presets-panel') : null;
    this.saveUserPresetBtn = this.legacyControlsEnabled
      ? (document.getElementById('saveUserPreset') as HTMLButtonElement | null)
      : null;
    this.cancelUserPresetEditBtn = this.legacyControlsEnabled
      ? (document.getElementById('cancelUserPresetEdit') as HTMLButtonElement | null)
      : null;
    this.userPresetList = this.legacyControlsEnabled ? document.getElementById('userPresetList') : null;
    this.userPresetEmpty = this.legacyControlsEnabled ? document.getElementById('userPresetEmpty') : null;
    this.userPresetName = this.legacyControlsEnabled
      ? (document.getElementById('userPresetName') as HTMLInputElement | null)
      : null;
    this.userPresetCategory = this.legacyControlsEnabled
      ? (document.getElementById('userPresetCategory') as HTMLInputElement | null)
      : null;
    this.userPresetDescription = this.legacyControlsEnabled
      ? (document.getElementById('userPresetDescription') as HTMLInputElement | null)
      : null;
    this.userPresetStorageNote = this.legacyControlsEnabled ? document.getElementById('userPresetStorageNote') : null;

    // --- Display Settings Toggles ---
    this.edgeLabelSelect = this.legacyControlsEnabled
      ? (document.getElementById('edgeLabelMode') as HTMLSelectElement | null)
      : null;
    this.toggleVertexLabels = this.legacyControlsEnabled
      ? (document.getElementById('toggleVertexLabels') as HTMLInputElement | null)
      : null;
    this.toggleCutSurface = this.legacyControlsEnabled
      ? (document.getElementById('toggleCutSurface') as HTMLInputElement | null)
      : null;
    this.togglePyramid = this.legacyControlsEnabled
      ? (document.getElementById('togglePyramid') as HTMLInputElement | null)
      : null;
    this.toggleCubeTransparency = this.legacyControlsEnabled
      ? (document.getElementById('toggleCubeTransparency') as HTMLInputElement | null)
      : null;
    this.toggleFaceLabels = this.legacyControlsEnabled
      ? (document.getElementById('toggleFaceLabels') as HTMLInputElement | null)
      : null;
    this.toggleCutPoints = this.legacyControlsEnabled
      ? (document.getElementById('toggleCutPoints') as HTMLInputElement | null)
      : null;
    this.toggleCutLineColor = this.legacyControlsEnabled
      ? (document.getElementById('toggleCutLineColor') as HTMLInputElement | null)
      : null;
    this.configureVertexLabelsBtn = this.legacyControlsEnabled
      ? (document.getElementById('configureVertexLabels') as HTMLButtonElement | null)
      : null;

    // --- Action Buttons ---
    this.flipCutBtn = this.legacyControlsEnabled
      ? (document.getElementById('flipCut') as HTMLButtonElement | null)
      : null;
    this.toggleNetBtn = this.legacyControlsEnabled
      ? (document.getElementById('toggleNet') as HTMLButtonElement | null)
      : null;
    this.resetBtn = this.legacyControlsEnabled
      ? (document.getElementById('reset') as HTMLButtonElement | null)
      : null;
    this.configureBtn = this.legacyControlsEnabled
      ? (document.getElementById('configure') as HTMLButtonElement | null)
      : null;

    const edgeMode = this.edgeLabelSelect
        ? this.edgeLabelSelect.value
        : 'visible';
    this.displayState = {
      showVertexLabels: this.toggleVertexLabels ? this.toggleVertexLabels.checked : true,
      showFaceLabels: this.toggleFaceLabels ? this.toggleFaceLabels.checked : true,
      edgeLabelMode: edgeMode === 'popup' || edgeMode === 'hidden' ? edgeMode : 'visible',
      showCutSurface: this.toggleCutSurface ? this.toggleCutSurface.checked : true,
      showPyramid: this.togglePyramid ? this.togglePyramid.checked : false,
      cubeTransparent: this.toggleCubeTransparency ? this.toggleCubeTransparency.checked : true,
      showCutPoints: this.toggleCutPoints ? this.toggleCutPoints.checked : true,
      colorizeCutLines: this.toggleCutLineColor ? this.toggleCutLineColor.checked : false
    };
    this.currentMode = this.modeSelector ? this.modeSelector.value : 'free';
    this.currentSettingsCategory = this.settingsCategorySelector ? this.settingsCategorySelector.value : 'display';
  }

  // --- Getters for UI State ---
  getEdgeLabelMode(): DisplayState['edgeLabelMode'] {
    const value = this.edgeLabelSelect ? this.edgeLabelSelect.value : this.displayState.edgeLabelMode;
    if (value === 'visible' || value === 'popup' || value === 'hidden') {
      return value;
    }
    return 'visible';
  }
  isVertexLabelsChecked() { return this.toggleVertexLabels ? this.toggleVertexLabels.checked : this.displayState.showVertexLabels; }
  isCutSurfaceChecked() { return this.toggleCutSurface ? this.toggleCutSurface.checked : this.displayState.showCutSurface; }
  isPyramidChecked() { return this.togglePyramid ? this.togglePyramid.checked : this.displayState.showPyramid; }
  isTransparencyChecked() { return this.toggleCubeTransparency ? this.toggleCubeTransparency.checked : this.displayState.cubeTransparent; }
  isFaceLabelsChecked() { return this.toggleFaceLabels ? this.toggleFaceLabels.checked : this.displayState.showFaceLabels; }
  isCutPointsChecked() { return this.toggleCutPoints ? this.toggleCutPoints.checked : this.displayState.showCutPoints; }
  isCutLineColorChecked() { return this.toggleCutLineColor ? this.toggleCutLineColor.checked : this.displayState.colorizeCutLines; }
  getDisplayState(): DisplayState {
    return {
      showVertexLabels: this.displayState.showVertexLabels,
      showFaceLabels: this.displayState.showFaceLabels,
      edgeLabelMode: this.displayState.edgeLabelMode,
      showCutSurface: this.displayState.showCutSurface,
      showPyramid: this.displayState.showPyramid,
      cubeTransparent: this.displayState.cubeTransparent,
      showCutPoints: this.displayState.showCutPoints,
      colorizeCutLines: this.displayState.colorizeCutLines
    };
  }

  applyDisplayState(display: Partial<DisplayState> = {}) {
    this.displayState = { ...this.displayState, ...display };
    if (display.edgeLabelMode && this.edgeLabelSelect) this.edgeLabelSelect.value = display.edgeLabelMode;
    if (typeof display.showVertexLabels === 'boolean' && this.toggleVertexLabels) this.toggleVertexLabels.checked = display.showVertexLabels;
    if (typeof display.showFaceLabels === 'boolean' && this.toggleFaceLabels) this.toggleFaceLabels.checked = display.showFaceLabels;
    if (typeof display.showCutSurface === 'boolean' && this.toggleCutSurface) this.toggleCutSurface.checked = display.showCutSurface;
    if (typeof display.showPyramid === 'boolean' && this.togglePyramid) this.togglePyramid.checked = display.showPyramid;
    if (typeof display.cubeTransparent === 'boolean' && this.toggleCubeTransparency) this.toggleCubeTransparency.checked = display.cubeTransparent;
    if (typeof display.showCutPoints === 'boolean' && this.toggleCutPoints) this.toggleCutPoints.checked = display.showCutPoints;
    if (typeof display.colorizeCutLines === 'boolean' && this.toggleCutLineColor) this.toggleCutLineColor.checked = display.colorizeCutLines;
  }

  // --- UI Visibility Controls ---
  showPresetControls(visible) {
    if (!this.legacyControlsEnabled) return;
    if (!this.presetControls) return;
    if (visible) this.presetControls.classList.remove('d-none');
    else this.presetControls.classList.add('d-none');
  }
  showSettingsControls(visible) {
    if (!this.legacyControlsEnabled) return;
    if (!this.settingsControls) return;
    if (visible) this.settingsControls.classList.remove('d-none');
    else this.settingsControls.classList.add('d-none');
  }
  showSettingsPanels(visible) {
    if (!this.legacyControlsEnabled) return;
    if (this.settingsPanels) {
      if (visible) this.settingsPanels.classList.remove('d-none');
      else this.settingsPanels.classList.add('d-none');
    }
  }

  showLearningPanels(visible) {
    if (!this.legacyControlsEnabled) return;
    if (!this.learningPanels) return;
    if (visible) this.learningPanels.classList.remove('d-none');
    else this.learningPanels.classList.add('d-none');
  }

  showSettingsPanel(panelName) {
      if (!this.legacyControlsEnabled) return;
      if (this.displaySettingsPanel) this.displaySettingsPanel.classList.add('d-none');
      if (this.cuboidSettingsPanel) this.cuboidSettingsPanel.classList.add('d-none');
      if (this.userPresetsPanel) this.userPresetsPanel.classList.add('d-none');
      if (panelName === 'display') {
          if (this.displaySettingsPanel) {
              this.displaySettingsPanel.classList.remove('d-none');
          }
      } else if (panelName === 'cuboid') {
          if (this.cuboidSettingsPanel) this.cuboidSettingsPanel.classList.remove('d-none');
      } else if (panelName === 'user-presets') {
          if (this.userPresetsPanel) this.userPresetsPanel.classList.remove('d-none');
      }
  }

  filterPresetButtons(category) {
      if (!this.legacyControlsEnabled) return;
      const container = this.presetButtonsContainer;
      if (!container) return;
      const buttons = container.querySelectorAll('button[data-preset]');
      buttons.forEach(btn => {
          const el = btn as HTMLElement;
          el.style.display = (category && el.dataset.category === category) ? '' : 'none';
      });
  }
  
  populatePresets(presets) {
      if (!this.legacyControlsEnabled) return;
      const container = this.presetButtonsContainer;
      if (!container) return;
      presets.forEach(preset => {
          const btn = document.createElement('button');
          btn.textContent = preset.name;
          btn.dataset.preset = preset.name;
          btn.dataset.category = preset.category;
          btn.className = 'btn btn-outline-secondary btn-sm';
          btn.style.display = 'none'; // Initially hidden
          container.appendChild(btn);
      });
  }

  // --- Event Listeners Setup ---
  /** @param {(mode: string) => void} callback */
  onModeChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.modeSelector) return;
      this.modeSelector.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          callback(target.value);
      });
  }
  /** @param {(category: string) => void} callback */
  onPresetCategoryChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.presetCategoryFilter) return;
      this.presetCategoryFilter.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          callback(target.value);
      });
  }
  /** @param {(category: string) => void} callback */
  onSettingsCategoryChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.settingsCategorySelector) return;
      this.settingsCategorySelector.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          callback(target.value);
      });
  }
  /** @param {() => void} callback */
  onSaveUserPresetClick(callback) {
      if (!this.legacyControlsEnabled) return;
      if (this.saveUserPresetBtn) this.saveUserPresetBtn.addEventListener('click', callback);
  }
  /** @param {() => void} callback */
  onCancelUserPresetEdit(callback) {
      if (!this.legacyControlsEnabled) return;
      if (this.cancelUserPresetEditBtn) this.cancelUserPresetEditBtn.addEventListener('click', callback);
  }
  
  /** @param {(presetName: string) => void} callback */
  onPresetChange(callback) {
      if (!this.legacyControlsEnabled) return;
      const container = this.presetButtonsContainer;
      if (!container) return;
      container.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'BUTTON' && target.dataset.preset) {
              const presetName = target.dataset.preset;
              
              const buttons = container.querySelectorAll('button[data-preset]');
              buttons.forEach(b => b.classList.remove('btn-secondary', 'fw-bold'));
              
              target.classList.add('btn-secondary', 'fw-bold');
              callback(presetName);
          }
      });
  }
  
  /** @param {(checked: boolean) => void} callback */
  onFaceLabelChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.toggleFaceLabels) return;
      this.toggleFaceLabels.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); });
  }
  /** @param {(checked: boolean) => void} callback */
  onVertexLabelChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.toggleVertexLabels) return;
      this.toggleVertexLabels.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); });
  }
  onEdgeLabelModeChange(callback: (mode: DisplayState['edgeLabelMode']) => void) {
    if (!this.legacyControlsEnabled) return;
    if (!this.edgeLabelSelect) return;
    this.edgeLabelSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.value !== 'popup') this.hideTooltip();
      callback(this.getEdgeLabelMode());
    });
  }
  /** @param {() => void} callback */
  onToggleNetClick(callback) {
      if (!this.legacyControlsEnabled) return;
      if (this.toggleNetBtn) this.toggleNetBtn.addEventListener('click', callback);
  }
  /** @param {(checked: boolean) => void} callback */
  onCutSurfaceChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.toggleCutSurface) return;
      this.toggleCutSurface.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); });
  }
  /** @param {(checked: boolean) => void} callback */
  onPyramidChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.togglePyramid) return;
      this.togglePyramid.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); });
  }
  /** @param {(checked: boolean) => void} callback */
  onTransparencyChange(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.toggleCubeTransparency) return;
      this.toggleCubeTransparency.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); });
  }
  /** @param {() => void} callback */
  onFlipCutClick(callback) {
      if (!this.legacyControlsEnabled) return;
      if (this.flipCutBtn) this.flipCutBtn.addEventListener('click', callback);
  }
  /** @param {() => void} callback */
  onResetClick(callback) {
      if (!this.legacyControlsEnabled) return;
      if (this.resetBtn) this.resetBtn.onclick = () => { this.hideTooltip(); callback(); };
  }
  /** @param {() => void} callback */
  onConfigureClick(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.configureBtn) return;
      this.configureBtn.onclick = () => { this.hideTooltip(); callback(); };
  }
  onConfigureVertexLabelsClick(callback) {
      if (!this.legacyControlsEnabled) return;
      if (this.configureVertexLabelsBtn) {
          this.configureVertexLabelsBtn.onclick = () => { this.hideTooltip(); callback(); };
      }
  }

  onUserPresetApply(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button[data-user-preset-action="apply"]') as HTMLButtonElement | null;
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  onUserPresetDelete(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button[data-user-preset-action="delete"]') as HTMLButtonElement | null;
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  onUserPresetEdit(callback) {
      if (!this.legacyControlsEnabled) return;
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button[data-user-preset-action="edit"]') as HTMLButtonElement | null;
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  // --- UI State Updates ---
  resetToFreeSelectMode() {
      if (!this.legacyControlsEnabled) return;
      if (this.modeSelector) {
          this.modeSelector.value = 'free';
          this.modeSelector.dispatchEvent(new Event('change', { bubbles: true }));
      }
      this.showPresetControls(false);
      this.showSettingsControls(false);
      this.showSettingsPanels(false);
      
      if (this.presetButtonsContainer) {
          const buttons = this.presetButtonsContainer.querySelectorAll('button[data-preset]');
          buttons.forEach(b => b.classList.remove('btn-secondary', 'fw-bold'));
      }
  }
  
  updateSelectionCount(count) { this.countSpan.textContent = String(count); }

  getUserPresetForm() {
      return {
          name: this.userPresetName ? this.userPresetName.value.trim() : '',
          category: this.userPresetCategory ? this.userPresetCategory.value.trim() : '',
          description: this.userPresetDescription ? this.userPresetDescription.value.trim() : ''
      };
  }

  setUserPresetForm({ name = '', category = '', description = '' } = {}) {
      if (!this.legacyControlsEnabled) return;
      if (this.userPresetName) this.userPresetName.value = name;
      if (this.userPresetCategory) this.userPresetCategory.value = category;
      if (this.userPresetDescription) this.userPresetDescription.value = description;
  }

  setUserPresetEditMode(isEditing) {
      if (!this.legacyControlsEnabled) return;
      if (this.saveUserPresetBtn) {
          this.saveUserPresetBtn.textContent = isEditing ? '更新' : '保存';
      }
      if (this.cancelUserPresetEditBtn) {
          if (isEditing) this.cancelUserPresetEditBtn.classList.remove('d-none');
          else this.cancelUserPresetEditBtn.classList.add('d-none');
      }
  }

  setUserPresetStorageEnabled(enabled) {
      if (!this.legacyControlsEnabled) return;
      if (this.saveUserPresetBtn) this.saveUserPresetBtn.disabled = !enabled;
      if (this.userPresetStorageNote) {
          this.userPresetStorageNote.textContent = enabled ? 'ブラウザに保存します' : '保存機能は利用できません';
      }
  }

  setUserPresetList(items: UserPresetState[] = []) {
      if (!this.legacyControlsEnabled) return;
      if (!this.userPresetList || !this.userPresetEmpty) return;
      this.userPresetList.innerHTML = '';
      if (!items.length) {
          this.userPresetEmpty.classList.remove('d-none');
          return;
      }
      this.userPresetEmpty.classList.add('d-none');
      items.forEach(item => {
          const entry = document.createElement('div');
          entry.className = 'list-group-item d-flex justify-content-between align-items-center';
          const label = document.createElement('div');
          const title = document.createElement('div');
          title.textContent = item.name || 'User Preset';
          title.className = 'fw-semibold';
          const desc = document.createElement('div');
          const meta = [];
          if (item.category) meta.push(item.category);
          if (item.updatedAt) meta.push(`更新: ${item.updatedAt}`);
          desc.textContent = [item.description, meta.join(' / ')].filter(Boolean).join(' ');
          desc.className = 'text-muted small';
          label.appendChild(title);
          if (desc.textContent) label.appendChild(desc);
          const actions = document.createElement('div');
          actions.className = 'd-flex gap-2';
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-outline-secondary btn-sm';
          editBtn.textContent = '編集';
          editBtn.dataset.userPresetAction = 'edit';
          editBtn.dataset.userPresetId = item.id;
          const applyBtn = document.createElement('button');
          applyBtn.className = 'btn btn-outline-primary btn-sm';
          applyBtn.textContent = '適用';
          applyBtn.dataset.userPresetAction = 'apply';
          applyBtn.dataset.userPresetId = item.id;
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-outline-danger btn-sm';
          deleteBtn.textContent = '削除';
          deleteBtn.dataset.userPresetAction = 'delete';
          deleteBtn.dataset.userPresetId = item.id;
          actions.appendChild(editBtn);
          actions.appendChild(applyBtn);
          actions.appendChild(deleteBtn);
          entry.appendChild(label);
          entry.appendChild(actions);
          this.userPresetList.appendChild(entry);
      });
  }

  showMessage(message, type = 'warning', duration = 5000) {
      const alertEl = document.createElement('div');
      alertEl.className = `alert alert-${type} alert-dismissible fade show m-0`;
      alertEl.role = 'alert';
      alertEl.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
      this.alertContainer.appendChild(alertEl);
      if (duration > 0) {
          const bs = /** @type {any} */ (globalThis.bootstrap);
          setTimeout(() => {
              if (!bs || !bs.Alert) return;
              const bsAlert = bs.Alert.getOrCreateInstance(alertEl);
              if (bsAlert) { bsAlert.close(); }
          }, duration);
      }
  }

  setExplanation(text) {
      const setter = /** @type {any} */ (globalThis).__setExplanation;
      if (typeof setter === 'function') {
          setter(text);
          return;
      }
      if (!this.explanationPanel || !this.explanationText) return;
      if (!text) {
          this.explanationText.textContent = '';
          this.explanationPanel.style.display = 'none';
          return;
      }
      this.explanationText.textContent = text;
      this.explanationPanel.style.display = 'block';
  }

  showTooltip(text, x, y) {
    this.tooltip.innerText = text;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 10) + 'px';
    this.tooltip.style.top = (y + 10) + 'px';
  }

  hideTooltip() { this.tooltip.style.display = 'none'; }
}
