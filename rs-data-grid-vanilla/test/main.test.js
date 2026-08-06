import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAppInstance = { mount: vi.fn() };
const createApp = vi.fn(() => mockAppInstance);
vi.mock('../src/app.js', () => ({ createApp: (...args) => createApp(...args) }));

describe('main.js (standalone dev entry)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="single-spa-application"></div>';
  });

  it('mounts a fresh app instance into #single-spa-application with defaultGridConfig', async () => {
    await import('../src/main.js');
    const { defaultGridConfig } = await import('../src/defaultGridConfig.js');
    const container = document.getElementById('single-spa-application');
    expect(createApp).toHaveBeenCalledTimes(1);
    expect(mockAppInstance.mount).toHaveBeenCalledWith(container, { gridConfig: defaultGridConfig });
  });
});
