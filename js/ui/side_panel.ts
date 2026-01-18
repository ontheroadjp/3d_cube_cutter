import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { DisplayState, LearningProblem, UserPresetState, Preset, UserPresetForm } from '../types.js';

// --- Global Engine Type (from main.ts) ---
type Engine = {
  getDisplayState?: () => DisplayState;
  setDisplayState?: (display: DisplayState) => void;
  getPresets?: () => Preset[];
  applyPreset?: (name: string) => void;
  setMode?: (mode: string) => void;
  setSettingsCategory?: (category: string) => void;
  flipCut?: () => void;
  toggleNet?: () => void;
  resetScene?: () => void;
  applyLearningProblem?: (problem: LearningProblem | string[]) => void;
  previewLearningProblem?: (problem: LearningProblem | string[]) => void;
  startLearningSolution?: (problem: LearningProblem | string[]) => { totalSteps: number } | void;
  advanceLearningStep?: () => Promise<{ done?: boolean; stepIndex?: number; totalSteps?: number; instruction?: string; reason?: string } | void> | void;
  getUserPresetForm?: () => UserPresetForm;
  listUserPresets?: () => UserPresetState[];
  isUserPresetStorageEnabled?: () => boolean;
  saveUserPreset?: (form: UserPresetForm) => Promise<void> | void;
  cancelUserPresetEdit?: () => void;
  applyUserPreset?: (id: string) => void;
  editUserPreset?: (id: string) => void;
  deleteUserPreset?: (id: string) => void;
  configureVertexLabels?: (labels: string[]) => void;
  getVertexLabelMap?: () => Record<string, string> | null;
  configureCube?: (lx: number, ly: number, lz: number) => void;
  getCubeSize?: () => { lx: number; ly: number; lz: number };
};

// Removed duplicate declare global for __engine
// declare global {
//   var __engine: Engine | undefined;
//   var __setReactSettingsVisible: ((visible: boolean) => void) | undefined;
//   var __setReactMode: ((mode: string) => void) | undefined;
//   var __setDisplayState: ((display: DisplayState | null) => void) | undefined;
// }

// The reactApp.ts still needs to define the global for __engine
// but other __setReact* global declarations are specific to side_panel.ts
declare global {
  var __setReactMode: ((mode: string) => void) | undefined;
  var __setDisplayState: ((display: DisplayState | null) => void) | undefined;
}

// --- SidePanel Component ---
export function SidePanel() {
  const [currentMode, setCurrentMode] = useState<string>('free'); // 'free', 'preset', 'learning', 'settings'
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<string>('display'); // 'display', 'cuboid', 'user-presets'

  useEffect(() => {
    // Register global function to allow main.ts to update the mode
    globalThis.__setReactMode = (mode: string) => {
      setCurrentMode(mode);
      if (mode === 'settings') {
        // When entering settings mode, default to display settings
        setActiveSettingsPanel('display');
      }
    };
    return () => {
      if (globalThis.__setReactMode) delete globalThis.__setReactMode;
    };
  }, []);

  const handleModeChange = (mode: string) => {
    setCurrentMode(mode);
    if (globalThis.__engine && typeof globalThis.__engine.setMode === 'function') {
      globalThis.__engine.setMode(mode);
    }
  };

  const handleSettingsPanelChange = (panel: string) => {
    setActiveSettingsPanel(panel);
    // Potentially inform main.ts about settings category change if needed for legacy UIManager
    if (globalThis.__engine && typeof globalThis.__engine.setSettingsCategory === 'function') {
        globalThis.__engine.setSettingsCategory(panel);
    }
  };

  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: '60px', // Narrow sidebar
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '1rem',
        borderRight: '1px solid var(--ui-border)'
      }
    },
    // Mode selection icons
    React.createElement(
      'div',
      { className: 'd-flex flex-column gap-3 mb-4' },
      React.createElement(ModeButton, {
        mode: 'free',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'pencil' // Placeholder icon
      }),
      React.createElement(ModeButton, {
        mode: 'preset',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'star' // Placeholder icon
      }),
      React.createElement(ModeButton, {
        mode: 'learning',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'hat-wizard' // Placeholder icon
      }),
      React.createElement(ModeButton, {
        mode: 'settings',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'gear' // Placeholder icon
      })
    ),

    // Action buttons
    React.createElement(
      'div',
      { className: 'd-flex flex-column gap-3 mt-auto' }, // mt-auto pushes these to the bottom
      React.createElement(ActionButton, {
        onClick: () => globalThis.__engine?.flipCut?.(),
        icon: 'arrow-repeat', // 切り取り反転アイコン
        title: '切り取り反転',
        className: 'btn-warning'
      }),
      React.createElement(ActionButton, {
        onClick: () => globalThis.__engine?.toggleNet?.(),
        icon: 'bounding-box', // 展開図アイコン
        title: '展開図',
        className: 'btn-primary'
      }),
      React.createElement(ActionButton, {
        onClick: () => globalThis.__engine?.resetScene?.(),
        icon: 'arrow-counterclockwise', // リセットアイコン
        title: 'リセット',
        className: 'btn-outline-danger'
      })
    ),

    // Content Panel (placeholder for now)
    currentMode !== 'free' && React.createElement(
        'div',
        {
            style: {
                position: 'fixed',
                top: 0,
                left: '60px', // To the right of the sidebar
                height: '100%',
                width: '320px', // Width of the content panel
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
                zIndex: 999,
                padding: '1rem',
                borderRight: '1px solid var(--ui-border)',
                overflowY: 'auto'
            }
        },
        currentMode === 'preset' && React.createElement(PresetContent, { currentMode: currentMode }),
        currentMode === 'learning' && React.createElement(LearningContent, { currentMode: currentMode }),
        currentMode === 'settings' && React.createElement(SettingsContent, {
            activePanel: activeSettingsPanel,
            onPanelChange: handleSettingsPanelChange
        }),
    )
  );
}

