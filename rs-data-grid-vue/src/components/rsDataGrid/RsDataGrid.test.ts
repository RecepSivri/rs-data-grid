import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import RsDataGrid from './RsDataGrid.vue';
import { createTestVuetify } from '../../test/vuetifyTestPlugin';

const { xlsxUtils, xlsxWriteFile, autoTable, jsPdfSave, JsPdfCtor } = vi.hoisted(() => {
  function JsPdfCtor(this: any) {
    this.save = jsPdfSave;
  }
  const jsPdfSave = vi.fn();
  return {
    xlsxUtils: {
      json_to_sheet: vi.fn(() => 'sheet'),
      book_new: vi.fn(() => 'workbook'),
      book_append_sheet: vi.fn(),
    },
    xlsxWriteFile: vi.fn(),
    autoTable: vi.fn(),
    jsPdfSave,
    JsPdfCtor,
  };
});

vi.mock('xlsx', () => ({ utils: xlsxUtils, writeFile: (...args: unknown[]) => xlsxWriteFile(...args) }));
vi.mock('jspdf-autotable', () => ({ default: (...args: unknown[]) => autoTable(...args) }));
vi.mock('jspdf', () => ({ default: JsPdfCtor }));

const rows = [
  { title: 'Movie A', year: '2020' },
  { title: 'Movie B', year: '2021' },
  { title: 'Movie C', year: '2022' },
];

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  theme: 'light',
  dataSource: rows,
  fetchUrl: '',
  headerRowLines: true,
  headerColumnLines: true,
  bodyRowLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusTop: false,
  borderRadiusBottom: false,
  diagonalRow: false,
  dragDropRows: false,
  dragDropColumns: false,
  pagination: false,
  pagingSizes: [10, 20],
  currentPagingSize: 10,
  pageListSize: 5,
  showFilter: false,
  showSort: false,
  showSearch: false,
  showActions: true,
  showAdd: false,
  showGridSettings: true,
  showIndex: false,
  exportExcel: false,
  exportPDF: false,
  gridMode: 'popup',
  ...overrides,
});

let activeWrapper: VueWrapper | null = null;

async function mountGrid(props: Record<string, unknown> = {}) {
  activeWrapper = mount(RsDataGrid, {
    props: baseProps(props),
    global: { plugins: [createTestVuetify()] },
    attachTo: document.body,
  });
  await activeWrapper.vm.$nextTick();
  await activeWrapper.vm.$nextTick();
  return activeWrapper;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await activeWrapper?.vm.$nextTick();
    await Promise.resolve();
  }
};
const dataRows = () => Array.from(document.body.querySelectorAll('.column-layout > .full-row'));
const toolbarButton = (title: string) => document.body.querySelector(`.export-button[title="${title}"]`) as HTMLElement | null;

describe('mount / data loading', () => {
  it('loads the given dataSource and renders rows on first render', async () => {
    await mountGrid();
    expect(dataRows().length).toBe(3);
  });

  it('shows the empty state when dataSource is empty and no fetchUrl is set', async () => {
    await mountGrid({ dataSource: [] });
    expect(document.body.querySelector('.grid-state-empty')?.textContent).toBe('No data to display.');
  });

  it('fetches from fetchUrl when dataSource is empty', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(rows) });
    await mountGrid({ dataSource: [], fetchUrl: 'https://api.example.com/movies' });
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', expect.objectContaining({ method: 'GET' }));
    expect(dataRows().length).toBe(3);
  });

  it('sends an Authorization header built from authToken, merged with any fetchHeaders', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    await mountGrid({ dataSource: [], fetchUrl: 'https://api.example.com/movies', authToken: 'secret', fetchHeaders: { 'X-Custom': '1' } });
    await flush();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/movies',
      expect.objectContaining({ headers: { 'X-Custom': '1', Authorization: 'Bearer secret' } })
    );
  });

  it('omits the headers object entirely when there is nothing to send', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    await mountGrid({ dataSource: [], fetchUrl: 'https://api.example.com/movies' });
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', expect.objectContaining({ headers: undefined }));
  });

  it('remote mode with an empty dataSource fetches via remoteModeParams', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ items: rows, size: 3 }) });
    await mountGrid({
      dataSource: [],
      remoteMode: true,
      remoteModeParams: { endpoint: 'https://api.example.com/movies', aliases: { data: 'items' } },
    });
    await flush();
    expect(global.fetch).toHaveBeenCalled();
    expect(dataRows().length).toBe(3);
  });

  it('remote mode with a non-empty dataSource uses it directly (no fetch)', async () => {
    await mountGrid({ remoteMode: true, remoteModeParams: { endpoint: 'https://x', aliases: { data: 'items' } } });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(dataRows().length).toBe(3);
  });

  it('shows a default error state (with the error message) when the fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });
    await mountGrid({ dataSource: [], fetchUrl: 'https://api.example.com/movies' });
    await flush();
    expect(document.body.querySelector('.grid-state-error')?.textContent).toContain('Request failed with status 500');
  });

  it('falls back to a generic error message when the error has none', async () => {
    (global.fetch as any).mockRejectedValueOnce('');
    await mountGrid({ dataSource: [], fetchUrl: 'https://api.example.com/movies' });
    await flush();
    expect(document.body.querySelector('.grid-state-error')?.textContent).toContain('Something went wrong while loading data.');
  });

  it('shows an inline "No matching rows" state when a filter/search leaves nothing, without unmounting the header', async () => {
    const wrapper = await mountGrid({ showSearch: true });
    const input = document.body.querySelector('.global-search-input') as HTMLInputElement;
    input.value = 'nonexistent movie title';
    input.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.grid-state-empty-inline')?.textContent).toBe('No matching rows.');
    expect(document.body.querySelector('.header-caption')).not.toBeNull();
  });

  it('fetchNow() resets Grid Settings selection and reloads', async () => {
    const wrapper = await mountGrid({ showGridSettings: true });
    (wrapper.vm as any).fetchNow();
    await flush();
    expect(dataRows().length).toBe(3);
  });
});

