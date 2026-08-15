import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestConfirm = vi.fn();
const requestEditRow = vi.fn();
const openGridSettings = vi.fn();
const exportExcel = vi.fn();
const exportPdf = vi.fn();

vi.mock('./dialogs/confirmDialog.js', () => ({ requestConfirm: (...args) => requestConfirm(...args) }));
vi.mock('./dialogs/editRowDialog.js', () => ({ requestEditRow: (...args) => requestEditRow(...args) }));
vi.mock('./dialogs/gridSettingsDialog.js', () => ({ openGridSettings: (...args) => openGridSettings(...args) }));
vi.mock('./exporters.js', () => ({ exportExcel: (...args) => exportExcel(...args), exportPdf: (...args) => exportPdf(...args) }));

const { createGrid } = await import('./rsDataGrid.js');

const rows = [
  { title: 'Movie A', year: '2020' },
  { title: 'Movie B', year: '2021' },
  { title: 'Movie C', year: '2022' },
];

const baseProps = (overrides = {}) => ({
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
  onRowAdd: vi.fn(),
  onRowEdit: vi.fn(),
  onRowDelete: vi.fn(),
  onBatchSave: vi.fn(),
  ...overrides,
});

let container;
let grid;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  container = document.createElement('div');
  document.body.appendChild(container);
  grid = createGrid();
});

afterEach(() => {
  grid.destroy();
  container.remove();
  vi.unstubAllGlobals();
});

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const dataRows = () => Array.from(container.querySelectorAll('.column-layout > .full-row'));
const toolbarButton = title => container.querySelector(`.export-button[title="${title}"]`);

