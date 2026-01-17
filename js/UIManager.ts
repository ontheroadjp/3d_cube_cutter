import type { DisplayState, UserPresetState } from './types.js';

export class UIManager {
  tooltip: HTMLElement;
  countSpan: HTMLElement;
  alertContainer: HTMLElement;
  explanationPanel: HTMLElement | null;
  explanationText: HTMLElement | null;
  modeSelector: HTMLSelectElement;
  presetControls: HTMLElement;
  presetCategoryFilter: HTMLSelectElement;
  presetButtonsContainer: HTMLElement;
  settingsControls: HTMLElement;
  settingsCategorySelector: HTMLSelectElement;
  settingsPanels: HTMLElement;
  displaySettingsPanel: HTMLElement;
  cuboidSettingsPanel: HTMLElement;
  userPresetsPanel: HTMLElement;
  saveUserPresetBtn: HTMLButtonElement | null;
  cancelUserPresetEditBtn: HTMLButtonElement | null;
  userPresetList: HTMLElement | null;
  userPresetEmpty: HTMLElement | null;
  userPresetName: HTMLInputElement | null;
  userPresetCategory: HTMLInputElement | null;
  userPresetDescription: HTMLInputElement | null;
  userPresetStorageNote: HTMLElement | null;
  edgeLabelSelect: HTMLSelectElement;
  toggleVertexLabels: HTMLInputElement;
  toggleCutSurface: HTMLInputElement;
  togglePyramid: HTMLInputElement;
  toggleCubeTransparency: HTMLInputElement;
  toggleFaceLabels: HTMLInputElement;
  configureVertexLabelsBtn: HTMLButtonElement | null;
  flipCutBtn: HTMLButtonElement;
  toggleNetBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  configureBtn: HTMLButtonElement | null;

  constructor(){
    this.tooltip = document.getElementById('tooltip') as HTMLElement;
    this.countSpan = document.getElementById('count') as HTMLElement;
    this.alertContainer = document.getElementById('alert-container') as HTMLElement;
    this.explanationPanel = document.getElementById('explanation-panel');
    this.explanationText = document.getElementById('explanation-text');

    // --- Mode/Preset/Settings Controls ---
    this.modeSelector = document.getElementById('mode-selector') as HTMLSelectElement;
    
    this.presetControls = document.getElementById('preset-controls') as HTMLElement;
    this.presetCategoryFilter = document.getElementById('preset-category-filter') as HTMLSelectElement;
    this.presetButtonsContainer = document.getElementById('presetButtons') as HTMLElement;
    
    this.settingsControls = document.getElementById('settings-controls') as HTMLElement;
    this.settingsCategorySelector = document.getElementById('settings-category-selector') as HTMLSelectElement;
    
    this.settingsPanels = document.getElementById('settings-panels') as HTMLElement;
    this.displaySettingsPanel = document.getElementById('display-settings-panel') as HTMLElement;
    this.cuboidSettingsPanel = document.getElementById('cuboid-settings-panel') as HTMLElement;
    this.userPresetsPanel = document.getElementById('user-presets-panel') as HTMLElement;
    this.saveUserPresetBtn = document.getElementById('saveUserPreset') as HTMLButtonElement | null;
    this.cancelUserPresetEditBtn = document.getElementById('cancelUserPresetEdit') as HTMLButtonElement | null;
    this.userPresetList = document.getElementById('userPresetList');
    this.userPresetEmpty = document.getElementById('userPresetEmpty');
    this.userPresetName = document.getElementById('userPresetName') as HTMLInputElement | null;
    this.userPresetCategory = document.getElementById('userPresetCategory') as HTMLInputElement | null;
    this.userPresetDescription = document.getElementById('userPresetDescription') as HTMLInputElement | null;
    this.userPresetStorageNote = document.getElementById('userPresetStorageNote');

    // --- Display Settings Toggles ---
    this.edgeLabelSelect = document.getElementById('edgeLabelMode') as HTMLSelectElement;
    this.toggleVertexLabels = document.getElementById('toggleVertexLabels') as HTMLInputElement;
    this.toggleCutSurface = document.getElementById('toggleCutSurface') as HTMLInputElement;
    this.togglePyramid = document.getElementById('togglePyramid') as HTMLInputElement;
    this.toggleCubeTransparency = document.getElementById('toggleCubeTransparency') as HTMLInputElement;
    this.toggleFaceLabels = document.getElementById('toggleFaceLabels') as HTMLInputElement;
    this.configureVertexLabelsBtn = document.getElementById('configureVertexLabels') as HTMLButtonElement | null;

    // --- Action Buttons ---
    this.flipCutBtn = document.getElementById('flipCut') as HTMLButtonElement;
    this.toggleNetBtn = document.getElementById('toggleNet') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset') as HTMLButtonElement;
    this.configureBtn = document.getElementById('configure') as HTMLButtonElement | null;
  }

