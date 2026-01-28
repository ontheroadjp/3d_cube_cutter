import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DisplayState, LearningProblem, Preset, UserPresetState } from '../types.js'; // Keep for ExplanationPanel if it needs LearningProblem
import { initSidePanel } from './side_panel.js';


declare global {
  var __engine: Engine | undefined;
  var __setExplanation: ((text: string) => void) | undefined;
  var __setDisplayState: ((display: DisplayState | null) => void) | undefined;
  var __setReactMode: ((mode: string) => void) | undefined;
  var __setUiMode: ((mode: 'rotate' | 'cut' | 'net') => void) | undefined;
  var __refreshUserPresets: (() => void) | undefined;
}

// Minimal Engine type for globalThis.__engine in reactApp.ts if side_panel.ts is defining the comprehensive one
// This is a fallback to avoid errors if main.ts defines a more comprehensive one.
// The true Engine type is in side_panel.ts
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
  listUserPresets?: () => UserPresetState[];
  isUserPresetStorageEnabled?: () => boolean;
  saveUserPreset?: (form: UserPresetForm) => Promise<void> | void; // UserPresetForm is needed here too
  cancelUserPresetEdit?: () => void;
  applyUserPreset?: (id: string) => void;
  editUserPreset?: (id: string) => void;
  deleteUserPreset?: (id: string) => void;
  configureVertexLabels?: (labels: string[]) => void;
  getVertexLabelMap?: () => Record<string, string> | null;
  configureCube?: (lx: number, ly: number, lz: number) => void;
  getCubeSize?: () => { lx: number; ly: number; lz: number };
  setPanelOpen?: (open: boolean) => void;
  getUiMode?: () => 'rotate' | 'cut' | 'net';
  setUiMode?: (mode: 'rotate' | 'cut' | 'net') => void;
  startNetSelection?: () => void;
  startNetUnfold?: () => void;
  startNetFold?: () => void;
  getNetStateName?: () => string;
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

type UserPresetForm = {
  name: string;
  category: string;
  description: string;
};

const panelStyle = {
  position: 'absolute',
  top: '64px',
  left: '12px',
  width: '320px',
  maxWidth: '70vw',
  zIndex: 40,
};

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

function ModeBar() {
  const [mode, setMode] = useState<'rotate' | 'cut' | 'net'>('rotate');

  useEffect(() => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.getUiMode === 'function') {
      setMode(engine.getUiMode());
    }
    globalThis.__setUiMode = (next) => {
      setMode(next);
    };
    return () => {
      if (globalThis.__setUiMode) {
        delete globalThis.__setUiMode;
      }
    };
  }, []);

  const handleModeChange = (next: 'rotate' | 'cut' | 'net') => {
    const engine = globalThis.__engine;
    if (engine && typeof engine.setUiMode === 'function') {
      engine.setUiMode(next);
    }
  };

  return (
    React.createElement(React.Fragment, null,
      React.createElement('button', {
        type: 'button',
        className: `mode-button ${mode === 'rotate' ? 'is-active' : ''}`,
        onClick: () => handleModeChange('rotate')
      }, '回転'),
      React.createElement('button', {
        type: 'button',
        className: `mode-button ${mode === 'cut' ? 'is-active' : ''}`,
        onClick: () => handleModeChange('cut')
      }, '切断'),
      React.createElement('button', {
        type: 'button',
        className: `mode-button ${mode === 'net' ? 'is-active' : ''}`,
        onClick: () => handleModeChange('net')
      }, '展開')
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

  const modeRootEl = document.getElementById('mode-bar-root');
  if (modeRootEl) {
    const modeRoot = createRoot(modeRootEl);
    modeRoot.render(React.createElement(ModeBar));
  }

  initSidePanel(); // Call the new SidePanel initialization
}
