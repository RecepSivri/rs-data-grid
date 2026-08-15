import { describe, expect, it, vi } from 'vitest';

const mockApp = { mount: vi.fn() };
const createApp = vi.fn(() => mockApp);
vi.mock('./app.js', () => ({ createApp: (...args) => createApp(...args) }));

describe('main.js standalone dev entry', () => {
  it('mounts the app into #single-spa-application with defaultGridConfig', async () => {
    const container = document.createElement('div');
    container.id = 'single-spa-application';
    document.body.appendChild(container);

    await import('./main.js');
    const { defaultGridConfig } = await import('./defaultGridConfig.js');

    expect(createApp).toHaveBeenCalledTimes(1);
    expect(mockApp.mount).toHaveBeenCalledWith(container, { gridConfig: defaultGridConfig });
  });
});