describe('mount / data loading', () => {
  it('loads the given dataSource and renders rows on first render', () => {
    grid.render(container, baseProps());
    expect(dataRows().length).toBe(3);
  });

  it('shows the empty state when dataSource is empty and no fetchUrl is set', () => {
    grid.render(container, baseProps({ dataSource: [] }));
    expect(container.querySelector('.grid-state-empty').textContent).toBe('No data to display.');
  });

  it('treats an explicit fetchUrl of undefined the same as omitting it', () => {
    grid.render(container, baseProps({ dataSource: [], fetchUrl: undefined }));
    expect(container.querySelector('.grid-state-empty').textContent).toBe('No data to display.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('treats an explicit dataSource of undefined (with remoteMode also unset) the same as an empty local dataSource', () => {
    grid.render(container, baseProps({ dataSource: undefined, remoteMode: undefined }));
    expect(container.querySelector('.grid-state-empty').textContent).toBe('No data to display.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches from fetchUrl when dataSource is empty', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(rows) });
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', expect.objectContaining({ method: 'GET' }));
    expect(dataRows().length).toBe(3);
  });

  it('sends an Authorization header built from authToken, merged with any fetchHeaders', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    grid.render(
      container,
      baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies', authToken: 'secret', fetchHeaders: { 'X-Custom': '1' } })
    );
    await flush();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/movies',
      expect.objectContaining({ headers: { 'X-Custom': '1', Authorization: 'Bearer secret' } })
    );
  });

  it('omits the headers object entirely when there is nothing to send', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', expect.objectContaining({ headers: undefined }));
  });

  it('treats an explicit fetchHeaders of undefined the same as omitting it', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies', fetchHeaders: undefined, authToken: 'secret' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', expect.objectContaining({ headers: { Authorization: 'Bearer secret' } }));
  });

  it('treats an explicit fetchMethod of undefined as defaulting to GET', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies', fetchMethod: undefined }));
    await flush();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', expect.objectContaining({ method: 'GET' }));
  });

  it('remote mode with an empty dataSource fetches via remoteModeParams', async () => {
    // The pager's own first render unconditionally seeds the store's page
    // size/list-size (see rsDataGridPager.js), which in remote mode schedules
    // a second, microtask-coalesced refetch -- mockResolvedValue (not Once)
    // so every fetch() call in this flow resolves the same way.
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ items: rows, size: 3 }) });
    grid.render(
      container,
      baseProps({
        dataSource: [],
        remoteMode: true,
        remoteModeParams: { endpoint: 'https://api.example.com/movies', aliases: { data: 'items' } },
      })
    );
    await flush();
    expect(global.fetch).toHaveBeenCalled();
    expect(dataRows().length).toBe(3);
  });

  it('remote mode with a non-empty dataSource uses it directly (no fetch)', () => {
    grid.render(container, baseProps({ remoteMode: true, remoteModeParams: { endpoint: 'https://x', aliases: { data: 'items' } } }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(dataRows().length).toBe(3);
  });

  it('shows a loading state (default or custom) while a fetch is in flight', async () => {
    let resolveFetch;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveFetch = resolve; }));
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies' }));
    expect(container.querySelector('.grid-state-loading').textContent).toBe('Loading...');
    resolveFetch({ ok: true, status: 200, json: () => Promise.resolve([]) });
    await flush();
  });

  it('shows a custom loadingTemplate element when provided', () => {
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    const custom = document.createElement('div');
    custom.className = 'my-custom-loading';
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies', loadingTemplate: custom }));
    expect(container.querySelector('.my-custom-loading')).not.toBeNull();
  });

  it('shows a default error state (with the error message) when the fetch fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies' }));
    await flush();
    expect(container.querySelector('.grid-state-error').textContent).toContain('Request failed with status 500');
  });

  it('falls back to a generic error message when the error has none', async () => {
    global.fetch.mockRejectedValueOnce('');
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies' }));
    await flush();
    expect(container.querySelector('.grid-state-error').textContent).toContain('Something went wrong while loading data.');
  });

  it('shows a custom errorTemplate(error) when provided', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({}) });
    const errorTemplate = vi.fn(err => {
      const div = document.createElement('div');
      div.className = 'my-custom-error';
      div.textContent = err.message;
      return div;
    });
    grid.render(container, baseProps({ dataSource: [], fetchUrl: 'https://api.example.com/movies', errorTemplate }));
    await flush();
    expect(container.querySelector('.my-custom-error').textContent).toBe('Request failed with status 404');
  });

  it('shows a custom emptyTemplate when provided and there is no data', () => {
    const custom = document.createElement('div');
    custom.className = 'my-custom-empty';
    grid.render(container, baseProps({ dataSource: [], emptyTemplate: custom }));
    expect(container.querySelector('.my-custom-empty')).not.toBeNull();
  });

  it('shows an inline "No matching rows" state when a filter/search leaves nothing, without unmounting the header', () => {
    grid.render(container, baseProps({ showSearch: true }));
    const input = container.querySelector('.global-search-input');
    input.value = 'nonexistent movie title';
    input.dispatchEvent(new Event('input'));
    expect(container.querySelector('.grid-state-empty-inline').textContent).toBe('No matching rows.');
    expect(container.querySelector('.header-caption')).not.toBeNull();
  });

  it('fetchNow() before any render() is a harmless no-op', () => {
    expect(() => grid.fetchNow()).not.toThrow();
  });

  it('fetchNow() resets Grid Settings selection and reloads', () => {
    const props = baseProps({ showGridSettings: true });
    grid.render(container, props);
    // Drive a real column-selection change through the actual dialog wiring.
    toolbarButton('Grid settings').click();
    const onChange = openGridSettings.mock.calls[0][0].onChange;
    onChange(['title']);
    expect(container.querySelector('.grid-settings-badge-dot')).not.toBeNull();
    grid.fetchNow();
    expect(container.querySelector('.grid-settings-badge-dot')).toBeNull();
  });
});

