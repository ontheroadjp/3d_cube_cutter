import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const createElement = () => ({
  classList: { add: vi.fn(), remove: vi.fn() },
});

describe('reactApp init', () => {
  beforeEach(() => {
    const elements = new Map();
    elements.set('react-root', createElement());
    elements.set('react-settings-root', createElement());
    elements.set('react-preset-root', createElement());
    elements.set('react-user-presets-root', createElement());
    elements.set('presetButtons', createElement());

    global.document = /** @type {any} */ ({
      getElementById: (id) => elements.get(id) || null,
    });
  });

  afterEach(() => {
    delete global.document;
    vi.resetModules();
  });

  it('should mount react roots and hide legacy preset buttons', async () => {
    vi.mock('react-dom/client', () => ({
      createRoot: vi.fn(() => ({ render: vi.fn() })),
    }));

    const { initReactApp } = await import('../../dist/js/ui/reactApp.js');
    const { createRoot } = await import('react-dom/client');

    initReactApp();

    expect(createRoot).toHaveBeenCalledTimes(4);
    const legacy = document.getElementById('presetButtons');
    expect(legacy.classList.add).toHaveBeenCalledWith('d-none');
  });

  it('should call configureVertexLabels helper', async () => {
    const configure = vi.fn();
    global.__engine = { configureVertexLabels: configure };

    const { invokeConfigureVertexLabels } = await import('../../dist/js/ui/reactApp.js');
    invokeConfigureVertexLabels();

    expect(configure).toHaveBeenCalled();
  });

  it('should call configureCube helper', async () => {
    const configure = vi.fn();
    global.__engine = { configureCube: configure };

    const { invokeConfigureCube } = await import('../../dist/js/ui/reactApp.js');
    invokeConfigureCube();

    expect(configure).toHaveBeenCalled();
  });
});
