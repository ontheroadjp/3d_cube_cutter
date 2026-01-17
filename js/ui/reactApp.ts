import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DisplayState, Preset, UserPresetState } from '../types.js';

type UserPresetForm = {
  name: string;
  category: string;
  description: string;
};

type Engine = {
  getDisplayState?: () => DisplayState;
  setDisplayState?: (display: DisplayState) => void;
  getPresets?: () => Preset[];
  applyPreset?: (name: string) => void;
  getUserPresetForm?: () => UserPresetForm;
  listUserPresets?: () => UserPresetState[];
  isUserPresetStorageEnabled?: () => boolean;
  saveUserPreset?: (form: UserPresetForm) => Promise<void> | void;
  cancelUserPresetEdit?: () => void;
  applyUserPreset?: (id: string) => void;
  editUserPreset?: (id: string) => void;
  deleteUserPreset?: (id: string) => void;
  configureVertexLabels?: () => void;
  configureCube?: () => void;
};

declare global {
  var __engine: Engine | undefined;
  var __setExplanation: ((text: string) => void) | undefined;
  var __setDisplayState: ((display: DisplayState | null) => void) | undefined;
  var __setReactSettingsVisible: ((visible: boolean) => void) | undefined;
  var __refreshUserPresets: (() => void) | undefined;
}

const panelStyle = {
  position: 'absolute',
  bottom: '12px',
  left: '12px',
  width: '320px',
  maxWidth: '70vw',
  zIndex: 40,
};

export function invokeConfigureVertexLabels() {
  const engine = globalThis.__engine;
  if (engine && typeof engine.configureVertexLabels === 'function') {
    engine.configureVertexLabels();
  }
}

export function invokeConfigureCube() {
  const engine = globalThis.__engine;
  if (engine && typeof engine.configureCube === 'function') {
    engine.configureCube();
  }
}

function ExplanationPanel() {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    globalThis.__setExplanation = (next) => {
      setText(next || '');
    };
    return () => {
      if (globalThis.__setExplanation) {
        delete globalThis.__setExplanation;
      }
    };
  }, []);

  if (!text) return null;
  return (
    React.createElement('div', { className: 'card shadow-sm', style: panelStyle },
      React.createElement('div', { className: 'card-body p-2' },
        React.createElement('div', { className: 'small text-muted mb-1' }, '解説'),
        React.createElement('div', { className: 'small' }, text)
      )
    )
  );
}

function SettingsPanel() {
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState<DisplayState | null>(null);

  useEffect(() => {
    globalThis.__setReactSettingsVisible = (next) => {
      setVisible(!!next);
    };
    if (globalThis.__engine && typeof globalThis.__engine.getDisplayState === 'function') {
      setDisplay(globalThis.__engine.getDisplayState());
    }
    globalThis.__setDisplayState = (next) => {
      setDisplay(next || null);
    };
    const engine = globalThis.__engine;
    if (engine && typeof engine.getDisplayState === 'function') {
      setDisplay(engine.getDisplayState());
    }
    return () => {
      if (globalThis.__setReactSettingsVisible) delete globalThis.__setReactSettingsVisible;
      if (globalThis.__setDisplayState) delete globalThis.__setDisplayState;
    };
  }, []);

  if (!visible) return null;
  if (!display) return null;

  const update = (patch: Partial<DisplayState>) => {
    const next = { ...display, ...patch };
    setDisplay(next);
    const engine = globalThis.__engine;
    if (engine && typeof engine.setDisplayState === 'function') {
      engine.setDisplayState(next);
    }
  };

  return (
    React.createElement('div', { className: 'container-fluid p-0' },
      React.createElement('h6', { className: 'border-bottom pb-2 mb-3' }, '表示設定'),
      React.createElement('div', { className: 'row' },
        React.createElement('div', { className: 'col-6 col-md-3' },
          React.createElement('div', { className: 'form-check form-switch' },
            React.createElement('input', {
              className: 'form-check-input',
              type: 'checkbox',
              checked: !!display.showVertexLabels,
              onChange: (e) => update({ showVertexLabels: (e.target as HTMLInputElement).checked })
            }),
            React.createElement('label', { className: 'form-check-label' }, '頂点ラベル')
          ),
          React.createElement('div', { className: 'form-check form-switch' },
            React.createElement('input', {
              className: 'form-check-input',
              type: 'checkbox',
              checked: !!display.showCutSurface,
              onChange: (e) => update({ showCutSurface: (e.target as HTMLInputElement).checked })
            }),
            React.createElement('label', { className: 'form-check-label' }, '切断面')
          ),
          React.createElement('div', { className: 'mt-2' },
            React.createElement('button', {
              className: 'btn btn-outline-secondary btn-sm',
              onClick: () => invokeConfigureVertexLabels()
            }, '頂点ラベルを設定...')
          )
        ),
        React.createElement('div', { className: 'col-6 col-md-3' },
          React.createElement('div', { className: 'form-check form-switch' },
            React.createElement('input', {
              className: 'form-check-input',
              type: 'checkbox',
              checked: !!display.showPyramid,
              onChange: (e) => update({ showPyramid: (e.target as HTMLInputElement).checked })
            }),
            React.createElement('label', { className: 'form-check-label' }, '切り取られた部分')
          ),
          React.createElement('div', { className: 'form-check form-switch' },
            React.createElement('input', {
              className: 'form-check-input',
              type: 'checkbox',
              checked: !!display.cubeTransparent,
              onChange: (e) => update({ cubeTransparent: (e.target as HTMLInputElement).checked })
            }),
            React.createElement('label', { className: 'form-check-label' }, '直方体を半透明')
          )
        ),
        React.createElement('div', { className: 'col-6 col-md-3' },
          React.createElement('div', { className: 'form-check form-switch' },
            React.createElement('input', {
              className: 'form-check-input',
              type: 'checkbox',
              checked: !!display.showFaceLabels,
              onChange: (e) => update({ showFaceLabels: (e.target as HTMLInputElement).checked })
            }),
            React.createElement('label', { className: 'form-check-label' }, '面ラベル')
          ),
          React.createElement('div', { className: 'mt-2' },
            React.createElement('label', { className: 'form-label text-muted small mb-1' }, '辺の長さ'),
            React.createElement('select', {
              className: 'form-select form-select-sm w-auto d-inline-block',
              value: display.edgeLabelMode || 'visible',
              onChange: (e) => update({ edgeLabelMode: (e.target as HTMLSelectElement).value as DisplayState['edgeLabelMode'] })
            },
              React.createElement('option', { value: 'visible' }, '表示する'),
              React.createElement('option', { value: 'popup' }, 'ポップアップ'),
              React.createElement('option', { value: 'hidden' }, '表示しない')
            )
          )
        )
      )
    )
  );
}