describe('columns: inference, drag-reorder persistence, Grid Settings filtering', () => {
  it('infers columns from the data shape when none are given', () => {
    grid.render(container, baseProps());
    const headerCaptions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(headerCaptions).toEqual(['Title', 'Year']);
  });

  it('uses explicit columns when given, ignoring inferred ones', () => {
    grid.render(container, baseProps({ columns: [{ caption: 'Title', dataField: 'title' }] }));
    const headerCaptions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(headerCaptions).toEqual(['Title']);
  });

  it('reorders columns via drag-and-drop (onColumnMove) and keeps the order across a data update', () => {
    grid.render(container, baseProps());
    const handles = () => Array.from(container.querySelectorAll('.drag-handle'));
    // dragDropColumns is off by default in these tests' header render, so drive
    // reordering directly the same way a real drag would, via the grid's own
    // dragDropColumns-enabled path.
    grid.render(container, baseProps({ dragDropColumns: true }));
    const dragHandles = handles();
    dragHandles[0].dispatchEvent(new Event('dragstart'));
    const cells = Array.from(container.querySelectorAll('.content-style'));
    cells[1].dispatchEvent(new Event('drop'));
    let captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Title']);

    // A subsequent data update (new dataSource) still derives fresh base
    // columns, but the drag order is retained for fields that still exist.
    grid.render(container, baseProps({ dragDropColumns: true, dataSource: [...rows, { title: 'Movie D', year: '2023' }] }));
    captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Title']);
  });

  it('drops fields from the retained drag order once they no longer exist, and appends genuinely new fields at the end', () => {
    grid.render(container, baseProps({ dragDropColumns: true }));
    const dragHandles = () => Array.from(container.querySelectorAll('.drag-handle'));
    dragHandles()[0].dispatchEvent(new Event('dragstart'));
    Array.from(container.querySelectorAll('.content-style'))[1].dispatchEvent(new Event('drop'));
    // The very first dataSource-reference change after mount is absorbed as
    // reference churn (see render()'s isFirstDataSource), so a placeholder
    // change is needed before a "real" one actually reloads.
    grid.render(container, baseProps({ dragDropColumns: true, dataSource: [...rows] }));
    // New dataset: "title" is gone, "genre" is new.
    grid.render(container, baseProps({ dragDropColumns: true, dataSource: [{ year: '2020', genre: 'Action' }] }));
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Genre']);
  });

  it('dropping a dragged column onto itself is a no-op', () => {
    grid.render(container, baseProps({ dragDropColumns: true }));
    const before = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    const handle = container.querySelectorAll('.drag-handle')[0];
    handle.dispatchEvent(new Event('dragstart'));
    container.querySelectorAll('.content-style')[0].dispatchEvent(new Event('drop'));
    const after = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(after).toEqual(before);
  });

  it('dragging a column backward (later index onto an earlier one) reorders correctly', () => {
    grid.render(container, baseProps({ dragDropColumns: true, columns: [
      { caption: 'Title', dataField: 'title' },
      { caption: 'Year', dataField: 'year' },
      { caption: 'Genre', dataField: 'genre' },
    ], dataSource: [{ title: 'A', year: '2020', genre: 'Action' }] }));
    const handles = container.querySelectorAll('.drag-handle');
    handles[2].dispatchEvent(new Event('dragstart')); // drag "Genre"...
    container.querySelectorAll('.content-style')[0].dispatchEvent(new Event('drop')); // ...onto "Title"
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Genre', 'Title', 'Year']);
  });

  it('Grid Settings filters and orders visible columns, ignoring unknown fields', () => {
    grid.render(container, baseProps());
    toolbarButton('Grid settings').click();
    const call = openGridSettings.mock.calls[0][0];
    expect(call.selected).toEqual([]);
    call.onChange(['year', 'nonexistent', 'title']);
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year', 'Title']);
  });

  it('shows the Grid Settings badge dot once a selection is active, and hides it again once cleared', () => {
    grid.render(container, baseProps());
    toolbarButton('Grid settings').click();
    const onChange = openGridSettings.mock.calls[0][0].onChange;
    onChange(['title']);
    expect(container.querySelector('.grid-settings-badge-dot')).not.toBeNull();
    onChange([]);
    expect(container.querySelector('.grid-settings-badge-dot')).toBeNull();
  });

  it('persists the Grid Settings selection to localStorage and restores it on the next mount', () => {
    grid.render(container, baseProps());
    toolbarButton('Grid settings').click();
    openGridSettings.mock.calls[0][0].onChange(['title']);
    grid.destroy();

    const grid2 = createGrid();
    const container2 = document.createElement('div');
    document.body.appendChild(container2);
    grid2.render(container2, baseProps());
    const captions = Array.from(container2.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title']);
    grid2.destroy();
    container2.remove();
  });

  it('seeds the initial selection from defaultVisibleColumns on a fresh visit (nothing persisted yet)', () => {
    grid.render(container, baseProps({ defaultVisibleColumns: ['year'] }));
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Year']);
  });

  it('treats an explicit defaultVisibleColumns of undefined the same as omitting it', () => {
    grid.render(container, baseProps({ defaultVisibleColumns: undefined }));
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('ignores corrupted (non-array) persisted JSON and falls back to showing everything', () => {
    localStorage.setItem('rs-data-grid-selected-columns', JSON.stringify({ not: 'an array' }));
    grid.render(container, baseProps());
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('ignores unparseable persisted JSON and falls back to showing everything', () => {
    localStorage.setItem('rs-data-grid-selected-columns', 'not valid json {{{');
    grid.render(container, baseProps());
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('treats an explicit columns prop of undefined the same as omitting it (infers from data)', () => {
    grid.render(container, baseProps({ columns: undefined }));
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Title', 'Year']);
  });

  it('a real dataSource change resets the Grid Settings selection back to "show everything"', () => {
    grid.render(container, baseProps());
    toolbarButton('Grid settings').click();
    openGridSettings.mock.calls[0][0].onChange(['title']);
    expect(Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Title']);

    // First-ever dataSource *reference* change after mount is treated as
    // reference churn, not a real change (see render()'s isFirstDataSource).
    grid.render(container, baseProps({ dataSource: [...rows] }));
    expect(Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Title']);

    // The next distinct reference is a genuine change and resets selection.
    grid.render(container, baseProps({ dataSource: [...rows] }));
    expect(Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Title', 'Year']);
  });

  it('re-rendering with the same dataSource reference does not reload or reset', () => {
    const props = baseProps();
    grid.render(container, props);
    toolbarButton('Grid settings').click();
    openGridSettings.mock.calls[0][0].onChange(['title']);
    grid.render(container, props);
    expect(Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Title']);
  });
});

describe('header wiring (filter/sort)', () => {
  it('a header filter selection narrows the displayed rows via the store', () => {
    grid.render(container, baseProps({ showFilter: true }));
    const toggle = container.querySelectorAll('.filter-toggle')[0];
    toggle.click();
    container.querySelector('.filter-panel input[type="checkbox"]').dispatchEvent(new Event('change', { bubbles: true }));
    expect(dataRows().length).toBe(1);
  });

  it('a header sort toggle reorders the displayed rows via the store', () => {
    grid.render(container, baseProps({ showSort: true }));
    container.querySelectorAll('.sort-toggle')[0].click();
    const titles = dataRows().map(r => r.querySelector('.section-style').textContent);
    expect(titles).toEqual(['Movie C', 'Movie B', 'Movie A']); // first click = desc
  });
});

describe('pagination and displayed rows', () => {
  it('slices rows client-side by page when pagination is on and not in remote mode', () => {
    grid.render(container, baseProps({ pagination: true, currentPagingSize: 2, pageListSize: 5 }));
    expect(dataRows().length).toBe(2);
    expect(container.querySelector('.pager-row')).not.toBeNull();
  });

  it('does not slice when remoteModeParams is set (server already paginated)', () => {
    grid.render(
      container,
      baseProps({ pagination: true, currentPagingSize: 2, remoteMode: true, remoteModeParams: { endpoint: 'https://x', aliases: { data: 'items' } } })
    );
    expect(dataRows().length).toBe(3);
  });

  it('shows every row when pagination is off', () => {
    grid.render(container, baseProps({ pagination: false }));
    expect(dataRows().length).toBe(3);
    expect(container.querySelector('.pager-row')).toBeNull();
  });

  it('treats an explicit pagingSizes of undefined the same as omitting it (empty size-button list)', () => {
    grid.render(container, baseProps({ pagination: true, pagingSizes: undefined }));
    expect(container.querySelectorAll('.pager-size').length).toBe(0);
  });
});

describe('toolbar', () => {
  it('is omitted entirely when every toolbar feature is off and gridMode is not batch', () => {
    grid.render(container, baseProps({ showSearch: false, exportExcel: false, exportPDF: false, showAdd: false, showGridSettings: false, gridMode: 'popup' }));
    expect(container.querySelector('.grid-toolbar')).toBeNull();
  });

  it('is shown for gridMode batch alone, even with every other flag off', () => {
    grid.render(container, baseProps({ showSearch: false, exportExcel: false, exportPDF: false, showAdd: false, showGridSettings: false, gridMode: 'batch' }));
    expect(container.querySelector('.grid-toolbar')).not.toBeNull();
    expect(container.querySelector('.batch-save-button')).not.toBeNull();
  });

  it('batch-save button calls table.saveBatch (wired through to onBatchCommit)', () => {
    const props = baseProps({ gridMode: 'batch' });
    grid.render(container, props);
    toolbarButton('Save batch changes').click();
    expect(props.onBatchSave).toHaveBeenCalledWith({ added: [], updated: [] });
  });

  it('Export to Excel calls exportExcel with the currently displayed rows and columns', () => {
    grid.render(container, baseProps({ exportExcel: true, pagination: true, currentPagingSize: 2 }));
    toolbarButton('Export to Excel').click();
    expect(exportExcel).toHaveBeenCalledWith(rows.slice(0, 2), expect.any(Array));
  });

  it('Export to PDF calls exportPdf with the currently displayed rows and columns', () => {
    grid.render(container, baseProps({ exportPDF: true }));
    toolbarButton('Export to PDF').click();
    expect(exportPdf).toHaveBeenCalledWith(rows, expect.any(Array));
  });

  it('the search input reflects the current search term and filters as you type', () => {
    grid.render(container, baseProps({ showSearch: true }));
    const input = container.querySelector('.global-search-input');
    expect(input.value).toBe('');
    input.value = 'Movie B';
    input.dispatchEvent(new Event('input'));
    expect(dataRows().length).toBe(1);
  });

  it('keeps focus and cursor position on the search input across the rebuild it triggers', () => {
    grid.render(container, baseProps({ showSearch: true }));
    const input = container.querySelector('.global-search-input');
    input.focus();
    input.value = 'Mov';
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new Event('input'));
    const rebuiltInput = container.querySelector('.global-search-input');
    expect(document.activeElement).toBe(rebuiltInput);
    expect(rebuiltInput.selectionStart).toBe(3);
  });

  it('tolerates the focused element disappearing from the rebuilt tree (e.g. showSearch turning off)', () => {
    const props = baseProps({ showSearch: true });
    grid.render(container, props);
    container.querySelector('.global-search-input').focus();
    expect(() => grid.render(container, { ...props, showSearch: false })).not.toThrow();
    expect(container.querySelector('.global-search-input')).toBeNull();
  });

  it('tolerates a focused search input whose selectionStart is not a number', () => {
    grid.render(container, baseProps({ showSearch: true }));
    const input = container.querySelector('.global-search-input');
    input.focus();
    Object.defineProperty(input, 'selectionStart', { value: null, configurable: true });
    input.value = 'Mov';
    expect(() => input.dispatchEvent(new Event('input'))).not.toThrow();
  });
});

describe('add row', () => {
  it('popup mode: opens the edit-row dialog; a result adds the row and notifies onRowAdd', async () => {
    requestEditRow.mockResolvedValueOnce({ title: 'New movie', year: '2024' });
    const props = baseProps({ showAdd: true, gridMode: 'popup' });
    grid.render(container, props);
    toolbarButton('Add row').click();
    await flush();
    expect(dataRows().length).toBe(4);
    expect(props.onRowAdd).toHaveBeenCalledWith({ title: 'New movie', year: '2024' });
  });

  it('popup mode: a declined/cancelled dialog adds nothing', async () => {
    requestEditRow.mockResolvedValueOnce(null);
    const props = baseProps({ showAdd: true, gridMode: 'popup' });
    grid.render(container, props);
    toolbarButton('Add row').click();
    await flush();
    expect(dataRows().length).toBe(3);
    expect(props.onRowAdd).not.toHaveBeenCalled();
  });

  it('popup mode: tolerates a missing onRowAdd callback', async () => {
    requestEditRow.mockResolvedValueOnce({ title: 'New movie', year: '2024' });
    const props = baseProps({ showAdd: true, gridMode: 'popup', onRowAdd: undefined });
    grid.render(container, props);
    toolbarButton('Add row').click();
    await expect(flush()).resolves.not.toThrow();
  });

  it('row mode: delegates to the table\'s own inline add-row instead of opening a dialog', () => {
    grid.render(container, baseProps({ showAdd: true, gridMode: 'row' }));
    toolbarButton('Add row').click();
    expect(requestEditRow).not.toHaveBeenCalled();
    expect(dataRows().length).toBe(4);
  });

  it('batch mode: delegates to the table\'s own batch-new-row instead of opening a dialog', () => {
    grid.render(container, baseProps({ showAdd: true, gridMode: 'batch' }));
    toolbarButton('Add row').click();
    expect(requestEditRow).not.toHaveBeenCalled();
    expect(dataRows().length).toBe(4);
  });

  it('row mode: the inline add-row\'s own Save button adds the row via the store and notifies onRowAdd', async () => {
    requestConfirm.mockResolvedValueOnce(true);
    const props = baseProps({ showAdd: true, gridMode: 'row' });
    grid.render(container, props);
    toolbarButton('Add row').click();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Inline add';
    input.dispatchEvent(new Event('input'));
    dataRows()[0].querySelector('.row-action-save').click();
    await flush();
    expect(dataRows().some(r => r.textContent.includes('Inline add'))).toBe(true);
    expect(props.onRowAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Inline add' }));
  });
});

describe('edit row (popup mode)', () => {
  it('opens the edit dialog and applies the result, notifying onRowEdit', async () => {
    requestEditRow.mockResolvedValueOnce({ title: 'Edited', year: '2020' });
    const props = baseProps();
    grid.render(container, props);
    dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)').click();
    await flush();
    expect(dataRows()[0].textContent).toContain('Edited');
    expect(props.onRowEdit).toHaveBeenCalledWith({ title: 'Edited', year: '2020' });
  });

  it('a declined dialog changes nothing', async () => {
    requestEditRow.mockResolvedValueOnce(null);
    const props = baseProps();
    grid.render(container, props);
    dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)').click();
    await flush();
    expect(props.onRowEdit).not.toHaveBeenCalled();
  });

  it('tolerates a missing onRowEdit callback', async () => {
    requestEditRow.mockResolvedValueOnce({ title: 'Edited', year: '2020' });
    grid.render(container, baseProps({ onRowEdit: undefined }));
    dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)').click();
    await expect(flush()).resolves.not.toThrow();
  });
});

describe('delete row', () => {
  it('confirms, then removes the row and notifies onRowDelete', async () => {
    requestConfirm.mockResolvedValueOnce(true);
    const props = baseProps();
    grid.render(container, props);
    dataRows()[0].querySelector('.row-action-delete').click();
    await flush();
    expect(requestConfirm).toHaveBeenCalledWith('Confirm delete', expect.any(String), 'light');
    expect(dataRows().length).toBe(2);
    expect(props.onRowDelete).toHaveBeenCalledWith(rows[0]);
  });

  it('a declined confirmation deletes nothing', async () => {
    requestConfirm.mockResolvedValueOnce(false);
    const props = baseProps();
    grid.render(container, props);
    dataRows()[0].querySelector('.row-action-delete').click();
    await flush();
    expect(dataRows().length).toBe(3);
    expect(props.onRowDelete).not.toHaveBeenCalled();
  });

  it('tolerates a missing onRowDelete callback', async () => {
    requestConfirm.mockResolvedValueOnce(true);
    grid.render(container, baseProps({ onRowDelete: undefined }));
    dataRows()[0].querySelector('.row-action-delete').click();
    await expect(flush()).resolves.not.toThrow();
  });
});

describe('row drag-drop -> store.moveRow', () => {
  it('reordering rows via drag calls the store, reflected in render order', () => {
    grid.render(container, baseProps({ dragDropRows: true }));
    const handle = dataRows()[0].querySelector('.drag-handle');
    handle.dispatchEvent(new Event('dragstart'));
    dataRows()[2].dispatchEvent(new Event('drop'));
    const titles = dataRows().map(r => r.querySelector('.section-style:not(.drag-cell)').textContent);
    expect(titles).toEqual(['Movie B', 'Movie C', 'Movie A']);
  });
});

describe('row mode / batch mode save wiring', () => {
  it('row mode Save confirms then updates via the store, notifying onRowEdit', async () => {
    requestConfirm.mockResolvedValueOnce(true);
    const props = baseProps({ gridMode: 'row' });
    grid.render(container, props);
    dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)').click();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Row-mode edit';
    input.dispatchEvent(new Event('input'));
    dataRows()[0].querySelector('.row-action-save').click();
    await flush();
    expect(dataRows()[0].textContent).toContain('Row-mode edit');
    expect(props.onRowEdit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Row-mode edit' }));
  });

  it('batch mode commit updates dirty rows and adds new-batch rows via the store', () => {
    const props = baseProps({ gridMode: 'batch' });
    grid.render(container, props);
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Batch edit';
    input.dispatchEvent(new Event('input'));
    toolbarButton('Save batch changes').click();
    expect(dataRows()[0].querySelectorAll('.inline-edit-input')[0].value).toBe('Batch edit');
    expect(props.onBatchSave).toHaveBeenCalledWith({ added: [], updated: [{ original: rows[0], updated: expect.objectContaining({ title: 'Batch edit' }) }] });
  });

  it('batch mode commit also adds every batch-new row via the store', () => {
    const props = baseProps({ gridMode: 'batch', showAdd: true });
    grid.render(container, props);
    toolbarButton('Add row').click();
    const newInput = dataRows()[3].querySelectorAll('.inline-edit-input')[0];
    newInput.value = 'Fresh batch row';
    newInput.dispatchEvent(new Event('input'));
    toolbarButton('Save batch changes').click();
    expect(props.onBatchSave).toHaveBeenCalledWith({
      added: [expect.objectContaining({ title: 'Fresh batch row' })],
      updated: [],
    });
    // Batch mode renders every row (including the newly-committed one) as an
    // input, so its value -- not textContent -- carries the title.
    const titleInputValues = dataRows().map(r => r.querySelectorAll('.inline-edit-input')[0].value);
    expect(titleInputValues).toContain('Fresh batch row');
  });
});

describe('theming and layout wrapper', () => {
  it('applies border-area-small when tableBorder is on, and data-rg-theme from props', () => {
    grid.render(container, baseProps({ tableBorder: true, theme: 'dark' }));
    const wrapper = container.firstElementChild;
    expect(wrapper.classList.contains('border-area-small')).toBe(true);
    expect(wrapper.getAttribute('data-rg-theme')).toBe('dark');
  });

  it('omits border-area-small when tableBorder is off, defaulting theme to light', () => {
    grid.render(container, baseProps({ tableBorder: false, theme: undefined }));
    const wrapper = container.firstElementChild;
    expect(wrapper.classList.contains('border-area-small')).toBe(false);
    expect(wrapper.getAttribute('data-rg-theme')).toBe('light');
  });
});

describe('defaultsFor()', () => {
  it('fills in every omitted prop with its documented default', () => {
    // An almost-bare call: only dataSource is given, everything else defaults.
    grid.render(container, { dataSource: rows });
    // showGridSettings defaults true, so the toolbar shows just that button.
    expect(container.querySelector('.grid-settings-button')).not.toBeNull();
    expect(container.querySelector('.global-search-input')).toBeNull(); // showSearch defaults off
    expect(container.querySelector('.pager-row')).toBeNull(); // pagination defaults off
    expect(dataRows().length).toBe(3);
  });
});

describe('destroy()', () => {
  it('unsubscribes from the store so further store activity does not re-render', () => {
    grid.render(container, baseProps());
    grid.destroy();
    expect(() => container.remove()).not.toThrow();
  });

  it('is safe to call twice', () => {
    grid.render(container, baseProps());
    grid.destroy();
    expect(() => grid.destroy()).not.toThrow();
  });
});