// --- ModeButton Component ---
function ModeButton({ mode, currentMode, onClick, icon }) {
  const isActive = mode === currentMode;
  return React.createElement(
    'button',
    {
      className: `btn btn-lg ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`,
      onClick: () => onClick(mode),
      title: mode.charAt(0).toUpperCase() + mode.slice(1) // Capitalize first letter for title
    },
    React.createElement('i', { className: `bi bi-${icon}` }) // Bootstrap Icons placeholder
  );
}

// --- ActionButton Component ---
function ActionButton({ onClick, icon, title, className = 'btn-outline-secondary' }) {
  return React.createElement(
    'button',
    {
      className: `btn btn-lg ${className}`,
      onClick: onClick,
      title: title
    },
    React.createElement('i', { className: `bi bi-${icon}` })
  );
}

// --- Content Components (placeholders) ---
function PresetContent({ currentMode }) {
  // Logic for preset selection
  const [presets, setPresets] = useState<Preset[]>([]);
  const [category, setCategory] = useState<string>('triangle'); // Default category

  useEffect(() => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.getPresets === 'function') {
      setPresets(engine.getPresets() || []);
    }
  }, []);

  const filteredPresets = category
    ? presets.filter(preset => preset.category === category)
    : presets;

  const applyPreset = (name: string) => {
    if (globalThis.__engine && typeof globalThis.__engine.applyPreset === 'function') {
      globalThis.__engine.applyPreset(name);
    }
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('h5', { className: 'mb-3' }, 'プリセットモード'),
    React.createElement('div', { className: 'mb-3' },
      React.createElement('label', { className: 'form-label small mb-1' }, 'カテゴリ'),
      React.createElement('select', {
        className: 'form-select form-select-sm',
        value: category,
        onChange: (e) => setCategory(e.target.value)
      },
        React.createElement('option', { value: 'triangle' }, '三角形'),
        React.createElement('option', { value: 'quad' }, '四角形'),
        React.createElement('option', { value: 'poly' }, '多角形')
      )
    ),
    React.createElement('div', { className: 'd-flex flex-wrap gap-2' },
      filteredPresets.map(preset => (
        React.createElement('button', {
          key: preset.name,
          className: 'btn btn-outline-secondary btn-sm',
          onClick: () => applyPreset(preset.name)
        }, preset.name)
      ))
    )
  );
}

function LearningContent({ currentMode }) {
  // Logic for learning problems
  return React.createElement(
    'div',
    null,
    React.createElement('h5', { className: 'mb-3' }, '学習モード'),
    React.createElement('p', null, '学習コンテンツはここに表示されます。')
  );
}

