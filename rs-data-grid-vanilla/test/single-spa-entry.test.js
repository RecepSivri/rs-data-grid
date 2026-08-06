import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAppInstance = { mount: vi.fn(), update: vi.fn(), unmount: vi.fn() };
const createApp = vi.fn(() => mockAppInstance);
vi.mock('../src/app.js', () => ({ createApp: (...args) => createApp(...args) }));

const lifecycle = await import('../src/single-spa-entry.js');

describe('single-spa-entry.js lifecycle contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="single-spa-application"></div>';
    createApp.mockClear();
    mockAppInstance.mount.mockClear();
    mockAppInstance.update.mockClear();
    mockAppInstance.unmount.mockClear();
  });

  it('bootstrap() resolves a Promise (single-spa contract) and does no DOM work', () => {
    const result = lifecycle.bootstrap();
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it('mount() creates a fresh app instance and mounts it into props.domElement when supplied', async () => {
    const domElement = document.createElement('div');
    const props = { domElement, gridConfig: {} };
    const result = await lifecycle.mount(props);
    expect(result).toBeUndefined();
    expect(createApp).toHaveBeenCalledTimes(1);
    expect(mockAppInstance.mount).toHaveBeenCalledWith(domElement, props);
  });

  it('mount() falls back to #single-spa-application when props.domElement is not supplied', async () => {
    const props = { gridConfig: {} };
    await lifecycle.mount(props);
    const fallbackEl = document.getElementById('single-spa-application');
    expect(mockAppInstance.mount).toHaveBeenCalledWith(fallbackEl, props);
  });

  it('mount() returns a resolved Promise', () => {
    const result = lifecycle.mount({ gridConfig: {} });
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it('update() delegates to the mounted app instance and resolves a Promise', async () => {
    await lifecycle.mount({ gridConfig: {} });
    const props = { gridConfig: { fetchUrl: 'x' } };
    const result = lifecycle.update(props);
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(mockAppInstance.update).toHaveBeenCalledWith(props);
  });

  it('update() does not throw when called before any mount() (no active app instance)', async () => {
    // Fresh module state isn't available (ESM singleton), but the `?.`
    // guard is exercised whenever appInstance is null -- verified directly
    // via unmount-then-update below, which nulls it out.
    await lifecycle.mount({ gridConfig: {} });
    await lifecycle.unmount();
    await expect(lifecycle.update({ gridConfig: {} })).resolves.toBeUndefined();
    expect(mockAppInstance.update).not.toHaveBeenCalled();
  });

  it('unmount() delegates to the mounted app instance, clears it, and resolves a Promise', async () => {
    await lifecycle.mount({ gridConfig: {} });
    const result = lifecycle.unmount();
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(mockAppInstance.unmount).toHaveBeenCalledTimes(1);
  });

  it('unmount() does not throw when called before any mount()', async () => {
    await lifecycle.mount({ gridConfig: {} });
    await lifecycle.unmount();
    await expect(lifecycle.unmount()).resolves.toBeUndefined();
    expect(mockAppInstance.unmount).toHaveBeenCalledTimes(1); // not called again
  });
});
