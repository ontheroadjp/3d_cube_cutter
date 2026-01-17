export class UIManager {
  constructor(){
    this.tooltip = document.getElementById('tooltip');
    this.countSpan = document.getElementById('count');
    this.alertContainer = document.getElementById('alert-container');
    this.explanationPanel = document.getElementById('explanation-panel');
    this.explanationText = document.getElementById('explanation-text');

    // --- Mode/Preset/Settings Controls ---
    this.modeSelector = document.getElementById('mode-selector');
    
    this.presetControls = document.getElementById('preset-controls');
    this.presetCategoryFilter = document.getElementById('preset-category-filter');
    this.presetButtonsContainer = document.getElementById('presetButtons');
    
    this.settingsControls = document.getElementById('settings-controls');
    this.settingsCategorySelector = document.getElementById('settings-category-selector');
    
    this.settingsPanels = document.getElementById('settings-panels');
    this.displaySettingsPanel = document.getElementById('display-settings-panel');
    this.cuboidSettingsPanel = document.getElementById('cuboid-settings-panel');
    this.userPresetsPanel = document.getElementById('user-presets-panel');
    this.saveUserPresetBtn = document.getElementById('saveUserPreset');
    this.cancelUserPresetEditBtn = document.getElementById('cancelUserPresetEdit');
    this.userPresetList = document.getElementById('userPresetList');
    this.userPresetEmpty = document.getElementById('userPresetEmpty');
    this.userPresetName = document.getElementById('userPresetName');
    this.userPresetCategory = document.getElementById('userPresetCategory');
    this.userPresetDescription = document.getElementById('userPresetDescription');
    this.userPresetStorageNote = document.getElementById('userPresetStorageNote');

    // --- Display Settings Toggles ---
    this.edgeLabelSelect = document.getElementById('edgeLabelMode');
    this.toggleVertexLabels = document.getElementById('toggleVertexLabels');
    this.toggleCutSurface = document.getElementById('toggleCutSurface');
    this.togglePyramid = document.getElementById('togglePyramid');
    this.toggleCubeTransparency = document.getElementById('toggleCubeTransparency');
    this.toggleFaceLabels = document.getElementById('toggleFaceLabels');
    this.configureVertexLabelsBtn = document.getElementById('configureVertexLabels');

    // --- Action Buttons ---
    this.flipCutBtn = document.getElementById('flipCut');
    this.toggleNetBtn = document.getElementById('toggleNet');
    this.resetBtn = document.getElementById('reset');
    this.configureBtn = document.getElementById('configure');
  }

  // --- Getters for UI State ---
  getEdgeLabelMode() { return this.edgeLabelSelect.value; }
  isVertexLabelsChecked() { return this.toggleVertexLabels.checked; }
  isCutSurfaceChecked() { return this.toggleCutSurface.checked; }
  isPyramidChecked() { return this.togglePyramid.checked; }
  isTransparencyChecked() { return this.toggleCubeTransparency.checked; }
  isFaceLabelsChecked() { return this.toggleFaceLabels.checked; }
  getDisplayState() {
    return {
      showVertexLabels: this.isVertexLabelsChecked(),
      showFaceLabels: this.isFaceLabelsChecked(),
      edgeLabelMode: this.getEdgeLabelMode(),
      showCutSurface: this.isCutSurfaceChecked(),
      showPyramid: this.isPyramidChecked(),
      cubeTransparent: this.isTransparencyChecked()
    };
  }

  applyDisplayState(display = {}) {
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
  }

  showSettingsPanel(panelName) {
      this.displaySettingsPanel.classList.add('d-none');
      this.cuboidSettingsPanel.classList.add('d-none');
      this.userPresetsPanel.classList.add('d-none');
      if (panelName === 'display') {
          this.displaySettingsPanel.classList.remove('d-none');
      } else if (panelName === 'cuboid') {
          this.cuboidSettingsPanel.classList.remove('d-none');
      } else if (panelName === 'user-presets') {
          this.userPresetsPanel.classList.remove('d-none');
      }
  }

  filterPresetButtons(category) {
      const buttons = this.presetButtonsContainer.querySelectorAll('button[data-preset]');
      buttons.forEach(btn => {
          btn.style.display = (category && btn.dataset.category === category) ? '' : 'none';
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
  onModeChange(callback) { this.modeSelector.addEventListener('change', (e) => callback(e.target.value)); }
  onPresetCategoryChange(callback) { this.presetCategoryFilter.addEventListener('change', (e) => callback(e.target.value)); }
  onSettingsCategoryChange(callback) { this.settingsCategorySelector.addEventListener('change', (e) => callback(e.target.value)); }
  onSaveUserPresetClick(callback) { if (this.saveUserPresetBtn) this.saveUserPresetBtn.addEventListener('click', callback); }
  onCancelUserPresetEdit(callback) { if (this.cancelUserPresetEditBtn) this.cancelUserPresetEditBtn.addEventListener('click', callback); }
  
  onPresetChange(callback) {
      this.presetButtonsContainer.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' && e.target.dataset.preset) {
              const presetName = e.target.dataset.preset;
              
              const buttons = this.presetButtonsContainer.querySelectorAll('button[data-preset]');
              buttons.forEach(b => b.classList.remove('btn-secondary', 'fw-bold'));
              
              e.target.classList.add('btn-secondary', 'fw-bold');
              callback(presetName);
          }
      });
  }
  
  onFaceLabelChange(callback) { this.toggleFaceLabels.addEventListener('change', (e) => callback(e.target.checked)); }
  onVertexLabelChange(callback) { this.toggleVertexLabels.addEventListener('change', (e) => callback(e.target.checked)); }
  onEdgeLabelModeChange(callback) { this.edgeLabelSelect.addEventListener('change', (e) => { if (e.target.value !== 'popup') this.hideTooltip(); callback(e.target.value); }); }
  onToggleNetClick(callback) { this.toggleNetBtn.addEventListener('click', callback); }
  onCutSurfaceChange(callback) { this.toggleCutSurface.addEventListener('change', (e) => callback(e.target.checked)); }
  onPyramidChange(callback) { this.togglePyramid.addEventListener('change', (e) => callback(e.target.checked)); }
  onTransparencyChange(callback) { this.toggleCubeTransparency.addEventListener('change', (e) => callback(e.target.checked)); }
  onFlipCutClick(callback) { this.flipCutBtn.addEventListener('click', callback); }
  onResetClick(callback) { this.resetBtn.onclick = () => { this.hideTooltip(); callback(); }; }
  onConfigureClick(callback) { this.configureBtn.onclick = () => { this.hideTooltip(); callback(); }; }
  onConfigureVertexLabelsClick(callback) {
      if (this.configureVertexLabelsBtn) {
          this.configureVertexLabelsBtn.onclick = () => { this.hideTooltip(); callback(); };
      }
  }

  onUserPresetApply(callback) {
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-user-preset-action="apply"]');
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  onUserPresetDelete(callback) {
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-user-preset-action="delete"]');
          if (!btn) return;
          callback(btn.dataset.userPresetId);
      });
  }

  onUserPresetEdit(callback) {
      if (!this.userPresetList) return;
      this.userPresetList.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-user-preset-action="edit"]');
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
  
  updateSelectionCount(count) { this.countSpan.textContent = count; }

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

  setUserPresetList(items = []) {
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
      if (duration > 0) { setTimeout(() => { const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl); if (bsAlert) { bsAlert.close(); } }, duration); }
  }

  setExplanation(text) {
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