function SettingsContent({ activePanel, onPanelChange }) {
  return React.createElement(
    'div',
    null,
    React.createElement('h5', { className: 'mb-3' }, '設定'),
    React.createElement('div', { className: 'btn-group d-flex mb-3', role: 'group' },
      React.createElement('button', {
        type: 'button',
        className: `btn btn-outline-secondary btn-sm ${activePanel === 'display' ? 'active' : ''}`,
        onClick: () => onPanelChange('display')
      }, '表示'),
      React.createElement('button', {
        type: 'button',
        className: `btn btn-outline-secondary btn-sm ${activePanel === 'cuboid' ? 'active' : ''}`,
        onClick: () => onPanelChange('cuboid')
      }, '立体図形'),
      React.createElement('button', {
        type: 'button',
        className: `btn btn-outline-secondary btn-sm ${activePanel === 'user-presets' ? 'active' : ''}`,
        onClick: () => onPanelChange('user-presets')
      }, 'ユーザープリセット')
    ),
    activePanel === 'display' && React.createElement(DisplaySettingsPanel, null),
    activePanel === 'cuboid' && React.createElement(CuboidSettingsPanel, null),
    activePanel === 'user-presets' && React.createElement(UserPresetsSettingsPanel, null)
  );
}

function DisplaySettingsPanel() {
  const [display, setDisplay] = useState<DisplayState | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    if (globalThis.__engine && typeof globalThis.__engine.getDisplayState === 'function') {
      setDisplay(globalThis.__engine.getDisplayState());
    }
    globalThis.__setDisplayState = (next) => {
      setDisplay(next || null);
    };
    return () => {
      if (globalThis.__setDisplayState) delete globalThis.__setDisplayState;
    };
  }, []);

  const updateDisplayState = (patch: Partial<DisplayState>) => {
    if (!display) return;
    const next = { ...display, ...patch };
    setDisplay(next);
    if (globalThis.__engine && typeof globalThis.__engine.setDisplayState === 'function') {
      globalThis.__engine.setDisplayState(next);
    }
  };

  if (!display) return null;

  return React.createElement(
    'div',
    null,
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.showVertexLabels,
        onChange: (e) => updateDisplayState({ showVertexLabels: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '頂点ラベルを表示')
    ),
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.showCutSurface,
        onChange: (e) => updateDisplayState({ showCutSurface: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '切断面を表示')
    ),
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.showPyramid,
        onChange: (e) => updateDisplayState({ showPyramid: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '切り取られた部分を表示')
    ),
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.cubeTransparent,
        onChange: (e) => updateDisplayState({ cubeTransparent: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '直方体を半透明')
    ),
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.showFaceLabels,
        onChange: (e) => updateDisplayState({ showFaceLabels: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '面ラベルを表示')
    ),
    React.createElement('div', { className: 'mb-3' },
        React.createElement('label', { className: 'form-label small mb-1' }, '辺の長さ'),
        React.createElement('select', {
          className: 'form-select form-select-sm',
          value: display.edgeLabelMode || 'visible',
          onChange: (e) => updateDisplayState({ edgeLabelMode: e.target.value as DisplayState['edgeLabelMode'] })
        },
          React.createElement('option', { value: 'visible' }, '常に表示'),
          React.createElement('option', { value: 'popup' }, 'ポップアップ'),
          React.createElement('option', { value: 'hidden' }, '表示しない')
        )
      ),
    React.createElement('button', {
      className: 'btn btn-outline-secondary btn-sm mt-3',
      onClick: () => setShowModal(true)
    }, '頂点ラベルを設定...'),
    React.createElement(VertexLabelModal, { show: showModal, onClose: () => setShowModal(false) })
  );
}

