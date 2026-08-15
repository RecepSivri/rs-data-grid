import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  destroy: vi.fn(),
  fetchNow: vi.fn(),
  createGrid: vi.fn(),
}));

// app.js imports createGrid via the package's own self-reference
// ('rs-data-grid-jquery'), not a relative path -- the mock specifier has to
// match that exactly for vi.mock to actually intercept it.
vi.mock('rs-data-grid-jquery', () => ({
  createGrid: mocks.createGrid,
}));

const { createApp } = await import('../src/app.js');
const { defaultGridConfig } = await import('../src/defaultGridConfig.js');

describe('app.js createApp', () => {
  let container;

  beforeEach(() => {
    mocks.render.mockClear();
    mocks.destroy.mockClear();
    mocks.fetchNow.mockClear();
    mocks.createGrid.mockClear();
    mocks.createGrid.mockReturnValue({ render: mocks.render, destroy: mocks.destroy, fetchNow: mocks.fetchNow });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('mount', () => {
    it('creates a full-size wrapper div, appends it to the container, and renders the grid with mapped props', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });

      expect(container.children.length).toBe(1);
      const wrapper = container.children[0];
      expect(wrapper.style.width).toBe('100%');
      expect(wrapper.style.minHeight).toBe('100vh');
      expect(wrapper.style.margin).toBe('0px');

      expect(mocks.render).toHaveBeenCalledTimes(1);
      const [renderedContainer, props] = mocks.render.mock.calls[0];
      expect(renderedContainer).toBe(wrapper);
      expect(props.fetchUrl).toBe(defaultGridConfig.fetchUrl);
      expect(props.fetchMethod).toBe(defaultGridConfig.apiMethod);
      expect(props.gridMode).toBe(defaultGridConfig.gridMode);
      expect(props.dataSource).toBe(defaultGridConfig.dataSource);
    });

    it('falls back to the default grid config when gridConfig is not supplied', () => {
      const app = createApp();
      app.mount(container, {});
      const [, props] = mocks.render.mock.calls[0];
      expect(props.fetchUrl).toBe(defaultGridConfig.fetchUrl);
    });

    it('defaults onRowAdd/onRowEdit/onRowDelete/onBatchSave to no-ops when not supplied', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      const [, props] = mocks.render.mock.calls[0];
      expect(props.onRowAdd).toBeTypeOf('function');
      expect(() => props.onRowAdd()).not.toThrow();
      expect(props.onRowEdit()).toBeUndefined();
      expect(props.onRowDelete()).toBeUndefined();
      expect(props.onBatchSave()).toBeUndefined();
    });

    it('passes through provided onRowAdd/onRowEdit/onRowDelete/onBatchSave callbacks unchanged', () => {
      const onRowAdd = vi.fn();
      const onRowEdit = vi.fn();
      const onRowDelete = vi.fn();
      const onBatchSave = vi.fn();
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, onRowAdd, onRowEdit, onRowDelete, onBatchSave });
      const [, props] = mocks.render.mock.calls[0];
      expect(props.onRowAdd).toBe(onRowAdd);
      expect(props.onRowEdit).toBe(onRowEdit);
      expect(props.onRowDelete).toBe(onRowDelete);
      expect(props.onBatchSave).toBe(onBatchSave);
    });

    it('records the initial fetchNonce without triggering a fetchNow on first mount', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 1 });
      expect(mocks.fetchNow).not.toHaveBeenCalled();
    });

    it('sets a white background for the light theme', () => {
      const app = createApp();
      app.mount(container, { gridConfig: { ...defaultGridConfig, theme: 'light' } });
      expect(container.children[0].style.background).toBe('rgb(255, 255, 255)');
    });

    it('sets a dark background for any non-light theme', () => {
      const app = createApp();
      app.mount(container, { gridConfig: { ...defaultGridConfig, theme: 'dark' } });
      expect(container.children[0].style.background).toBe('rgb(28, 30, 33)');
    });
  });

  describe('update', () => {
    it('re-renders the grid with freshly mapped props', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      mocks.render.mockClear();
      app.update({ gridConfig: defaultGridConfig });
      expect(mocks.render).toHaveBeenCalledTimes(1);
    });

    it('updates the background when the theme changes', () => {
      const app = createApp();
      app.mount(container, { gridConfig: { ...defaultGridConfig, theme: 'light' } });
      app.update({ gridConfig: { ...defaultGridConfig, theme: 'dark' } });
      expect(container.children[0].style.background).toBe('rgb(28, 30, 33)');
    });

    it('does not call fetchNow when fetchNonce is undefined', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      app.update({ gridConfig: defaultGridConfig });
      expect(mocks.fetchNow).not.toHaveBeenCalled();
    });

    it('does not call fetchNow when fetchNonce is unchanged from the last seen value', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 5 });
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 5 });
      expect(mocks.fetchNow).not.toHaveBeenCalled();
    });

    it('the first genuine fetchNonce change after mount is not swallowed (no isFirstFetchNonce skip)', () => {
      // A skip-the-first-real-change flag used to exist here and, combined
      // with the lastFetchNonce check, silently ate the very first real
      // Fetch click after every page load -- see app.js's own comment.
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig }); // fetchNonce undefined
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 1 }); // first defined value: genuine change
      expect(mocks.fetchNow).toHaveBeenCalledTimes(1);
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 2 }); // another genuine change
      expect(mocks.fetchNow).toHaveBeenCalledTimes(2);
    });
  });

  describe('unmount', () => {
    it('destroys the grid and removes the wrapper element from its parent', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      expect(container.children.length).toBe(1);
      app.unmount();
      expect(mocks.destroy).toHaveBeenCalledTimes(1);
      expect(container.children.length).toBe(0);
    });

    it('is safe to call when the wrapper has no parent (defensive guard)', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      const wrapper = container.children[0];
      container.removeChild(wrapper);
      expect(() => app.unmount()).not.toThrow();
    });
  });
});
