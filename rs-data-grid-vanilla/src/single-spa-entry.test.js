import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApp = { mount: vi.fn(), unmount: vi.fn(), update: vi.fn() };
const createApp = vi.fn(() => mockApp);
vi.mock('./app.js', () => ({ createApp: (...args) => createApp(...args) }));

const singleSpaEntry = await import('./single-spa-entry.js');

beforeEach(async () => {
  // appInstance is module-level singleton state that outlives any one test;
  // unmount() first so every test starts from the same "nothing mounted" baseline.
  await singleSpaEntry.unmount();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('bootstrap', () => {
  it('resolves', async () => {
    await expect(singleSpaEntry.bootstrap()).resolves.toBeUndefined();
  });
});

describe('mount', () => {
  it('uses props.domElement when given', async () => {
    const domElement = document.createElement('div');
    const props = { domElement };
    await singleSpaEntry.mount(props);
    expect(createApp).toHaveBeenCalledTimes(1);
    expect(mockApp.mount).toHaveBeenCalledWith(domElement, props);
  });

  it('falls back to #single-spa-application when domElement is omitted', async () => {
    const el = document.createElement('div');
    el.id = 'single-spa-application';
    document.body.appendChild(el);
    const props = {};
    await singleSpaEntry.mount(props);
    expect(mockApp.mount).toHaveBeenCalledWith(el, props);
  });

  it('resolves', async () => {
    await expect(singleSpaEntry.mount({ domElement: document.createElement('div') })).resolves.toBeUndefined();
  });
});

describe('unmount', () => {
  it('unmounts the current app instance and clears it', async () => {
    await singleSpaEntry.mount({ domElement: document.createElement('div') });
    await singleSpaEntry.unmount();
    expect(mockApp.unmount).toHaveBeenCalledTimes(1);
  });

  it('is a harmless no-op when nothing was ever mounted', async () => {
    await expect(singleSpaEntry.unmount()).resolves.toBeUndefined();
    expect(mockApp.unmount).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('forwards props to the current app instance', async () => {
    await singleSpaEntry.mount({ domElement: document.createElement('div') });
    const nextProps = { theme: 'dark' };
    await singleSpaEntry.update(nextProps);
    expect(mockApp.update).toHaveBeenCalledWith(nextProps);
  });

  it('is a harmless no-op when nothing was ever mounted', async () => {
    await expect(singleSpaEntry.update({})).resolves.toBeUndefined();
    expect(mockApp.update).not.toHaveBeenCalled();
  });

  it('is a no-op after unmount', async () => {
    await singleSpaEntry.mount({ domElement: document.createElement('div') });
    await singleSpaEntry.unmount();
    await singleSpaEntry.update({});
    expect(mockApp.update).not.toHaveBeenCalled();
  });
});