// --- VertexLabelModal Component ---
export function VertexLabelModal({ show, onClose }) {
  const defaultLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const [labels, setLabels] = useState<string[]>(defaultLabels);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (show) {
      if (globalThis.__engine && typeof globalThis.__engine.getVertexLabelMap === 'function') {
        const labelMap = globalThis.__engine.getVertexLabelMap();
        if (labelMap) {
          const currentLabels = Array(8).fill('').map((_, i) => labelMap[`V:${i}`] || defaultLabels[i]);
          setLabels(currentLabels);
        } else {
          setLabels(defaultLabels);
        }
      } else {
        setLabels(defaultLabels);
      }
      setErrorMessage('');
    }
  }, [show]);

  const handleLabelChange = (index: number, value: string) => {
    const newLabels = [...labels];
    newLabels[index] = value;
    setLabels(newLabels);
  };

  const handleSave = () => {
    if (labels.length !== 8) {
      setErrorMessage("頂点ラベルは8個必要です。");
      return;
    }
    const unique = new Set(labels);
    if (unique.size !== labels.length) {
      setErrorMessage("頂点ラベルは重複できません。", "warning");
      return;
    }
    if (globalThis.__engine && typeof globalThis.__engine.configureVertexLabels === 'function') {
      globalThis.__engine.configureVertexLabels(labels);
      onClose();
    }
  };

  return React.createElement(
    'div',
    {
      className: `modal fade ${show ? 'show d-block' : ''}`,
      tabIndex: -1,
      style: { backgroundColor: show ? 'rgba(0,0,0,0.5)' : 'transparent' }
    },
    React.createElement(
      'div',
      { className: 'modal-dialog modal-dialog-centered' },
      React.createElement(
        'div',
        { className: 'modal-content' },
        React.createElement(
          'div',
          { className: 'modal-header' },
          React.createElement('h5', { className: 'modal-title' }, '頂点ラベル設定'),
          React.createElement('button', { type: 'button', className: 'btn-close', onClick: onClose })
        ),
        React.createElement(
          'div',
          { className: 'modal-body' },
          errorMessage && React.createElement(
            'div', { className: 'alert alert-danger', role: 'alert' }, errorMessage
          ),
          React.createElement('p', null, '各頂点のラベルを編集してください (8個必須、重複不可)。'),
          React.createElement(
            'div',
            { className: 'row row-cols-4 g-2' },
            labels.map((label, index) =>
              React.createElement(
                'div',
                { className: 'col', key: index },
                React.createElement('input', {
                  type: 'text',
                  className: 'form-control form-control-sm text-center',
                  maxLength: 1, // 1文字制限
                  value: label,
                  onChange: (e) => handleLabelChange(index, e.target.value.toUpperCase()) // 大文字に変換
                })
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'modal-footer' },
          React.createElement('button', { type: 'button', className: 'btn btn-secondary', onClick: onClose }, 'キャンセル'),
          React.createElement('button', { type: 'button', className: 'btn btn-primary', onClick: handleSave }, '保存')
        )
      )
    )
  );
}


export function CuboidSettingsPanel() {
  const [lx, setLx] = useState<number>(10);
  const [ly, setLy] = useState<number>(10);
  const [lz, setLz] = useState<number>(10);

  useEffect(() => {
    if (globalThis.__engine && typeof globalThis.__engine.getCubeSize === 'function') {
        const size = globalThis.__engine.getCubeSize();
        setLx(size.lx);
        setLy(size.ly);
        setLz(size.lz);
    }
  }, []);

  const handleSubmit = () => {
    if (globalThis.__engine && typeof globalThis.__engine.configureCube === 'function') {
        globalThis.__engine.configureCube(lx, ly, lz);
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement('p', { className: 'small text-muted' }, '新しいサイズを入力して、立体図形を再作成します。'),
    React.createElement('div', { className: 'mb-2' },
      React.createElement('label', { className: 'form-label small mb-1' }, '幅 (Lx)'),
      React.createElement('input', {
        type: 'number', className: 'form-control form-control-sm',
        value: lx,
        onChange: (e) => setLx(parseFloat(e.target.value))
      })
    ),
    React.createElement('div', { className: 'mb-2' },
      React.createElement('label', { className: 'form-label small mb-1' }, '奥行き (Ly)'),
      React.createElement('input', {
        type: 'number', className: 'form-control form-control-sm',
        value: ly,
        onChange: (e) => setLy(parseFloat(e.target.value))
      })
    ),
    React.createElement('div', { className: 'mb-3' },
      React.createElement('label', { className: 'form-label small mb-1' }, '高さ (Lz)'),
      React.createElement('input', {
        type: 'number', className: 'form-control form-control-sm',
        value: lz,
        onChange: (e) => setLz(parseFloat(e.target.value))
      })
    ),
    React.createElement('button', {
      className: 'btn btn-primary btn-sm',
      onClick: handleSubmit
    }, '立体図形を再作成')
  );
}

function UserPresetsSettingsPanel() {
  const [form, setForm] = useState<UserPresetForm>({ name: '', category: '', description: '' });
  const [items, setItems] = useState<UserPresetState[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageEnabled, setStorageEnabled] = useState(true);

  const refresh = () => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.listUserPresets === 'function') {
      setItems(engine.listUserPresets() || []);
    }
    if (engine && typeof engine.isUserPresetStorageEnabled === 'function') {
      setStorageEnabled(!!engine.isUserPresetStorageEnabled());
    }
  };

  useEffect(() => {
    refresh();
    globalThis.__refreshUserPresets = refresh;
    return () => {
      if (globalThis.__refreshUserPresets) delete globalThis.__refreshUserPresets;
    };
  }, []);

  const updateForm = (patch: Partial<UserPresetForm>) => setForm({ ...form, ...patch });
  const save = async () => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.saveUserPreset === 'function') {
      await engine.saveUserPreset(form);
      refresh();
      setEditingId(null);
      setForm({ name: '', category: '', description: '' });
    }
  };
  const cancelEdit = () => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.cancelUserPresetEdit === 'function') {
      engine.cancelUserPresetEdit();
    }
    setEditingId(null);
    setForm({ name: '', category: '', description: '' });
  };
  const applyPreset = (id: string) => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.applyUserPreset === 'function') {
      engine.applyUserPreset(id);
    }
  };
  const editPreset = (id: string) => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.editUserPreset === 'function') {
      engine.editUserPreset(id);
      const target = (engine.listUserPresets && engine.listUserPresets() || []).find(p => p.id === id);
      if (target) {
        setEditingId(id);
        setForm({ name: target.name || '', category: target.category || '', description: target.description || '' });
      }
    }
  };
  const deletePreset = (id: string) => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.deleteUserPreset === 'function') {
      engine.deleteUserPreset(id);
      refresh();
      if (editingId === id) {
        setEditingId(null);
        setForm({ name: '', category: '', description: '' });
      }
    }
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', { className: 'row g-2 align-items-end mb-3' },
      React.createElement('div', { className: 'col-12' },
        React.createElement('label', { className: 'form-label small mb-1' }, 'プリセット名'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: form.name || '',
          onChange: (e) => updateForm({ name: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'col-12' },
        React.createElement('label', { className: 'form-label small mb-1' }, 'カテゴリ'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: form.category || '',
          onChange: (e) => updateForm({ category: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'col-12' },
        React.createElement('label', { className: 'form-label small mb-1' }, '説明'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: form.description || '',
          onChange: (e) => updateForm({ description: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'col-12' },
        React.createElement('button', {
          className: 'btn btn-outline-success btn-sm',
          disabled: !storageEnabled,
          onClick: save
        }, editingId ? '更新' : '保存'),
        React.createElement('button', {
          className: `btn btn-outline-secondary btn-sm ms-2 ${editingId ? '' : 'd-none'}`, 
          onClick: cancelEdit
        }, '編集を取り消す'),
        React.createElement('span', { className: 'text-muted small ms-2' },
          storageEnabled ? 'ブラウザに保存します' : '保存機能は利用できません'
        )
      )
    ),
    React.createElement('div', { className: `text-muted small mb-2 ${items.length ? 'd-none' : ''}` }, '保存されたユーザープリセットはありません。'),
    React.createElement('div', { className: 'list-group small' },
      items.map(item => (
        React.createElement('div', { key: item.id, className: 'list-group-item d-flex justify-content-between align-items-center' },
          React.createElement('div', null,
            React.createElement('div', { className: 'fw-semibold' }, item.name || 'User Preset'),
            React.createElement('div', { className: 'text-muted small' },
              [item.description, item.category, item.updatedAt ? `更新: ${item.updatedAt}` : ''].filter(Boolean).join(' / ')
            )
          ),
          React.createElement('div', { className: 'd-flex gap-2' },
            React.createElement('button', { className: 'btn btn-outline-secondary btn-sm', onClick: () => editPreset(item.id) }, '編集'),
            React.createElement('button', { className: 'btn btn-outline-primary btn-sm', onClick: () => applyPreset(item.id) }, '適用'),
            React.createElement('button', { className: 'btn btn-outline-danger btn-sm', onClick: () => deletePreset(item.id) }, '削除')
          )
        )
      ))
    )
  );
} // Missing closing brace for UserPresetsSettingsPanel


// --- Init Function ---
export function initSidePanel() {
  const rootEl = document.getElementById('react-side-panel-root');
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(React.createElement(SidePanel));
  }
}
