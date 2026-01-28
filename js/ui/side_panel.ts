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
  setPanelOpen?: (open: boolean) => void;
  getNetVisible?: () => boolean;
  getNetStepInfo?: () => {
    mode: 'auto' | 'step';
    stepIndex: number;
    stepCount: number;
    isPlaying: boolean;
  };
  getAnimationSpecEnabled?: () => boolean;
  setAnimationSpecEnabled?: (enabled: boolean) => void;
  setNetPlaybackMode?: (mode: 'auto' | 'step') => void;
  stepNetForward?: () => void;
  stepNetBackward?: () => void;
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
  var __setNetVisible: ((visible: boolean) => void) | undefined;
  var __setNetStepState: ((state: NetStepState) => void) | undefined;
}

type NetStepState = {
  mode: 'auto' | 'step';
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
};

type NetPlaybackControlsProps = {
  netVisible: boolean;
  netStepState: NetStepState;
  onToggleNet: () => void;
  onPlaybackModeChange: (enabled: boolean) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
};

function NetPlaybackControls({
  netVisible,
  netStepState,
  onToggleNet,
  onPlaybackModeChange,
  onStepForward,
  onStepBackward
}: NetPlaybackControlsProps) {
  const switchDisabled =
    netStepState.isPlaying || (netStepState.mode === 'step' && netStepState.stepIndex > 0);
  const stepDisabled = netStepState.mode !== 'step' || netStepState.isPlaying;
  const canStepForward = !stepDisabled && netStepState.stepIndex < netStepState.stepCount;
  const canStepBackward = !stepDisabled && netStepState.stepIndex > 0;

  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        left: 'calc(var(--sidebar-width, 64px) + var(--panel-offset, 0px) + 12px)',
        bottom: '16px',
        zIndex: 1200,
        background: 'rgba(255, 255, 255, 0.92)',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'auto',
        boxShadow: '0 8px 18px rgba(0,0,0,0.12)'
      }
    },
    React.createElement('span', { className: 'small text-muted' }, '連続再生'),
    React.createElement(
      'div',
      { className: 'form-check form-switch m-0' },
      React.createElement('input', {
        className: 'form-check-input',
        type: 'checkbox',
        role: 'switch',
        checked: netStepState.mode === 'auto',
        onChange: (event) => onPlaybackModeChange(event.currentTarget.checked),
        disabled: switchDisabled,
        title: '連続再生',
        'aria-label': '連続再生'
      })
    ),
    React.createElement('button', {
      type: 'button',
      className: 'btn btn-sm btn-outline-secondary',
      onClick: onStepBackward,
      disabled: !canStepBackward,
      title: '前の面'
    }, React.createElement(
      'svg',
      {
        width: 16,
        height: 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true'
      },
      React.createElement('polyline', { points: '15 18 9 12 15 6' })
    )),
    React.createElement('button', {
      type: 'button',
      className: 'btn btn-sm btn-outline-secondary',
      onClick: onStepForward,
      disabled: !canStepForward,
      title: '次の面'
    }, React.createElement(
      'svg',
      {
        width: 16,
        height: 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true'
      },
      React.createElement('polyline', { points: '9 18 15 12 9 6' })
    )),
    React.createElement('button', {
      type: 'button',
      className: 'btn btn-sm btn-outline-primary',
      onClick: onToggleNet,
      title: '展開図'
    }, netVisible ? '閉じる' : '展開')
  );
}

