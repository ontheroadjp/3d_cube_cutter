export class UIManager {
  constructor(){
    this.tooltip = document.getElementById('tooltip');
    this.countSpan = document.getElementById('count');
    this.alertContainer = document.getElementById('alert-container');

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

    // --- Display Settings Toggles ---
    this.edgeLabelSelect = document.getElementById('edgeLabelMode');
    this.toggleVertexLabels = document.getElementById('toggleVertexLabels');
    this.toggleCutSurface = document.getElementById('toggleCutSurface');
    this.togglePyramid = document.getElementById('togglePyramid');
    this.toggleCubeTransparency = document.getElementById('toggleCubeTransparency');
    this.toggleFaceLabels = document.getElementById('toggleFaceLabels');

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
      if (panelName === 'display') {
          this.displaySettingsPanel.classList.remove('d-none');
      } else if (panelName === 'cuboid') {
          this.cuboidSettingsPanel.classList.remove('d-none');
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

  showMessage(message, type = 'warning', duration = 5000) {
      const alertEl = document.createElement('div');
      alertEl.className = `alert alert-${type} alert-dismissible fade show m-0`;
      alertEl.role = 'alert';
      alertEl.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
      this.alertContainer.appendChild(alertEl);
      if (duration > 0) { setTimeout(() => { const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl); if (bsAlert) { bsAlert.close(); } }, duration); }
  }

  showTooltip(text, x, y) {
    this.tooltip.innerText = text;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 10) + 'px';
    this.tooltip.style.top = (y + 10) + 'px';
  }

  hideTooltip() { this.tooltip.style.display = 'none'; }
}