describe('columns: inference, drag-reorder persistence, Grid Settings filtering', () => {
  it('infers columns from the data shape when none are given', async () => {
    await mountGrid();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('uses explicit columns when given, ignoring inferred ones', async () => {
    await mountGrid({ columns: [{ caption: 'Title', dataField: 'title' }] });
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title']);
  });

  it('reorders columns via drag-and-drop and keeps the order across a data update', async () => {
    const wrapper = await mountGrid({ dragDropColumns: true });
    const dragHandles = document.body.querySelectorAll('.drag-handle');
    dragHandles[0].dispatchEvent(new Event('dragstart'));
    const cells = document.body.querySelectorAll('.content-style');
    cells[1].dispatchEvent(new Event('drop'));
    await wrapper.vm.$nextTick();
    let captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Title']);

    await wrapper.setProps({ dataSource: [...rows, { title: 'Movie D', year: '2023' }] });
    await wrapper.vm.$nextTick();
    captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Title']);
  });

  it('drops fields from the retained drag order once they no longer exist, and appends genuinely new fields at the end', async () => {
    const wrapper = await mountGrid({ dragDropColumns: true });
    document.body.querySelectorAll('.drag-handle')[0].dispatchEvent(new Event('dragstart'));
    document.body.querySelectorAll('.content-style')[1].dispatchEvent(new Event('drop'));
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ dataSource: [{ year: '2020', genre: 'Action' }] });
    await wrapper.vm.$nextTick();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Genre']);
  });

  it('dropping a dragged column onto itself is a no-op', async () => {
    const wrapper = await mountGrid({ dragDropColumns: true });
    const before = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    document.body.querySelectorAll('.drag-handle')[0].dispatchEvent(new Event('dragstart'));
    document.body.querySelectorAll('.content-style')[0].dispatchEvent(new Event('drop'));
    await wrapper.vm.$nextTick();
    const after = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(after).toEqual(before);
  });

  it('dragging a column backward (later index onto an earlier one) reorders correctly', async () => {
    const wrapper = await mountGrid({
      dragDropColumns: true,
      columns: [
        { caption: 'Title', dataField: 'title' },
        { caption: 'Year', dataField: 'year' },
        { caption: 'Genre', dataField: 'genre' },
      ],
      dataSource: [{ title: 'A', year: '2020', genre: 'Action' }],
    });
    const handles = document.body.querySelectorAll('.drag-handle');
    handles[2].dispatchEvent(new Event('dragstart'));
    document.body.querySelectorAll('.content-style')[0].dispatchEvent(new Event('drop'));
    await wrapper.vm.$nextTick();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Genre', 'Title', 'Year']);
  });

  it('Grid Settings filters and orders visible columns, ignoring unknown fields', async () => {
    const wrapper = await mountGrid();
    toolbarButton('Grid settings')!.click();
    await wrapper.vm.$nextTick();
    const select = wrapper.findComponent({ name: 'VSelect' });
    await select.vm.$emit('update:modelValue', ['year', 'nonexistent', 'title']);
    await wrapper.vm.$nextTick();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Title']);
  });

  it('shows the Grid Settings badge dot once a selection is active, and hides it again once cleared', async () => {
    const wrapper = await mountGrid();
    toolbarButton('Grid settings')!.click();
    await wrapper.vm.$nextTick();
    const select = wrapper.findComponent({ name: 'VSelect' });
    await select.vm.$emit('update:modelValue', ['title']);
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.v-badge--dot .v-badge__badge')).not.toBeNull();
    await select.vm.$emit('update:modelValue', []);
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.v-badge--dot.v-badge--bordered')).toBeNull();
  });

  it('the Grid Settings dialog\'s own Close button closes it', async () => {
    const wrapper = await mountGrid();
    toolbarButton('Grid settings')!.click();
    await wrapper.vm.$nextTick();
    const closeBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Close') as HTMLElement;
    closeBtn.click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.grid-settings-select-trigger')).toBeNull();
  });

  it('persists the Grid Settings selection to localStorage and restores it on the next mount', async () => {
    const wrapper = await mountGrid();
    toolbarButton('Grid settings')!.click();
    await wrapper.vm.$nextTick();
    const select = wrapper.findComponent({ name: 'VSelect' });
    await select.vm.$emit('update:modelValue', ['title']);
    await wrapper.vm.$nextTick();
    wrapper.unmount();
    activeWrapper = null;
    document.body.innerHTML = '';

    await mountGrid();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title']);
  });

  it('seeds the initial selection from defaultVisibleColumns on a fresh visit (nothing persisted yet)', async () => {
    await mountGrid({ defaultVisibleColumns: ['year'] });
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year']);
  });

  it('ignores corrupted (non-array) persisted JSON and falls back to showing everything', async () => {
    localStorage.setItem('rs-data-grid-selected-columns', JSON.stringify({ not: 'an array' }));
    await mountGrid();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('ignores unparseable persisted JSON and falls back to showing everything', async () => {
    localStorage.setItem('rs-data-grid-selected-columns', 'not valid json {{{');
    await mountGrid();
    const captions = Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('a real dataSource change resets the Grid Settings selection back to "show everything"', async () => {
    const wrapper = await mountGrid();
    toolbarButton('Grid settings')!.click();
    await wrapper.vm.$nextTick();
    const select = wrapper.findComponent({ name: 'VSelect' });
    await select.vm.$emit('update:modelValue', ['title']);
    await wrapper.vm.$nextTick();
    expect(Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Title']);

    await wrapper.setProps({ dataSource: [...rows] });
    await wrapper.vm.$nextTick();
    expect(Array.from(document.body.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Title', 'Year']);
  });
});

describe('pagination and displayed rows', () => {
  it('slices rows client-side by page when pagination is on and not in remote mode', async () => {
    await mountGrid({ pagination: true, currentPagingSize: 2, pageListSize: 5 });
    expect(dataRows().length).toBe(2);
    expect(document.body.querySelector('.pager-row')).not.toBeNull();
  });

  it('does not slice when remoteModeParams is set (server already paginated)', async () => {
    await mountGrid({
      pagination: true,
      currentPagingSize: 2,
      remoteMode: true,
      remoteModeParams: { endpoint: 'https://x', aliases: { data: 'items' } },
    });
    expect(dataRows().length).toBe(3);
  });

  it('shows every row when pagination is off', async () => {
    await mountGrid({ pagination: false });
    expect(dataRows().length).toBe(3);
    expect(document.body.querySelector('.pager-row')).toBeNull();
  });
});

describe('header wiring (filter/sort)', () => {
  it('a header filter selection narrows the displayed rows via the store', async () => {
    const wrapper = await mountGrid({ showFilter: true });
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (document.body.querySelector('.filter-panel input[type="checkbox"]') as HTMLInputElement).dispatchEvent(new Event('change'));
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(1);
    expect(dataRows()[0].textContent).toContain('Movie A');
  });

  it('a header sort toggle reorders the displayed rows via the store', async () => {
    const wrapper = await mountGrid({ showSort: true });
    (document.body.querySelectorAll('.sort-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const titles = dataRows().map(r => r.querySelector('.section-style:not(.drag-cell)')?.textContent);
    expect(titles).toEqual(['Movie C', 'Movie B', 'Movie A']);
  });
});

describe('toolbar', () => {
  it('is omitted entirely when every toolbar feature is off and gridMode is not batch', async () => {
    await mountGrid({ showSearch: false, exportExcel: false, exportPDF: false, showAdd: false, showGridSettings: false, gridMode: 'popup' });
    expect(document.body.querySelector('.grid-toolbar')).toBeNull();
  });

  it('is shown for gridMode batch alone, even with every other flag off', async () => {
    await mountGrid({ showSearch: false, exportExcel: false, exportPDF: false, showAdd: false, showGridSettings: false, gridMode: 'batch' });
    expect(document.body.querySelector('.grid-toolbar')).not.toBeNull();
    expect(document.body.querySelector('.batch-save-button')).not.toBeNull();
  });

  it('batch-save button calls table.saveBatch (wired through to batchSave)', async () => {
    const wrapper = await mountGrid({ gridMode: 'batch' });
    toolbarButton('Save batch changes')!.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('batchSave')?.[0]).toEqual([{ added: [], updated: [] }]);
  });

  it('Export to Excel calls xlsx with the currently displayed rows and columns', async () => {
    await mountGrid({ exportExcel: true, pagination: true, currentPagingSize: 2 });
    toolbarButton('Export to Excel')!.click();
    expect(xlsxUtils.json_to_sheet).toHaveBeenCalledWith([
      { Title: 'Movie A', Year: '2020' },
      { Title: 'Movie B', Year: '2021' },
    ]);
    expect(xlsxWriteFile).toHaveBeenCalledWith('workbook', 'export.xlsx');
  });

  it('Export to PDF calls jspdf/autotable with the currently displayed rows and columns', async () => {
    await mountGrid({ exportPDF: true });
    toolbarButton('Export to PDF')!.click();
    expect(autoTable).toHaveBeenCalledWith(
      expect.any(JsPdfCtor as any),
      expect.objectContaining({ head: [['Title', 'Year']] })
    );
    expect(jsPdfSave).toHaveBeenCalledWith('export.pdf');
  });

  it('Export to PDF renders a null/undefined field value as an empty string', async () => {
    await mountGrid({ exportPDF: true, dataSource: [{ title: 'Movie A', year: null }] });
    toolbarButton('Export to PDF')!.click();
    expect(autoTable).toHaveBeenCalledWith(
      expect.any(JsPdfCtor as any),
      expect.objectContaining({ body: [['Movie A', '']] })
    );
  });

  it('the search input reflects the current search term and filters as you type', async () => {
    const wrapper = await mountGrid({ showSearch: true });
    const input = document.body.querySelector('.global-search-input') as HTMLInputElement;
    expect(input.value).toBe('');
    input.value = 'Movie B';
    input.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(1);
  });
});

describe('add row', () => {
  it('popup mode: opens the edit-row dialog; saving adds the row and emits rowAdd', async () => {
    const wrapper = await mountGrid({ showAdd: true, gridMode: 'popup' });
    toolbarButton('Add row')!.click();
    await wrapper.vm.$nextTick();
    const nameInput = document.body.querySelectorAll('.edit-input')[0] as HTMLInputElement;
    nameInput.value = 'New movie';
    nameInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    const saveBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Save') as HTMLElement;
    saveBtn.click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(4);
    expect(wrapper.emitted('rowAdd')?.[0]?.[0]).toMatchObject({ title: 'New movie' });
  });

  it('popup mode: a declined/cancelled dialog adds nothing', async () => {
    const wrapper = await mountGrid({ showAdd: true, gridMode: 'popup' });
    toolbarButton('Add row')!.click();
    await wrapper.vm.$nextTick();
    const cancelBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Cancel') as HTMLElement;
    cancelBtn.click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(3);
    expect(wrapper.emitted('rowAdd')).toBeUndefined();
  });

  it('row mode: delegates to the table\'s own inline add-row instead of opening a dialog', async () => {
    const wrapper = await mountGrid({ showAdd: true, gridMode: 'row' });
    toolbarButton('Add row')!.click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(4);
    expect(document.body.querySelector('.edit-input')).toBeNull();
  });

  it('row mode: the inline add-row\'s own Save button adds the row via the store and emits rowAdd', async () => {
    const wrapper = await mountGrid({ showAdd: true, gridMode: 'row' });
    toolbarButton('Add row')!.click();
    await wrapper.vm.$nextTick();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement;
    input.value = 'Inline add';
    input.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-save') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const yesBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Yes') as HTMLElement;
    yesBtn.click();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('rowAdd')?.[0]?.[0]).toMatchObject({ title: 'Inline add' });
  });

  it('batch mode: delegates to the table\'s own batch-new-row instead of opening a dialog', async () => {
    const wrapper = await mountGrid({ showAdd: true, gridMode: 'batch' });
    toolbarButton('Add row')!.click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(4);
    expect(document.body.querySelector('.edit-input')).toBeNull();
  });
});

describe('edit row (popup mode)', () => {
  it('opens the edit dialog and applies the result, emitting rowEdit', async () => {
    const wrapper = await mountGrid();
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const titleInput = document.body.querySelectorAll('.edit-input')[0] as HTMLInputElement;
    titleInput.value = 'Edited';
    titleInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    const saveBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Save') as HTMLElement;
    saveBtn.click();
    await wrapper.vm.$nextTick();
    expect(dataRows()[0].textContent).toContain('Edited');
    expect(wrapper.emitted('rowEdit')?.[0]?.[0]).toMatchObject({ title: 'Edited' });
  });

  it('a declined dialog changes nothing', async () => {
    const wrapper = await mountGrid();
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const cancelBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Cancel') as HTMLElement;
    cancelBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('rowEdit')).toBeUndefined();
  });
});

describe('delete row', () => {
  it('confirms, then removes the row and emits rowDelete', async () => {
    const wrapper = await mountGrid();
    (dataRows()[0].querySelector('.row-action-delete') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const yesBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Yes') as HTMLElement;
    yesBtn.click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(2);
    expect(wrapper.emitted('rowDelete')?.[0]).toEqual([rows[0]]);
  });

  it('a declined confirmation deletes nothing', async () => {
    const wrapper = await mountGrid();
    (dataRows()[0].querySelector('.row-action-delete') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const noBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'No') as HTMLElement;
    noBtn.click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(3);
    expect(wrapper.emitted('rowDelete')).toBeUndefined();
  });
});

describe('row drag-drop -> store.moveRow', () => {
  it('reordering rows via drag calls the store, reflected in render order', async () => {
    const wrapper = await mountGrid({ dragDropRows: true });
    const handle = dataRows()[0].querySelector('.drag-handle') as HTMLElement;
    handle.dispatchEvent(new Event('dragstart'));
    dataRows()[2].dispatchEvent(new Event('drop'));
    await wrapper.vm.$nextTick();
    const titles = dataRows().map(r => r.querySelector('.section-style:not(.drag-cell)')?.textContent);
    expect(titles).toEqual(['Movie B', 'Movie C', 'Movie A']);
  });
});

describe('row mode / batch mode save wiring', () => {
  it('row mode Save confirms then updates via the store, emitting rowEdit', async () => {
    const wrapper = await mountGrid({ gridMode: 'row' });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement;
    input.value = 'Row-mode edit';
    input.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-save') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    // Save goes through the real ConfirmDialog (requestConfirm), which only
    // resolves once its own Yes/No button is clicked.
    const yesBtn = Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === 'Yes') as HTMLElement;
    yesBtn.click();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(dataRows()[0].textContent).toContain('Row-mode edit');
    expect(wrapper.emitted('rowEdit')?.[0]?.[0]).toMatchObject({ title: 'Row-mode edit' });
  });

  it('batch mode commit updates dirty rows and adds new-batch rows via the store', async () => {
    const wrapper = await mountGrid({ gridMode: 'batch' });
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement;
    input.value = 'Batch edit';
    input.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    toolbarButton('Save batch changes')!.click();
    await wrapper.vm.$nextTick();
    expect((dataRows()[0].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement).value).toBe('Batch edit');
    expect(wrapper.emitted('batchSave')?.[0]).toEqual([
      { added: [], updated: [{ original: rows[0], updated: expect.objectContaining({ title: 'Batch edit' }) }] },
    ]);
  });

  it('batch mode commit also adds every batch-new row via the store', async () => {
    const wrapper = await mountGrid({ gridMode: 'batch', showAdd: true });
    toolbarButton('Add row')!.click();
    await wrapper.vm.$nextTick();
    const newInput = dataRows()[3].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement;
    newInput.value = 'Fresh batch row';
    newInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    toolbarButton('Save batch changes')!.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('batchSave')?.[0]).toEqual([
      { added: [expect.objectContaining({ title: 'Fresh batch row' })], updated: [] },
    ]);
  });
});

describe('theming and layout wrapper', () => {
  it('applies border-area-small when tableBorder is on, and data-rg-theme from props', async () => {
    await mountGrid({ tableBorder: true, theme: 'dark' });
    const wrapper = document.body.querySelector('[data-rg-theme]');
    expect(wrapper?.className).toContain('border-area-small');
    expect(wrapper?.getAttribute('data-rg-theme')).toBe('dark');
  });

  it('omits border-area-small when tableBorder is off', async () => {
    await mountGrid({ tableBorder: false });
    const wrapper = document.body.querySelector('[data-rg-theme]');
    expect(wrapper?.className).not.toContain('border-area-small');
  });
});

describe('destroy / unmount', () => {
  it('unmounts cleanly without error', async () => {
    const wrapper = await mountGrid();
    expect(() => wrapper.unmount()).not.toThrow();
    activeWrapper = null;
  });
});