// --- SidePanel Component ---
export function SidePanel() {
  const [currentMode, setCurrentMode] = useState<string>('free'); // 'free', 'preset', 'learning', 'settings'
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<string>('display'); // 'display', 'cuboid'
  const [netVisible, setNetVisible] = useState<boolean>(false);
  const [netStepState, setNetStepState] = useState<NetStepState>({
    mode: 'auto',
    stepIndex: 0,
    stepCount: 0,
    isPlaying: false
  });

  useEffect(() => {
    // Register global function to allow main.ts to update the mode
    globalThis.__setReactMode = (mode: string) => {
      setCurrentMode(mode);
      if (mode === 'free') {
        setPanelOpen(false);
        setActivePanel(null);
      }
      if (mode === 'settings') {
        // When entering settings mode, default to display settings
        setActiveSettingsPanel('display');
      }
    };
    return () => {
      if (globalThis.__setReactMode) delete globalThis.__setReactMode;
    };
  }, []);

  useEffect(() => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.getNetVisible === 'function') {
      setNetVisible(!!engine.getNetVisible());
    }
    if (engine && typeof engine.getNetStepInfo === 'function') {
      setNetStepState(engine.getNetStepInfo());
    }
    globalThis.__setNetVisible = (visible: boolean) => {
      setNetVisible(!!visible);
    };
    globalThis.__setNetStepState = (state: NetStepState) => {
      setNetStepState(state);
    };
    return () => {
      if (globalThis.__setNetVisible) delete globalThis.__setNetVisible;
      if (globalThis.__setNetStepState) delete globalThis.__setNetStepState;
    };
  }, []);

  const handleModeChange = (mode: string) => {
    if (mode === 'free') {
      setCurrentMode(mode);
      setPanelOpen(false);
      setActivePanel(null);
      if (globalThis.__engine && typeof globalThis.__engine.setMode === 'function') {
        globalThis.__engine.setMode(mode);
      }
      return;
    }
    const nextOpen = mode === activePanel ? !panelOpen : true;
    setActivePanel(nextOpen ? mode : null);
    setPanelOpen(nextOpen);
    if (globalThis.__engine && typeof globalThis.__engine.setMode === 'function') {
      globalThis.__engine.setMode(nextOpen ? mode : 'free');
    }
    setCurrentMode(nextOpen ? mode : 'free');
  };

  const handleSettingsPanelChange = (panel: string) => {
    setActiveSettingsPanel(panel);
    // Potentially inform main.ts about settings category change if needed for legacy UIManager
    if (globalThis.__engine && typeof globalThis.__engine.setSettingsCategory === 'function') {
        globalThis.__engine.setSettingsCategory(panel);
    }
  };

  useEffect(() => {
    if (globalThis.__engine && typeof globalThis.__engine.setPanelOpen === 'function') {
      globalThis.__engine.setPanelOpen(panelOpen);
    }
  }, [panelOpen]);

  const handleNetPlaybackToggle = (enabled: boolean) => {
    const engine = globalThis.__engine;
    if (!engine || typeof engine.setNetPlaybackMode !== 'function') return;
    const nextMode = enabled ? 'auto' : 'step';
    engine.setNetPlaybackMode(nextMode);
  };

  const handleNetStepForward = () => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.stepNetForward === 'function') {
      engine.stepNetForward();
    }
  };

  const handleNetStepBackward = () => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.stepNetBackward === 'function') {
      engine.stepNetBackward();
    }
  };

  return React.createElement(
    'div',
    {
      className: 'chatgpt-sidebar',
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: '64px', // Narrow sidebar
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '0.25rem',
      }
    },
    // Mode selection icons
    React.createElement(
      'div',
      { className: 'd-flex flex-column gap-3 mb-4' },
      React.createElement('div', { className: 'chatgpt-logo' },
        React.createElement(Icon, { name: 'cube' })
      ),
      React.createElement(ModeButton, {
        mode: 'preset',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'pencil'
      }),
      React.createElement(ModeButton, {
        mode: 'learning',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'book'
      }),
      React.createElement(ModeButton, {
        mode: 'settings',
        currentMode: currentMode,
        onClick: handleModeChange,
        icon: 'sliders'
      })
    ),

    // Action buttons
    React.createElement(
      'div',
      { className: 'd-flex flex-column gap-3 mt-auto' }, // mt-auto pushes these to the bottom
      React.createElement(ActionButton, {
        onClick: () => globalThis.__engine?.flipCut?.(),
        icon: 'repeat',
        title: '切り取り反転',
        variant: 'soft'
      }),
      React.createElement(ActionButton, {
        onClick: () => globalThis.__engine?.toggleNet?.(),
        icon: 'grid',
        title: '展開図',
        variant: 'soft',
        isActive: netVisible
      }),
      React.createElement(ActionButton, {
        onClick: () => globalThis.__engine?.resetScene?.(),
        icon: 'reset',
        title: 'リセット',
        variant: 'danger'
      })
    ),

    // Content Panel (placeholder for now)
    React.createElement(
        'div',
        {
            className: `chatgpt-panel ${panelOpen ? 'chatgpt-panel--open' : 'chatgpt-panel--closed'}`,
            style: {
                position: 'fixed',
                top: 0,
                left: '64px', // To the right of the sidebar
                height: '100%',
                width: '320px', // Width of the content panel
                zIndex: 999,
                padding: '1.25rem 1rem',
                overflowY: 'auto'
            }
        },
        panelOpen && React.createElement('button', {
            type: 'button',
            className: 'chatgpt-btn chatgpt-panel-close',
            title: '閉じる',
            onClick: () => activePanel && handleModeChange(activePanel)
        }, React.createElement(Icon, { name: 'close' })),
        panelOpen && activePanel === 'preset' && React.createElement(PresetContent, { currentMode: currentMode }),
        panelOpen && activePanel === 'learning' && React.createElement(LearningContent, { currentMode: currentMode }),
        panelOpen && activePanel === 'settings' && React.createElement(SettingsContent, {
            activePanel: activeSettingsPanel,
            onPanelChange: handleSettingsPanelChange
        }),
    ),

    React.createElement(NetPlaybackControls, {
      netVisible: netVisible,
      netStepState: netStepState,
      onToggleNet: () => globalThis.__engine?.toggleNet?.(),
      onPlaybackModeChange: handleNetPlaybackToggle,
      onStepForward: handleNetStepForward,
      onStepBackward: handleNetStepBackward
    })
  );
}

