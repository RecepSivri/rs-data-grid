import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGrid = { render: vi.fn(), destroy: vi.fn(), fetchNow: vi.fn() };
vi.mock('../src/rsDataGrid/rsDataGrid.js', () => ({ createGrid: () => mockGrid }));

const { createApp } = await import('../src/app.js');
const { defaultGridConfig } = await import('../src/defaultGridConfig.js');

describe('app.js (createApp)', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mockGrid.render.mockClear();
    mockGrid.destroy.mockClear();
    mockGrid.fetchNow.mockClear();
  });

  describe('mount', () => {
    it('creates a full-width/min-height wrapper div and appends it to the container', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      const wrapper = container.firstElementChild;
      expect(wrapper).not.toBeNull();
      expect(wrapper.style.width).toBe('100%');
      expect(wrapper.style.minHeight).toBe('100vh');
      expect(wrapper.style.margin).toBe('0px');
    });

    it('calls grid.render with the wrapper element and mapped props', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      expect(mockGrid.render).toHaveBeenCalledTimes(1);
      const [renderedEl, renderedProps] = mockGrid.render.mock.calls[0];
      expect(renderedEl).toBe(container.firstElementChild);
      expect(renderedProps.fetchUrl).toBe(defaultGridConfig.fetchUrl);
      expect(renderedProps.gridMode).toBe(defaultGridConfig.gridMode);
    });

    it('falls back to defaultGridConfig when props.gridConfig is not supplied', () => {
      const app = createApp();
      app.mount(container, {});
      const [, renderedProps] = mockGrid.render.mock.calls[0];
      expect(renderedProps.fetchUrl).toBe(defaultGridConfig.fetchUrl);
      expect(renderedProps.pagination).toBe(defaultGridConfig.pagination);
    });

    it('defaults onRowAdd/onRowEdit/onRowDelete/onBatchSave to no-ops when not supplied', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      const [, renderedProps] = mockGrid.render.mock.calls[0];
      expect(() => renderedProps.onRowAdd({})).not.toThrow();
      expect(() => renderedProps.onRowEdit({})).not.toThrow();
      expect(() => renderedProps.onRowDelete({})).not.toThrow();
      expect(() => renderedProps.onBatchSave({})).not.toThrow();
    });

    it('forwards real onRowAdd/onRowEdit/onRowDelete/onBatchSave callbacks when supplied', () => {
      const onRowAdd = vi.fn();
      const onRowEdit = vi.fn();
      const onRowDelete = vi.fn();
      const onBatchSave = vi.fn();
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, onRowAdd, onRowEdit, onRowDelete, onBatchSave });
      const [, renderedProps] = mockGrid.render.mock.calls[0];
      renderedProps.onRowAdd({ a: 1 });
      renderedProps.onRowEdit({ b: 2 });
      renderedProps.onRowDelete({ c: 3 });
      renderedProps.onBatchSave({ d: 4 });
      expect(onRowAdd).toHaveBeenCalledWith({ a: 1 });
      expect(onRowEdit).toHaveBeenCalledWith({ b: 2 });
      expect(onRowDelete).toHaveBeenCalledWith({ c: 3 });
      expect(onBatchSave).toHaveBeenCalledWith({ d: 4 });
    });
  });

  describe('update / fetchNonce handling', () => {
    it('does not call grid.fetchNow when fetchNonce is undefined', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      app.update({ gridConfig: defaultGridConfig });
      expect(mockGrid.fetchNow).not.toHaveBeenCalled();
    });

    it('does not call grid.fetchNow on the first fetchNonce value seen (skip-first)', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 0 });
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 0 });
      expect(mockGrid.fetchNow).not.toHaveBeenCalled();
    });

    it('calls grid.fetchNow when fetchNonce genuinely changes, but not on the update that first observes a change (skip-first applies to the first handleFetchNonce invocation, not just mount)', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 0 });
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 1 }); // first-ever handleFetchNonce call -> skipped
      expect(mockGrid.fetchNow).not.toHaveBeenCalled();
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 2 }); // second change -> fires
      expect(mockGrid.fetchNow).toHaveBeenCalledTimes(1);
    });

    it('does not call grid.fetchNow again for an update that repeats the same fetchNonce (unrelated settings push)', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig, fetchNonce: 0 });
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 1 });
      app.update({ gridConfig: defaultGridConfig, fetchNonce: 2 });
      app.update({ gridConfig: { ...defaultGridConfig, showFilter: false }, fetchNonce: 2 });
      expect(mockGrid.fetchNow).toHaveBeenCalledTimes(1);
    });

    it('always calls grid.render again on update, even without a fetchNonce change', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      mockGrid.render.mockClear();
      app.update({ gridConfig: { ...defaultGridConfig, borderRadiusTop: false } });
      expect(mockGrid.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('unmount', () => {
    it('does not throw when called before mount() (no wrapperEl to remove yet)', () => {
      const app = createApp();
      expect(() => app.unmount()).not.toThrow();
      expect(mockGrid.destroy).toHaveBeenCalledTimes(1);
    });

    it('calls grid.destroy and removes the wrapper element from the DOM', () => {
      const app = createApp();
      app.mount(container, { gridConfig: defaultGridConfig });
      expect(container.children.length).toBe(1);
      app.unmount();
      expect(mockGrid.destroy).toHaveBeenCalledTimes(1);
      expect(container.children.length).toBe(0);
    });
  });
});