  // --- Getters for UI State ---
  getEdgeLabelMode(): DisplayState['edgeLabelMode'] {
    const value = this.edgeLabelSelect.value;
    if (value === 'visible' || value === 'popup' || value === 'hidden') {
      return value;
    }
    return 'visible';
  }
  isVertexLabelsChecked() { return this.toggleVertexLabels.checked; }
  isCutSurfaceChecked() { return this.toggleCutSurface.checked; }
  isPyramidChecked() { return this.togglePyramid.checked; }
  isTransparencyChecked() { return this.toggleCubeTransparency.checked; }
  isFaceLabelsChecked() { return this.toggleFaceLabels.checked; }
  getDisplayState(): DisplayState {
    return {
      showVertexLabels: this.isVertexLabelsChecked(),
      showFaceLabels: this.isFaceLabelsChecked(),
      edgeLabelMode: this.getEdgeLabelMode(),
      showCutSurface: this.isCutSurfaceChecked(),
      showPyramid: this.isPyramidChecked(),
      cubeTransparent: this.isTransparencyChecked()
    };
  }

  applyDisplayState(display: Partial<DisplayState> = {}) {
    if (display.edgeLabelMode) this.edgeLabelSelect.value = display.edgeLabelMode;
    if (typeof display.showVertexLabels === 'boolean') this.toggleVertexLabels.checked = display.showVertexLabels;
    if (typeof display.showFaceLabels === 'boolean') this.toggleFaceLabels.checked = display.showFaceLabels;
    if (typeof display.showCutSurface === 'boolean') this.toggleCutSurface.checked = display.showCutSurface;
    if (typeof display.showPyramid === 'boolean') this.togglePyramid.checked = display.showPyramid;
    if (typeof display.cubeTransparent === 'boolean') this.toggleCubeTransparency.checked = display.cubeTransparent;
  }

  // --- UI Visibility Controls ---
  showPresetControls(visible) {
    if (visible) this.presetControls.classList.remove('d-none');
    else this.presetControls.classList.add('d-none');
  }
  showSettingsControls(visible) {
    if (visible) this.settingsControls.classList.remove('d-none');
    else this.settingsControls.classList.add('d-none');
  }
  showSettingsPanels(visible) {
    if (visible) this.settingsPanels.classList.remove('d-none');
    else this.settingsPanels.classList.add('d-none');
    if (!visible) {
      const reactToggle = /** @type {any} */ (globalThis).__setReactSettingsVisible;
      if (typeof reactToggle === 'function') reactToggle(false);
    }
  }

  showSettingsPanel(panelName) {
      this.displaySettingsPanel.classList.add('d-none');
      this.cuboidSettingsPanel.classList.add('d-none');
      this.userPresetsPanel.classList.add('d-none');
      const reactToggle = /** @type {any} */ (globalThis).__setReactSettingsVisible;
      const hasReactSettings = typeof reactToggle === 'function';
      if (hasReactSettings) {
          reactToggle(panelName === 'display');
      }
      if (panelName === 'display') {
          if (!hasReactSettings) {
              this.displaySettingsPanel.classList.remove('d-none');
          }
      } else if (panelName === 'cuboid') {
          this.cuboidSettingsPanel.classList.remove('d-none');
      } else if (panelName === 'user-presets') {
          this.userPresetsPanel.classList.remove('d-none');
      }
  }

  filterPresetButtons(category) {
      const buttons = this.presetButtonsContainer.querySelectorAll('button[data-preset]');
      buttons.forEach(btn => {
          const el = btn as HTMLElement;
          el.style.display = (category && el.dataset.category === category) ? '' : 'none';
      });
  }
  
  populatePresets(presets) {
      presets.forEach(preset => {
          const btn = document.createElement('button');
          btn.textContent = preset.name;
          btn.dataset.preset = preset.name;
          btn.dataset.category = preset.category;
          btn.className = 'btn btn-outline-secondary btn-sm';
          btn.style.display = 'none'; // Initially hidden
          this.presetButtonsContainer.appendChild(btn);
      });
  }