// --- Icon Component ---
function Icon({ name }: { name: string }) {
  const shared = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'chatgpt-icon'
  } as React.SVGProps<SVGSVGElement>;
  switch (name) {
    case 'pencil':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M12 20h9' }),
        React.createElement('path', { d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z' })
      );
    case 'sparkle':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M12 3.5l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9z' })
      );
    case 'cap':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M3 10l9-4 9 4-9 4-9-4z' }),
        React.createElement('path', { d: 'M6 12v4.5c0 .6 3 2 6 2s6-1.4 6-2V12' })
      );
    case 'book':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M4.5 5.5c0-1 1-2 2.2-2H20v15.5H7.2c-1.2 0-2.2 1-2.2 2' }),
        React.createElement('path', { d: 'M4.5 5.5v13c0 1 1 2 2.2 2H20' })
      );
    case 'sliders':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M4 6h9' }),
        React.createElement('path', { d: 'M16 6h4' }),
        React.createElement('circle', { cx: 14, cy: 6, r: 2 }),
        React.createElement('path', { d: 'M4 12h4' }),
        React.createElement('path', { d: 'M12 12h8' }),
        React.createElement('circle', { cx: 10, cy: 12, r: 2 }),
        React.createElement('path', { d: 'M4 18h10' }),
        React.createElement('path', { d: 'M18 18h2' }),
        React.createElement('circle', { cx: 16, cy: 18, r: 2 })
      );
    case 'repeat':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M4 7h11' }),
        React.createElement('path', { d: 'M13 3l4 4-4 4' }),
        React.createElement('path', { d: 'M20 17H9' }),
        React.createElement('path', { d: 'M11 21l-4-4 4-4' })
      );
    case 'grid':
      return React.createElement(
        'svg',
        shared,
        React.createElement('rect', { x: 3, y: 3, width: 7, height: 7 }),
        React.createElement('rect', { x: 14, y: 3, width: 7, height: 7 }),
        React.createElement('rect', { x: 3, y: 14, width: 7, height: 7 }),
        React.createElement('rect', { x: 14, y: 14, width: 7, height: 7 })
      );
    case 'reset':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M3 12a9 9 0 1 0 3-6.7' }),
        React.createElement('path', { d: 'M3 4v5h5' })
      );
    case 'close':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M6 6l12 12' }),
        React.createElement('path', { d: 'M18 6l-12 12' })
      );
    case 'cube':
      return React.createElement(
        'svg',
        shared,
        React.createElement('path', { d: 'M12 2l8 4v12l-8 4-8-4V6l8-4z' }),
        React.createElement('path', { d: 'M12 22V10' }),
        React.createElement('path', { d: 'M4 6l8 4 8-4' })
      );
    default:
      return React.createElement('svg', shared);
  }
}

// --- ModeButton Component ---
function ModeButton({ mode, currentMode, onClick, icon }: { mode: string, currentMode: string, onClick: (mode: string) => void, icon: string }) {
  const isActive = mode === currentMode;
  const className = `chatgpt-btn ${isActive ? 'chatgpt-btn--active' : ''}`;
  return React.createElement(
    'button',
    {
      type: 'button',
      className: className,
      onClick: () => onClick(mode),
      title: mode.charAt(0).toUpperCase() + mode.slice(1) // Capitalize first letter for title
    },
    React.createElement(Icon, { name: icon })
  );
}

