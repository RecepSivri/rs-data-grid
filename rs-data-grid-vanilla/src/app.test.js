import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGrid = { render: vi.fn(), destroy: vi.fn(), fetchNow: vi.fn() };
const createGrid = vi.fn(() => mockGrid);
vi.mock('rs-data-grid-vanilla', () => ({ createGrid: (...args) => createGrid(...args) }));

const { createApp } = await import('./app.js');
const { defaultGridConfig } = await import('./defaultGridConfig.js');

let container;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
});

describe('mount', () => {
  it('creates a full-height wrapper, appends it, and renders the grid with mapped props', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig });
    expect(container.children.length).toBe(1);
    const wrapper = container.firstElementChild;
    expect(wrapper.style.width).toBe('100%');
    expect(wrapper.style.minHeight).toBe('100vh');
    expect(wrapper.style.margin).toBe('0px');
    expect(mockGrid.render).toHaveBeenCalledTimes(1);
    const [renderedEl, gridProps] = mockGrid.render.mock.calls[0];
    expect(renderedEl).toBe(wrapper);
    expect(gridProps.fetchUrl).toBe(defaultGridConfig.fetchUrl);
    expect(gridProps.fetchMethod).toBe(defaultGridConfig.apiMethod);
    expect(gridProps.fetchHeaders).toBe(defaultGridConfig.apiHeaders);
  });

  it('falls back to defaultGridConfig when no gridConfig prop is given', () => {
    const app = createApp();
    app.mount(container, {});
    const gridProps = mockGrid.render.mock.calls[0][1];
    expect(gridProps.fetchUrl).toBe(defaultGridConfig.fetchUrl);
  });

  it('gives onRowAdd/onRowEdit/onRowDelete/onBatchSave a noop fallback when omitted', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig });
    const gridProps = mockGrid.render.mock.calls[0][1];
    expect(() => gridProps.onRowAdd()).not.toThrow();
    expect(() => gridProps.onRowEdit()).not.toThrow();
    expect(() => gridProps.onRowDelete()).not.toThrow();
    expect(() => gridProps.onBatchSave()).not.toThrow();
  });

  it('passes through explicit onRowAdd/onRowEdit/onRowDelete/onBatchSave callbacks', () => {
    const onRowAdd = vi.fn();
    const onRowEdit = vi.fn();
    const onRowDelete = vi.fn();
    const onBatchSave = vi.fn();
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig, onRowAdd, onRowEdit, onRowDelete, onBatchSave });
    const gridProps = mockGrid.render.mock.calls[0][1];
    expect(gridProps.onRowAdd).toBe(onRowAdd);
    expect(gridProps.onRowEdit).toBe(onRowEdit);
    expect(gridProps.onRowDelete).toBe(onRowDelete);
    expect(gridProps.onBatchSave).toBe(onBatchSave);
  });

  it('sets a white background for the light theme', () => {
    const app = createApp();
    app.mount(container, { gridConfig: { ...defaultGridConfig, theme: 'light' } });
    expect(container.firstElementChild.style.background).toBe('rgb(255, 255, 255)');
  });

  it('sets a dark background for any non-light theme', () => {
    const app = createApp();
    app.mount(container, { gridConfig: { ...defaultGridConfig, theme: 'dark' } });
    expect(container.firstElementChild.style.background).toBe('rgb(28, 30, 33)');
  });

  it('seeds lastFetchNonce from the initial props (so that exact value later is not treated as a new change)', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 5 });
    app.update({ gridConfig: defaultGridConfig, fetchNonce: 5 });
    expect(mockGrid.fetchNow).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('re-renders the grid with freshly mapped props', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig });
    app.update({ gridConfig: { ...defaultGridConfig, theme: 'dark' } });
    expect(mockGrid.render).toHaveBeenCalledTimes(2);
    expect(container.firstElementChild.style.background).toBe('rgb(28, 30, 33)');
  });

  it('triggers fetchNow on a genuine fetchNonce change', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 1 });
    app.update({ gridConfig: defaultGridConfig, fetchNonce: 2 });
    expect(mockGrid.fetchNow).toHaveBeenCalledTimes(1);
  });

  it('does not trigger fetchNow when fetchNonce is unchanged', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 1 });
    app.update({ gridConfig: defaultGridConfig, fetchNonce: 1 });
    expect(mockGrid.fetchNow).not.toHaveBeenCalled();
  });

  it('does not trigger fetchNow when fetchNonce is undefined', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig });
    app.update({ gridConfig: defaultGridConfig });
    expect(mockGrid.fetchNow).not.toHaveBeenCalled();
  });

  it('the very first real Fetch click after mount is not swallowed', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: undefined });
    app.update({ gridConfig: defaultGridConfig, fetchNonce: 1 });
    expect(mockGrid.fetchNow).toHaveBeenCalledTimes(1);
  });
});

describe('unmount', () => {
  it('destroys the grid and removes the wrapper', () => {
    const app = createApp();
    app.mount(container, { gridConfig: defaultGridConfig });
    app.unmount();
    expect(mockGrid.destroy).toHaveBeenCalledTimes(1);
    expect(container.children.length).toBe(0);
  });

  it('is safe to call without a wrapper ever having been mounted', () => {
    const app = createApp();
    expect(() => app.unmount()).not.toThrow();
    expect(mockGrid.destroy).toHaveBeenCalledTimes(1);
  });
});