function PresetPanel() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [category, setCategory] = useState<string>('');
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.getPresets === 'function') {
      setPresets(engine.getPresets() || []);
    }
    const select = document.getElementById('preset-category-filter') as HTMLSelectElement | null;
    if (select) {
      setCategory(select.value);
      const handler = (e: Event) => {
        const target = e.target as HTMLSelectElement;
        setCategory(target.value);
      };
      select.addEventListener('change', handler);
      return () => select.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  const filtered = category
    ? presets.filter(preset => preset.category === category)
    : presets;

  const applyPreset = (name: string) => {
    setActive(name);
    const engine = globalThis.__engine;
    if (engine && typeof engine.applyPreset === 'function') {
      engine.applyPreset(name);
    }
  };

  return React.createElement(
    React.Fragment,
    null,
    filtered.map(preset => (
      React.createElement('button', {
        key: preset.name,
        className: `btn btn-outline-secondary btn-sm ${active === preset.name ? 'btn-secondary fw-bold' : ''}`,
        onClick: () => applyPreset(preset.name)
      }, preset.name)
    ))
  );
}

function UserPresetsPanel() {
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
    const engine = globalThis.__engine;
    if (engine && typeof engine.getUserPresetForm === 'function') {
      setForm(engine.getUserPresetForm());
    }
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
    React.createElement('h6', { className: 'border-bottom pb-2 mb-3' }, 'ユーザープリセット'),
    React.createElement('div', { className: 'row g-2 align-items-end mb-3' },
      React.createElement('div', { className: 'col-12 col-md-4' },
        React.createElement('label', { className: 'form-label small mb-1' }, 'プリセット名'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: form.name || '',
          onChange: (e) => updateForm({ name: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'col-12 col-md-4' },
        React.createElement('label', { className: 'form-label small mb-1' }, 'カテゴリ'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: form.category || '',
          onChange: (e) => updateForm({ category: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'col-12 col-md-4' },
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
}

function CuboidPanel() {
  const handleResize = () => invokeConfigureCube();

  return (
    React.createElement('div', { className: 'container-fluid p-0' },
      React.createElement('h6', { className: 'border-bottom pb-2 mb-3' }, '立体図形の設定'),
      React.createElement('p', { className: 'small text-muted' }, '新しいサイズを入力して、立体図形を再作成します。'),
      React.createElement('button', { className: 'btn btn-outline-primary btn-sm', onClick: handleResize }, '立体図形を再設定...')
    )
  );
}

export function initReactApp() {
  const rootEl = document.getElementById('react-root');
  if (!rootEl) return;
  const root = createRoot(rootEl);
  root.render(
    React.createElement(React.Fragment, null,
      React.createElement(ExplanationPanel)
    )
  );

  const settingsRootEl = document.getElementById('react-settings-root');
  if (settingsRootEl) {
    const settingsRoot = createRoot(settingsRootEl);
    settingsRoot.render(React.createElement(SettingsPanel));
  }

  const presetRootEl = document.getElementById('react-preset-root');
  if (presetRootEl) {
    const presetRoot = createRoot(presetRootEl);
    presetRoot.render(React.createElement(PresetPanel));
    const legacyContainer = document.getElementById('presetButtons');
    if (legacyContainer) legacyContainer.classList.add('d-none');
  }

  const userPresetsRoot = document.getElementById('react-user-presets-root');
  if (userPresetsRoot) {
    const userPresets = createRoot(userPresetsRoot);
    userPresets.render(React.createElement(UserPresetsPanel));
  }

  const cuboidRoot = document.getElementById('react-cuboid-root');
  if (cuboidRoot) {
    const cuboidPanel = createRoot(cuboidRoot);
    cuboidPanel.render(React.createElement(CuboidPanel));
  }
}