// --- ActionButton Component ---
function ActionButton({ onClick, icon, title, variant = 'soft', isActive = false }: { onClick: () => void, icon: string, title: string, variant?: string, isActive?: boolean }) {
  const className = `chatgpt-btn chatgpt-btn--${variant} ${isActive ? 'chatgpt-btn--active' : ''}`;
  return React.createElement(
    'button',
    {
      type: 'button',
      className: className,
      onClick: onClick,
      title: title
    },
    React.createElement(Icon, { name: icon })
  );
}

// --- Content Components (placeholders) ---
function PresetContent({ currentMode }: { currentMode: string }) {
  // Logic for preset selection
  const [presets, setPresets] = useState<Preset[]>([]);
  const [userPresets, setUserPresets] = useState<UserPresetState[]>([]);
  const [category, setCategory] = useState<string>('triangle'); // Default category
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageEnabled, setStorageEnabled] = useState(true);
  const [saveForm, setSaveForm] = useState<UserPresetForm>({ name: '', category: '', description: '' });

  const refreshUserPresets = () => {
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.listUserPresets === 'function') {
      setUserPresets(engine.listUserPresets() || []);
    }
    if (engine && typeof engine.isUserPresetStorageEnabled === 'function') {
      setStorageEnabled(!!engine.isUserPresetStorageEnabled());
    }
  };

  useEffect(() => {
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.getPresets === 'function') {
      setPresets(engine.getPresets() || []);
    }
    refreshUserPresets();
    (globalThis as any).__refreshUserPresets = refreshUserPresets;
    return () => {
      if ((globalThis as any).__refreshUserPresets) delete (globalThis as any).__refreshUserPresets;
    };
  }, []);

  const filteredPresets = category
    ? presets.filter(preset => preset.category === category)
    : presets;

  const applyPreset = (name: string) => {
    if ((globalThis as any).__engine && typeof (globalThis as any).__engine.applyPreset === 'function') {
      (globalThis as any).__engine.applyPreset(name);
    }
  };

  const applyUserPreset = (id: string) => {
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.applyUserPreset === 'function') {
      engine.applyUserPreset(id);
    }
  };

  const updateSaveForm = (patch: Partial<UserPresetForm>) => setSaveForm({ ...saveForm, ...patch });

  const openSaveDialog = () => {
    const nextCategory = category !== 'saved' ? category : '';
    setEditingId(null);
    setSaveForm({ name: '', category: nextCategory, description: '' });
    setShowSaveDialog(true);
  };

  const saveUserPreset = async () => {
    if (!saveForm.name) return;
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.saveUserPreset === 'function') {
      await engine.saveUserPreset(saveForm);
      refreshUserPresets();
      setShowSaveDialog(false);
      setEditingId(null);
      setSaveForm({ name: '', category: '', description: '' });
    }
  };

  const editUserPreset = (id: string) => {
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.editUserPreset === 'function') {
      engine.editUserPreset(id);
    }
    const target = userPresets.find(p => p.id === id);
    if (target) {
      setEditingId(id);
      setSaveForm({ name: target.name || '', category: target.category || '', description: target.description || '' });
      setShowSaveDialog(true);
    }
  };

  const cancelEdit = () => {
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.cancelUserPresetEdit === 'function') {
      engine.cancelUserPresetEdit();
    }
    setEditingId(null);
    setShowSaveDialog(false);
    setSaveForm({ name: '', category: '', description: '' });
  };

  const deleteUserPreset = (id: string) => {
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.deleteUserPreset === 'function') {
      engine.deleteUserPreset(id);
      refreshUserPresets();
      if (editingId === id) {
        setEditingId(null);
        setShowSaveDialog(false);
        setSaveForm({ name: '', category: '', description: '' });
      }
    }
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('h5', { className: 'mb-3' }, 'プリセット'),
    React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-3' },
      React.createElement('button', {
        className: 'btn btn-outline-success btn-sm',
        disabled: !storageEnabled,
        onClick: openSaveDialog
      }, '今の図形を保存')
    ),
    React.createElement('div', { className: 'mb-3' },
      React.createElement('select', {
        className: 'form-select form-select-sm',
        value: category,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)
      } as React.SelectHTMLAttributes<HTMLSelectElement>,
        React.createElement('option', { value: 'triangle' }, '三角形'),
        React.createElement('option', { value: 'quad' }, '四角形'),
        React.createElement('option', { value: 'poly' }, '多角形'),
        React.createElement('option', { value: 'saved' }, '保存した図形')
      )
    ),
    category !== 'saved' && React.createElement('div', { className: 'd-flex flex-wrap gap-2' },
      filteredPresets.map(preset => (
        React.createElement('button', {
          key: preset.name,
          className: 'btn btn-outline-secondary btn-sm',
          onClick: () => applyPreset(preset.name)
        }, preset.name)
      ))
    ),
    category === 'saved' && React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { className: `text-muted small mb-2 ${userPresets.length ? 'd-none' : ''}` }, '保存した図形はありません。'),
      React.createElement('div', { className: 'list-group small' },
        userPresets.map(item => (
          React.createElement('div', { key: item.id, className: 'list-group-item d-flex justify-content-between align-items-center' },
            React.createElement('div', null,
              React.createElement('div', { className: 'fw-semibold' }, item.name || '保存した図形'),
              React.createElement('div', { className: 'text-muted small' },
                [item.description, item.category, item.updatedAt ? `更新: ${item.updatedAt}` : ''].filter(Boolean).join(' / ')
              )
            ),
            React.createElement('div', { className: 'd-flex gap-2' },
              React.createElement('button', { className: 'btn btn-outline-secondary btn-sm', onClick: () => editUserPreset(item.id) }, '編集'),
              React.createElement('button', { className: 'btn btn-outline-primary btn-sm', onClick: () => applyUserPreset(item.id) }, '適用'),
              React.createElement('button', { className: 'btn btn-outline-danger btn-sm', onClick: () => deleteUserPreset(item.id) }, '削除')
            )
          )
        ))
      )
    ),
    showSaveDialog && React.createElement(
      'div',
      { className: 'border rounded p-3 bg-light shadow-sm mt-3' },
      React.createElement('div', { className: 'fw-semibold mb-2' }, editingId ? '保存した図形を編集' : '今の図形を保存'),
      React.createElement('div', { className: 'mb-2' },
        React.createElement('label', { className: 'form-label small mb-1' }, 'プリセット名'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: saveForm.name || '',
          onChange: (e) => updateSaveForm({ name: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'mb-2' },
        React.createElement('label', { className: 'form-label small mb-1' }, 'カテゴリ'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: saveForm.category || '',
          onChange: (e) => updateSaveForm({ category: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'mb-3' },
        React.createElement('label', { className: 'form-label small mb-1' }, '説明'),
        React.createElement('input', {
          className: 'form-control form-control-sm',
          type: 'text',
          value: saveForm.description || '',
          onChange: (e) => updateSaveForm({ description: (e.target as HTMLInputElement).value })
        })
      ),
      React.createElement('div', { className: 'd-flex align-items-center gap-2' },
        React.createElement('button', {
          className: 'btn btn-outline-success btn-sm',
          disabled: !storageEnabled,
          onClick: saveUserPreset
        }, editingId ? '更新' : '保存'),
        React.createElement('button', {
          className: 'btn btn-outline-secondary btn-sm',
          onClick: cancelEdit
        }, editingId ? '編集を取り消す' : '閉じる'),
        React.createElement('span', { className: 'text-muted small' },
          storageEnabled ? 'ブラウザに保存します' : '保存機能は利用できません'
        )
      )
    )
  );
}

function LearningContent({ currentMode }: { currentMode: string }) {
  // Logic for learning problems
  return React.createElement(
    'div',
    null,
    React.createElement('h5', { className: 'mb-3' }, '学習モード'),
    React.createElement('p', null, '準備中')
  );
}

function SettingsContent({ activePanel, onPanelChange }: { activePanel: string, onPanelChange: (panel: string) => void }) {
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
      }, '立体図形')
    ),
    activePanel === 'display' && React.createElement(DisplaySettingsPanel, null),
    activePanel === 'cuboid' && React.createElement(CuboidSettingsPanel, null)
  );
}

