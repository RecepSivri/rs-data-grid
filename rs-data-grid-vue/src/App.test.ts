import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';

const { fetchNowMock, RsDataGridStub } = vi.hoisted(() => {
  const fetchNowMock = vi.fn();
  const RsDataGridStub = {
    name: 'RsDataGrid',
    props: [
      'theme', 'fetchUrl', 'fetchMethod', 'fetchHeaders', 'authToken', 'entrySection', 'remoteMode', 'dataSource',
      'defaultVisibleColumns', 'headerRowLines', 'headerColumnLines', 'showFilter', 'showSort', 'showSearch',
      'showActions', 'showAdd', 'showGridSettings', 'showIndex', 'gridMode', 'exportExcel', 'exportPDF',
      'bodyRowLines', 'bodyColumnLines', 'tableBorder', 'borderRadiusTop', 'borderRadiusBottom', 'diagonalRow',
      'dragDropColumns', 'dragDropRows', 'pagination', 'pagingSizes', 'currentPagingSize', 'pageListSize',
    ],
    emits: ['rowAdd', 'rowEdit', 'rowDelete', 'batchSave'],
    template: '<div class="rs-data-grid-stub" :data-props="JSON.stringify($props)"></div>',
    methods: { fetchNow: fetchNowMock },
  };
  return { fetchNowMock, RsDataGridStub };
});

vi.mock('rs-data-grid-vue', () => ({ RsDataGrid: RsDataGridStub }));

const { default: App } = await import('./App.vue');

let activeWrapper: VueWrapper | null = null;

async function mountApp(props: Record<string, unknown> = {}) {
  activeWrapper = mount(App, { props, attachTo: document.body });
  await activeWrapper.vm.$nextTick();
  return activeWrapper;
}

const stubProps = () => JSON.parse((document.body.querySelector('.rs-data-grid-stub') as HTMLElement).dataset.props!);

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('gridConfig', () => {
  it('falls back to the built-in defaultGridConfig when no gridConfig prop is given', async () => {
    await mountApp();
    expect(stubProps().fetchUrl).toContain('gist.githubusercontent.com');
    expect(stubProps().gridMode).toBe('popup');
  });

  it('uses the provided gridConfig prop instead of the default', async () => {
    await mountApp({ gridConfig: { theme: 'dark', dataSource: [{ id: 1 }], gridMode: 'batch' } });
    expect(stubProps().dataSource).toEqual([{ id: 1 }]);
    expect(stubProps().gridMode).toBe('batch');
  });
});

describe('background style', () => {
  it('renders a light background for the light theme', async () => {
    const wrapper = await mountApp({ gridConfig: { theme: 'light', dataSource: [] } });
    expect(wrapper.element.getAttribute('style')).toContain('background: rgb(255, 255, 255)');
  });

  it('renders a dark background for the dark theme', async () => {
    const wrapper = await mountApp({ gridConfig: { theme: 'dark', dataSource: [] } });
    expect(wrapper.element.getAttribute('style')).toContain('background: rgb(28, 30, 33)');
  });
});

describe('fetchNonce -> imperative fetchNow', () => {
  it('does not call fetchNow on initial mount (no immediate)', async () => {
    await mountApp({ gridConfig: { dataSource: [] } });
    expect(fetchNowMock).not.toHaveBeenCalled();
  });

  it('calls fetchNow when fetchNonce changes to a defined value', async () => {
    const wrapper = await mountApp({ gridConfig: { dataSource: [] } });
    await wrapper.setProps({ fetchNonce: 1 });
    expect(fetchNowMock).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ fetchNonce: 2 });
    expect(fetchNowMock).toHaveBeenCalledTimes(2);
  });

  it('does not call fetchNow when fetchNonce changes back to undefined', async () => {
    const wrapper = await mountApp({ gridConfig: { dataSource: [] }, fetchNonce: 1 });
    await wrapper.setProps({ fetchNonce: undefined });
    expect(fetchNowMock).not.toHaveBeenCalled();
  });
});

describe('event forwarding', () => {
  it('forwards row-add/row-edit/row-delete/batch-save to the corresponding on* props', async () => {
    const onRowAdd = vi.fn();
    const onRowEdit = vi.fn();
    const onRowDelete = vi.fn();
    const onBatchSave = vi.fn();
    const wrapper = await mountApp({ gridConfig: { dataSource: [] }, onRowAdd, onRowEdit, onRowDelete, onBatchSave });
    const stub = wrapper.findComponent({ name: 'RsDataGrid' });
    stub.vm.$emit('rowAdd', { id: 1 });
    stub.vm.$emit('rowEdit', { id: 2 });
    stub.vm.$emit('rowDelete', { id: 3 });
    stub.vm.$emit('batchSave', { added: [], updated: [] });
    expect(onRowAdd).toHaveBeenCalledWith({ id: 1 });
    expect(onRowEdit).toHaveBeenCalledWith({ id: 2 });
    expect(onRowDelete).toHaveBeenCalledWith({ id: 3 });
    expect(onBatchSave).toHaveBeenCalledWith({ added: [], updated: [] });
  });
});
