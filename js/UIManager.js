export class UIManager {
  constructor(){
    // UI Elements
    // Bootstrap handles the toggle via data-bs-target attributes, so we don't need manual listener for menu.
    // However, we might want to listen to collapse events if we need to do something when it opens/closes.
    
    this.edgeDiv = document.getElementById('edgeLengths');
    this.tooltip = document.getElementById('tooltip');
    
    this.edgeLabelSelect = document.getElementById('edgeLabelMode');
    this.toggleVertexLabels = document.getElementById('toggleVertexLabels');
    this.toggleCutSurface = document.getElementById('toggleCutSurface');
    this.togglePyramid = document.getElementById('togglePyramid');
    this.toggleCubeTransparency = document.getElementById('toggleCubeTransparency');
    this.flipCutBtn = document.getElementById('flipCut');
    this.presetBar = document.getElementById('preset-bar');
    this.presetButtonsContainer = document.getElementById('presetButtons');
    this.toggleNetBtn = document.getElementById('toggleNet');
    this.countSpan = document.getElementById('count');
    this.alertContainer = document.getElementById('alert-container');
  }

  // --- Getters for UI State ---
  getEdgeLabelMode() { return this.edgeLabelSelect.value; }
  isVertexLabelsChecked() { return this.toggleVertexLabels.checked; }
  isCutSurfaceChecked() { return this.toggleCutSurface.checked; }
  isPyramidChecked() { return this.togglePyramid.checked; }
  isTransparencyChecked() { return this.toggleCubeTransparency.checked; }

  populatePresets(names) {
      names.forEach(name => {
          const btn = document.createElement('button');
          btn.textContent = name;
          btn.dataset.preset = name;
          btn.className = 'btn btn-outline-secondary btn-sm'; // Bootstrap classes
          this.presetButtonsContainer.appendChild(btn);
      });
  }

  // --- Event Listeners Setup ---
  onVertexLabelChange(callback) {
    this.toggleVertexLabels.addEventListener('change', (e) => callback(e.target.checked));
  }
  onEdgeLabelModeChange(callback) {
    this.edgeLabelSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode !== 'popup') this.hideTooltip();
      callback(mode);
    });
  }
  onPresetChange(callback) {
      this.presetBar.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' && e.target.dataset.preset) {
              const presetName = e.target.dataset.preset;
              
              // ボタンのアクティブ状態の切り替え
              const buttons = this.presetBar.querySelectorAll('button[data-preset]');
              buttons.forEach(b => {
                  b.classList.remove('btn-secondary', 'fw-bold');
                  b.classList.add('btn-outline-secondary');
              });
              
              e.target.classList.remove('btn-outline-secondary');
              e.target.classList.add('btn-secondary', 'fw-bold');

              callback(presetName);
          }
      });
  }
  onToggleNetClick(callback) {
      if(this.toggleNetBtn) {
          this.toggleNetBtn.addEventListener('click', callback);
      }
  }
  onCutSurfaceChange(callback) {
    this.toggleCutSurface.addEventListener('change', (e) => callback(e.target.checked));
  }
  onPyramidChange(callback) {
    this.togglePyramid.addEventListener('change', (e) => callback(e.target.checked));
  }
  onTransparencyChange(callback) {
    this.toggleCubeTransparency.addEventListener('change', (e) => callback(e.target.checked));
  }
  onFlipCutClick(callback) {
    this.flipCutBtn.addEventListener('click', callback);
  }
  onResetClick(callback) {
      document.getElementById('reset').onclick = () => {
          this.hideTooltip();
          // Reset preset buttons visual state to "Free"
          const buttons = this.presetBar.querySelectorAll('button[data-preset]');
          buttons.forEach(b => {
              b.classList.remove('btn-secondary', 'fw-bold');
              b.classList.add('btn-outline-secondary');
          });
          const freeBtn = this.presetBar.querySelector('[data-preset="free"]');
          if(freeBtn) {
              freeBtn.classList.remove('btn-outline-secondary');
              freeBtn.classList.add('btn-secondary', 'fw-bold');
          }
          
          callback();
      };
  }
  onConfigureClick(callback) {
      document.getElementById('configure').onclick = () => {
          this.hideTooltip();
          // Reset preset buttons visual state
          const buttons = this.presetBar.querySelectorAll('button[data-preset]');
          buttons.forEach(b => {
              b.classList.remove('btn-secondary', 'fw-bold');
              b.classList.add('btn-outline-secondary');
          });
          const freeBtn = this.presetBar.querySelector('[data-preset="free"]');
          if(freeBtn) {
              freeBtn.classList.remove('btn-outline-secondary');
              freeBtn.classList.add('btn-secondary', 'fw-bold');
          }
          callback();
      };
  }

  // --- UI Updates ---
  updateSelectionCount(count) {
    this.countSpan.textContent = count;
  }

  showMessage(message, type = 'warning', duration = 5000) {
      const alertEl = document.createElement('div');
      alertEl.className = `alert alert-${type} alert-dismissible fade show m-0`;
      alertEl.role = 'alert';
      alertEl.innerHTML = `
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      this.alertContainer.appendChild(alertEl);

      if (duration > 0) {
          setTimeout(() => {
              const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
              if (bsAlert) {
                  bsAlert.close();
              }
          }, duration);
      }
  }

  showTooltip(text, x, y) {
    this.tooltip.innerText = text;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 10) + 'px';
    this.tooltip.style.top = (y + 10) + 'px';
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  // --- Legacy / Unused ---
  showCubeEdges(vertices, labels){
    this.edgeDiv.innerHTML='';
  }
  addSelectionEdges(pt,label,vertices,vertexLabels){
  }
  clearSelectionEdges(){
    this.edgeDiv.innerHTML='';
  }
}
