import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mount: vi.fn(),
  createApp: vi.fn(),
}));

vi.mock('../src/app.js', () => ({
  createApp: mocks.createApp,
}));

describe('main.js standalone dev entry', () => {
  beforeEach(() => {
    mocks.mount.mockClear();
    mocks.createApp.mockClear();
    mocks.createApp.mockReturnValue({ mount: mocks.mount });
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('creates an app and mounts it into #single-spa-application with the default grid config, as an import-time side effect', async () => {
    const container = document.createElement('div');
    container.id = 'single-spa-application';
    document.body.appendChild(container);

    await import('../src/main.js');
    const { defaultGridConfig } = await import('../src/defaultGridConfig.js');

    expect(mocks.createApp).toHaveBeenCalledTimes(1);
    expect(mocks.mount).toHaveBeenCalledTimes(1);
    expect(mocks.mount).toHaveBeenCalledWith(container, { gridConfig: defaultGridConfig });
  });
});