function DisplaySettingsPanel() {
  const [display, setDisplay] = useState<DisplayState | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [animationSpecEnabled, setAnimationSpecEnabled] = useState<boolean>(true);

  useEffect(() => {
    if ((globalThis as any).__engine && typeof (globalThis as any).__engine.getDisplayState === 'function') {
      setDisplay((globalThis as any).__engine.getDisplayState());
    }
    if ((globalThis as any).__engine && typeof (globalThis as any).__engine.getAnimationSpecEnabled === 'function') {
      setAnimationSpecEnabled(!!(globalThis as any).__engine.getAnimationSpecEnabled());
    }
    (globalThis as any).__setDisplayState = (next: DisplayState | null) => {
      setDisplay(next || null);
    };
    return () => {
      if ((globalThis as any).__setDisplayState) delete (globalThis as any).__setDisplayState;
    };
  }, []);

  const updateDisplayState = (patch: Partial<DisplayState>) => {
    if (!display) return;
    const next = { ...display, ...patch };
    setDisplay(next);
    if ((globalThis as any).__engine && typeof (globalThis as any).__engine.setDisplayState === 'function') {
      (globalThis as any).__engine.setDisplayState(next);
    }
  };

  const updateAnimationSpecEnabled = (enabled: boolean) => {
    setAnimationSpecEnabled(enabled);
    if ((globalThis as any).__engine && typeof (globalThis as any).__engine.setAnimationSpecEnabled === 'function') {
      (globalThis as any).__engine.setAnimationSpecEnabled(enabled);
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
        checked: animationSpecEnabled,
        onChange: (e) => updateAnimationSpecEnabled(e.target.checked)
      }),
      React.createElement('label', { className: 'form-check-label' }, 'AnimationSpec を使用（Net）')
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
        checked: !!display.showCutPoints,
        onChange: (e) => updateDisplayState({ showCutPoints: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '切断点を表示')
    ),
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.showNormalHelper,
        onChange: (e) => updateDisplayState({ showNormalHelper: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '法線ヘルパーを表示')
    ),
    React.createElement('div', { className: 'form-check form-switch mb-2' },
      React.createElement('input', {
        className: 'form-check-input', type: 'checkbox',
        checked: !!display.colorizeCutLines,
        onChange: (e) => updateDisplayState({ colorizeCutLines: e.target.checked })
      }),
      React.createElement('label', { className: 'form-check-label' }, '切断線を色分け')
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
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => updateDisplayState({ edgeLabelMode: e.target.value as DisplayState['edgeLabelMode'] })
        } as React.SelectHTMLAttributes<HTMLSelectElement>,
          React.createElement('option', { value: 'visible' }, '常に表示'),
          React.createElement('option', { value: 'popup' }, 'ポップアップ'),
          React.createElement('option', { value: 'hidden' }, '表示しない')
        )
      ),
    React.createElement('div', { className: 'mb-3' },
      React.createElement('label', { className: 'form-label small mb-1' }, '面の色'),
      React.createElement('div', { className: 'form-check' },
        React.createElement('input', {
          className: 'form-check-input',
          type: 'radio',
          name: 'faceColorTheme',
          checked: (display.faceColorTheme || 'blue') === 'blue',
          onChange: () => updateDisplayState({ faceColorTheme: 'blue' })
        }),
        React.createElement('label', { className: 'form-check-label' }, '青系')
      ),
      React.createElement('div', { className: 'form-check' },
        React.createElement('input', {
          className: 'form-check-input',
          type: 'radio',
          name: 'faceColorTheme',
          checked: (display.faceColorTheme || 'blue') === 'red',
          onChange: () => updateDisplayState({ faceColorTheme: 'red' })
        }),
        React.createElement('label', { className: 'form-check-label' }, '赤（ピンク）系')
      ),
      React.createElement('div', { className: 'form-check' },
        React.createElement('input', {
          className: 'form-check-input',
          type: 'radio',
          name: 'faceColorTheme',
          checked: (display.faceColorTheme || 'blue') === 'green',
          onChange: () => updateDisplayState({ faceColorTheme: 'green' })
        }),
        React.createElement('label', { className: 'form-check-label' }, '緑系')
      ),
      React.createElement('div', { className: 'form-check' },
        React.createElement('input', {
          className: 'form-check-input',
          type: 'radio',
          name: 'faceColorTheme',
          checked: (display.faceColorTheme || 'blue') === 'colorful',
          onChange: () => updateDisplayState({ faceColorTheme: 'colorful' })
        }),
        React.createElement('label', { className: 'form-check-label' }, 'カラフル')
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
export function VertexLabelModal({ show, onClose }: { show: boolean, onClose: () => void }) {
  const defaultLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const [labels, setLabels] = useState<string[]>(defaultLabels);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (show) {
      const engine = (globalThis as any).__engine as Engine;
      if (engine && typeof engine.getVertexLabelMap === 'function') {
        const labelMap = engine.getVertexLabelMap();
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
      setErrorMessage("頂点ラベルは重複できません。");
      return;
    }
    const engine = (globalThis as any).__engine as Engine;
    if (engine && typeof engine.configureVertexLabels === 'function') {
      engine.configureVertexLabels(labels);
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