  // --- Event Listeners Setup ---
  /** @param {(mode: string) => void} callback */
  onModeChange(callback) {
      this.modeSelector.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          callback(target.value);
      });
  }
  /** @param {(category: string) => void} callback */
  onPresetCategoryChange(callback) {
      this.presetCategoryFilter.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          callback(target.value);
      });
  }
  /** @param {(category: string) => void} callback */
  onSettingsCategoryChange(callback) {
      this.settingsCategorySelector.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          callback(target.value);
      });
  }
  /** @param {() => void} callback */
  onSaveUserPresetClick(callback) { if (this.saveUserPresetBtn) this.saveUserPresetBtn.addEventListener('click', callback); }
  /** @param {() => void} callback */
  onCancelUserPresetEdit(callback) { if (this.cancelUserPresetEditBtn) this.cancelUserPresetEditBtn.addEventListener('click', callback); }
  
  /** @param {(presetName: string) => void} callback */
  onPresetChange(callback) {
      this.presetButtonsContainer.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'BUTTON' && target.dataset.preset) {
              const presetName = target.dataset.preset;
              
              const buttons = this.presetButtonsContainer.querySelectorAll('button[data-preset]');
              buttons.forEach(b => b.classList.remove('btn-secondary', 'fw-bold'));
              
              target.classList.add('btn-secondary', 'fw-bold');
              callback(presetName);
          }
      });
  }
  
  /** @param {(checked: boolean) => void} callback */
  onFaceLabelChange(callback) { this.toggleFaceLabels.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); }); }
  /** @param {(checked: boolean) => void} callback */
  onVertexLabelChange(callback) { this.toggleVertexLabels.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); }); }
  onEdgeLabelModeChange(callback: (mode: DisplayState['edgeLabelMode']) => void) {
    this.edgeLabelSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.value !== 'popup') this.hideTooltip();
      callback(this.getEdgeLabelMode());
    });
  }
  /** @param {() => void} callback */
  onToggleNetClick(callback) { this.toggleNetBtn.addEventListener('click', callback); }
  /** @param {(checked: boolean) => void} callback */
  onCutSurfaceChange(callback) { this.toggleCutSurface.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); }); }
  /** @param {(checked: boolean) => void} callback */
  onPyramidChange(callback) { this.togglePyramid.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); }); }
  /** @param {(checked: boolean) => void} callback */
  onTransparencyChange(callback) { this.toggleCubeTransparency.addEventListener('change', (e) => { const target = e.target as HTMLInputElement; callback(target.checked); }); }
  /** @param {() => void} callback */
  onFlipCutClick(callback) { this.flipCutBtn.addEventListener('click', callback); }
  /** @param {() => void} callback */
  onResetClick(callback) { this.resetBtn.onclick = () => { this.hideTooltip(); callback(); }; }
  /** @param {() => void} callback */
  onConfigureClick(callback) {
      if (!this.configureBtn) return;
      this.configureBtn.onclick = () => { this.hideTooltip(); callback(); };
  }
  onConfigureVertexLabelsClick(callback) {
      if (this.configureVertexLabelsBtn) {
          this.configureVertexLabelsBtn.onclick = () => { this.hideTooltip(); callback(); };
      }
  }

  onUserPresetApply(callback) {
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button[data-user-preset-action="apply"]') as HTMLButtonElement | null;
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  onUserPresetDelete(callback) {
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button[data-user-preset-action="delete"]') as HTMLButtonElement | null;
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  onUserPresetEdit(callback) {
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
      this.modeSelector.value = 'free';
      this.showPresetControls(false);
      this.showSettingsControls(false);
      this.showSettingsPanels(false);
      
      const buttons = this.presetButtonsContainer.querySelectorAll('button[data-preset]');
      buttons.forEach(b => b.classList.remove('btn-secondary', 'fw-bold'));
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
      if (this.userPresetName) this.userPresetName.value = name;
      if (this.userPresetCategory) this.userPresetCategory.value = category;
      if (this.userPresetDescription) this.userPresetDescription.value = description;
  }

  setUserPresetEditMode(isEditing) {
      if (this.saveUserPresetBtn) {
          this.saveUserPresetBtn.textContent = isEditing ? '更新' : '保存';
      }
      if (this.cancelUserPresetEditBtn) {
          if (isEditing) this.cancelUserPresetEditBtn.classList.remove('d-none');
          else this.cancelUserPresetEditBtn.classList.add('d-none');
      }
  }

  setUserPresetStorageEnabled(enabled) {
      if (this.saveUserPresetBtn) this.saveUserPresetBtn.disabled = !enabled;
      if (this.userPresetStorageNote) {
          this.userPresetStorageNote.textContent = enabled ? 'ブラウザに保存します' : '保存機能は利用できません';
      }
  }

  setUserPresetList(items: UserPresetState[] = []) {
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
