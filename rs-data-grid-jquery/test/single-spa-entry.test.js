import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mount: vi.fn(),
  update: vi.fn(),
  unmount: vi.fn(),
  createApp: vi.fn(),
}));

vi.mock('../src/app.js', () => ({
  createApp: mocks.createApp,
}));

const spaEntry = await import('../src/single-spa-entry.js');

describe('single-spa-entry.js lifecycle', () => {
  beforeEach(() => {
    mocks.mount.mockClear();
    mocks.update.mockClear();
    mocks.unmount.mockClear();
    mocks.createApp.mockClear();
    mocks.createApp.mockReturnValue({ mount: mocks.mount, update: mocks.update, unmount: mocks.unmount });
    document.body.innerHTML = '';
  });

  it('bootstrap resolves a promise without side effects', async () => {
    await expect(spaEntry.bootstrap()).resolves.toBeUndefined();
    expect(mocks.createApp).not.toHaveBeenCalled();
  });

  describe('mount', () => {
    it('uses props.domElement when provided and mounts a fresh app instance into it', async () => {
      const domElement = document.createElement('div');
      const props = { domElement, gridConfig: {} };
      await spaEntry.mount(props);
      expect(mocks.createApp).toHaveBeenCalledTimes(1);
      expect(mocks.mount).toHaveBeenCalledWith(domElement, props);
    });

    it('falls back to #single-spa-application when props.domElement is absent', async () => {
      const el = document.createElement('div');
      el.id = 'single-spa-application';
      document.body.appendChild(el);
      const props = { gridConfig: {} };
      await spaEntry.mount(props);
      expect(mocks.mount).toHaveBeenCalledWith(el, props);
    });

    it('resolves a promise', async () => {
      const props = { domElement: document.createElement('div') };
      await expect(spaEntry.mount(props)).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    it('forwards props to the mounted app instance', async () => {
      const props = { domElement: document.createElement('div') };
      await spaEntry.mount(props);
      const nextProps = { domElement: props.domElement, gridConfig: { fetchUrl: 'x' } };
      await spaEntry.update(nextProps);
      expect(mocks.update).toHaveBeenCalledWith(nextProps);
    });

    it('is a safe no-op when called before any mount (optional-chaining guard)', async () => {
      await spaEntry.unmount(); // ensure appInstance is null
      await expect(spaEntry.update({})).resolves.toBeUndefined();
      expect(mocks.update).not.toHaveBeenCalled();
    });
  });

  describe('unmount', () => {
    it('unmounts the current app instance and clears it', async () => {
      const props = { domElement: document.createElement('div') };
      await spaEntry.mount(props);
      await spaEntry.unmount();
      expect(mocks.unmount).toHaveBeenCalledTimes(1);
    });

    it('a second unmount call is a safe no-op (appInstance already null)', async () => {
      const props = { domElement: document.createElement('div') };
      await spaEntry.mount(props);
      await spaEntry.unmount();
      mocks.unmount.mockClear();
      await expect(spaEntry.unmount()).resolves.toBeUndefined();
      expect(mocks.unmount).not.toHaveBeenCalled();
    });

    it('resolves a promise', async () => {
      await expect(spaEntry.unmount()).resolves.toBeUndefined();
    });
  });
});
