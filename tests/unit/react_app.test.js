import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const createElement = () => ({
  classList: { add: vi.fn(), remove: vi.fn() },
});

describe('reactApp init', () => {
  beforeEach(() => {
    const elements = new Map();
    elements.set('react-root', createElement());
    elements.set('react-settings-root', createElement());
    elements.set('react-user-presets-root', createElement());
    elements.set('react-learning-root', createElement());
    elements.set('react-learning-header-root', createElement());
    elements.set('react-topbar-root', createElement());

    global.document = /** @type {any} */ ({
      getElementById: (id) => elements.get(id) || null,
    });
  });

  afterEach(() => {
    delete global.document;
    vi.resetModules();
  });

  it.skip('should mount react roots', async () => {
    vi.mock('react-dom/client', () => ({
      createRoot: vi.fn(() => ({ render: vi.fn() })),
    }));

    const { initReactApp } = await import('../../dist/js/ui/reactApp.js');
    const { createRoot } = await import('react-dom/client');

    initReactApp();

    expect(createRoot).toHaveBeenCalledTimes(6);
  });

  it.skip('should call configureVertexLabels helper', async () => {
    const configure = vi.fn();
    global.__engine = { configureVertexLabels: configure };

    const { invokeConfigureVertexLabels } = await import('../../dist/js/ui/reactApp.js');
    invokeConfigureVertexLabels();

    expect(configure).toHaveBeenCalled();
  });

  it.skip('should call configureCube helper', async () => {
    const configure = vi.fn();
    global.__engine = { configureCube: configure };

    const { invokeConfigureCube } = await import('../../dist/js/ui/reactApp.js');
    invokeConfigureCube();

    expect(configure).toHaveBeenCalled();
  });
});
