import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRequestConfirm = vi.fn();
const mockRequestEditRow = vi.fn();
const mockExportExcel = vi.fn();
const mockExportPdf = vi.fn();

vi.mock('../../src/rsDataGrid/dialogs/confirmDialog.js', () => ({ requestConfirm: (...a) => mockRequestConfirm(...a) }));
vi.mock('../../src/rsDataGrid/dialogs/editRowDialog.js', () => ({ requestEditRow: (...a) => mockRequestEditRow(...a) }));
vi.mock('../../src/rsDataGrid/exporters.js', () => ({
  exportExcel: (...a) => mockExportExcel(...a),
  exportPdf: (...a) => mockExportPdf(...a),
}));

const { createGrid } = await import('../../src/rsDataGrid/rsDataGrid.js');

async function flush() {
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

const columns = [
  { caption: 'name', dataField: 'name' },
  { caption: 'age', dataField: 'age' },
];

function baseProps(overrides = {}) {
  return {
    columns,
    dataSource: [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ],
    showAdd: true,
    showActions: true,
    showFilter: true,
    showSort: true,
    showSearch: true,
    exportExcel: true,
    exportPDF: true,
    pagination: true,
    pagingSizes: [10, 20],
    currentPagingSize: 10,
    pageListSize: 5,
    onRowAdd: vi.fn(),
    onRowEdit: vi.fn(),
    onRowDelete: vi.fn(),
    onBatchSave: vi.fn(),
    ...overrides,
  };
}

describe('rsDataGrid.js (createGrid orchestrator)', () => {
  let container;
  let grid;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    grid = createGrid();
    mockRequestConfirm.mockReset();
    mockRequestEditRow.mockReset();
    mockExportExcel.mockReset();
    mockExportPdf.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    grid.destroy();
    vi.unstubAllGlobals();
  });

  describe('data loading states', () => {
    it('renders the data table once dataSource resolves', () => {
      grid.render(container, baseProps());
      expect(container.querySelector('.grid-toolbar')).not.toBeNull();
      expect(container.querySelectorAll('.row-style').length).toBe(2);
      expect(container.querySelector('.grid-state')).toBeNull();
    });

    it('renders the default loading state while a fetch is pending', () => {
      global.fetch.mockReturnValue(new Promise(() => {})); // never resolves
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y' }));
      expect(container.querySelector('.grid-state-loading').textContent).toBe('Loading...');
    });

    it('renders a custom loadingTemplate element instead of the default when supplied', () => {
      global.fetch.mockReturnValue(new Promise(() => {}));
      const loadingTemplate = document.createElement('div');
      loadingTemplate.className = 'custom-loading';
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y', loadingTemplate }));
      expect(container.querySelector('.custom-loading')).not.toBeNull();
    });

    it('renders the default error state when the fetch response is not ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500 });
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y' }));
      await flush();
      const errorEl = container.querySelector('.grid-state-error');
      expect(errorEl.textContent).toContain('Request failed with status 500');
    });

    it('renders a custom errorTemplate(error) result when supplied', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404 });
      const errorTemplate = vi.fn(error => {
        const el = document.createElement('div');
        el.className = 'custom-error';
        el.textContent = error.message;
        return el;
      });
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y', errorTemplate }));
      await flush();
      expect(container.querySelector('.custom-error').textContent).toContain('404');
      expect(errorTemplate).toHaveBeenCalled();
    });

    it('renders the default empty state when there is no dataSource and no fetchUrl', () => {
      grid.render(container, baseProps({ dataSource: [], fetchUrl: undefined }));
      expect(container.querySelector('.grid-state-empty').textContent).toBe('No data to display.');
    });

    it('renders a custom emptyTemplate element when supplied', () => {
      const emptyTemplate = document.createElement('div');
      emptyTemplate.className = 'custom-empty';
      grid.render(container, baseProps({ dataSource: [], fetchUrl: undefined, emptyTemplate }));
      expect(container.querySelector('.custom-empty')).not.toBeNull();
    });

    it('fetches via fetchUrl (local mode) when dataSource is empty and reports the fetched rows', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [{ name: 'Carl', age: 40 }] });
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y' }));
      await flush();
      expect(container.querySelectorAll('.row-style').length).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith('http://x/y', expect.objectContaining({ method: 'GET' }));
    });

    it('sends an Authorization header built from authToken, merged with any fetchHeaders', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y', authToken: 'tok123', fetchHeaders: { 'X-Custom': '1' } }));
      await flush();
      const [, init] = global.fetch.mock.calls[0];
      expect(init.headers).toEqual({ 'X-Custom': '1', Authorization: 'Bearer tok123' });
    });

    it('omits the headers option entirely when there is no authToken and no fetchHeaders', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [] });
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y', authToken: '', fetchHeaders: {} }));
      await flush();
      const [, init] = global.fetch.mock.calls[0];
      expect(init.headers).toBeUndefined();
    });

    it('remote mode with a non-empty dataSource sets data directly, flagged remote, without fetching', () => {
      grid.render(container, baseProps({ remoteMode: true, remoteModeParams: { endpoint: 'http://x', aliases: { data: 'items' } }, dataSource: [{ name: 'Zed', age: 1 }] }));
      expect(global.fetch).not.toHaveBeenCalled();
      expect(container.querySelectorAll('.row-style').length).toBe(1);
    });

    it('remote mode with an empty dataSource fetches via remoteModeParams.endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ items: [{ name: 'Zed', age: 1 }], size: 1 }) });
      grid.render(container, baseProps({ remoteMode: true, remoteModeParams: { endpoint: 'http://remote/x', aliases: { data: 'items' } }, dataSource: [] }));
      await flush();
      const [calledUrl, calledInit] = global.fetch.mock.calls[0];
      expect(calledUrl).toMatch(/^http:\/\/remote\/x\?page=0&size=\d+$/);
      expect(calledInit.method).toBe('GET');
      expect(container.querySelectorAll('.row-style').length).toBe(1);
    });

    it('throws if remoteMode is on but remoteModeParams was never supplied (documented, intentional parity with the other framework ports)', () => {
      expect(() => grid.render(container, baseProps({ remoteMode: true, remoteModeParams: undefined, dataSource: [] }))).toThrow();
    });

    it('falls back to an empty local dataSource when neither dataSource nor fetchUrl is provided (final else branch)', () => {
      grid.render(container, baseProps({ dataSource: [], fetchUrl: '' }));
      expect(container.querySelector('.grid-state-empty')).not.toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('column handling', () => {
    it('uses the columns prop as-is when non-empty', () => {
      grid.render(container, baseProps({ columns: [{ caption: 'only', dataField: 'name' }] }));
      const captions = Array.from(container.querySelectorAll('.header-caption')).map(n => n.textContent);
      expect(captions).toEqual(['Only']);
    });

    it('auto-derives columns from the union of raw row keys when columns is empty', () => {
      grid.render(container, baseProps({ columns: [], dataSource: [{ name: 'Alice', age: 30 }, { name: 'Bob', city: 'NYC' }] }));
      const captions = Array.from(container.querySelectorAll('.header-caption')).map(n => n.textContent).sort();
      expect(captions).toEqual(['Age', 'City', 'Name']);
    });
  });

  describe('pagination-aware row slicing (getDisplayedRows)', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ name: `Row${i}`, age: i }));

    it('slices to the current page when pagination is on and not in remote mode', () => {
      grid.render(container, baseProps({ dataSource: many, pagination: true, currentPagingSize: 10 }));
      expect(container.querySelectorAll('.row-style').length).toBe(10);
    });

    it('shows every row when pagination is off', () => {
      grid.render(container, baseProps({ dataSource: many, pagination: false }));
      expect(container.querySelectorAll('.row-style').length).toBe(15);
    });

    it('shows every row (no client slicing) when remoteModeParams is set, regardless of pagination', () => {
      grid.render(container, baseProps({ dataSource: many, pagination: true, remoteMode: true, remoteModeParams: { endpoint: 'http://x', aliases: { data: 'items' } } }));
      expect(container.querySelectorAll('.row-style').length).toBe(15);
    });
  });

  describe('add row (onAddRowClick)', () => {
    it('gridMode "row": clicking Add starts an inline add-row instead of opening a dialog', () => {
      grid.render(container, baseProps({ gridMode: 'row' }));
      container.querySelector('button[aria-label="Add row"]').click();
      expect(container.querySelector('.inline-edit-input')).not.toBeNull();
      expect(mockRequestEditRow).not.toHaveBeenCalled();
    });

    it('gridMode "batch": clicking Add appends a new inline batch draft row instead of opening a dialog', () => {
      grid.render(container, baseProps({ gridMode: 'batch' }));
      const before = container.querySelectorAll('.column-layout > .full-row').length;
      container.querySelector('button[aria-label="Add row"]').click();
      const after = container.querySelectorAll('.column-layout > .full-row').length;
      expect(after).toBe(before + 1);
      expect(mockRequestEditRow).not.toHaveBeenCalled();
    });

    it('gridMode "popup" (default): clicking Add opens the edit-row dialog with the effective columns', async () => {
      mockRequestEditRow.mockResolvedValue(null);
      grid.render(container, baseProps({ gridMode: 'popup' }));
      container.querySelector('button[aria-label="Add row"]').click();
      await flush();
      expect(mockRequestEditRow).toHaveBeenCalledWith({ columns });
    });

    it('popup mode: a non-null dialog result adds the row to the store and fires onRowAdd', async () => {
      const onRowAdd = vi.fn();
      mockRequestEditRow.mockResolvedValue({ name: 'New', age: 1 });
      grid.render(container, baseProps({ gridMode: 'popup', onRowAdd }));
      container.querySelector('button[aria-label="Add row"]').click();
      await flush();
      expect(onRowAdd).toHaveBeenCalledWith({ name: 'New', age: 1 });
      expect(container.querySelectorAll('.row-style').length).toBe(3);
    });

    it('popup mode: a null dialog result (cancelled) does not add a row or fire onRowAdd', async () => {
      const onRowAdd = vi.fn();
      mockRequestEditRow.mockResolvedValue(null);
      grid.render(container, baseProps({ gridMode: 'popup', onRowAdd }));
      container.querySelector('button[aria-label="Add row"]').click();
      await flush();
      expect(onRowAdd).not.toHaveBeenCalled();
      expect(container.querySelectorAll('.row-style').length).toBe(2);
    });
  });

  describe('edit row (popup mode, via table onRowEdit -> onRowEditRequest)', () => {
    it('opens the edit dialog with the clicked row, and on confirm updates the store and fires onRowEdit', async () => {
      const onRowEdit = vi.fn();
      mockRequestEditRow.mockResolvedValue({ name: 'Alicia', age: 31 });
      grid.render(container, baseProps({ gridMode: 'popup', onRowEdit }));
      container.querySelectorAll('button[aria-label="Edit row"]')[0].click();
      await flush();
      expect(mockRequestEditRow).toHaveBeenCalledWith({ row: { name: 'Alice', age: 30 } });
      expect(onRowEdit).toHaveBeenCalledWith({ name: 'Alicia', age: 31 });
      expect(container.textContent).toContain('Alicia');
    });

    it('does nothing when the edit dialog is cancelled (null result)', async () => {
      const onRowEdit = vi.fn();
      mockRequestEditRow.mockResolvedValue(null);
      grid.render(container, baseProps({ gridMode: 'popup', onRowEdit }));
      container.querySelectorAll('button[aria-label="Edit row"]')[0].click();
      await flush();
      expect(onRowEdit).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Alice');
    });
  });

  describe('delete row (all modes)', () => {
    it('confirms before deleting, then removes the row from the store and fires onRowDelete', async () => {
      const onRowDelete = vi.fn();
      mockRequestConfirm.mockResolvedValue(true);
      grid.render(container, baseProps({ onRowDelete }));
      container.querySelectorAll('button[aria-label="Delete row"]')[0].click();
      await flush();
      expect(mockRequestConfirm).toHaveBeenCalledWith('Confirm delete', 'Are you sure you want to delete this row?');
      expect(onRowDelete).toHaveBeenCalledWith({ name: 'Alice', age: 30 });
      expect(container.querySelectorAll('.row-style').length).toBe(1);
    });

    it('does nothing when the delete confirmation is declined', async () => {
      const onRowDelete = vi.fn();
      mockRequestConfirm.mockResolvedValue(false);
      grid.render(container, baseProps({ onRowDelete }));
      container.querySelectorAll('button[aria-label="Delete row"]')[0].click();
      await flush();
      expect(onRowDelete).not.toHaveBeenCalled();
      expect(container.querySelectorAll('.row-style').length).toBe(2);
    });
  });

  describe('row mode inline save (onBatchRowSave)', () => {
    it('updates the store and fires onRowEdit when an inline row-mode edit is confirmed', async () => {
      const onRowEdit = vi.fn();
      mockRequestConfirm.mockResolvedValue(true);
      grid.render(container, baseProps({ gridMode: 'row', onRowEdit }));
      container.querySelectorAll('button[aria-label="Edit row"]')[0].click();
      const nameInput = container.querySelector('.inline-edit-input');
      nameInput.value = 'Alicia';
      nameInput.dispatchEvent(new Event('input'));
      container.querySelector('.row-action-save').click();
      await flush();
      expect(onRowEdit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alicia' }));
      expect(container.textContent).toContain('Alicia');
    });
  });

  describe('row mode inline add (onBatchRowAdd)', () => {
    it('adds the row to the store and fires onRowAdd when an inline row-mode add is confirmed', async () => {
      const onRowAdd = vi.fn();
      mockRequestConfirm.mockResolvedValue(true);
      grid.render(container, baseProps({ gridMode: 'row', onRowAdd }));
      container.querySelector('button[aria-label="Add row"]').click();
      const [nameInput] = container.querySelectorAll('.inline-edit-input');
      nameInput.value = 'Zed';
      nameInput.dispatchEvent(new Event('input'));
      container.querySelector('.row-action-save').click();
      await flush();
      expect(onRowAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zed' }));
      expect(container.querySelectorAll('.row-style').length).toBe(3);
    });
  });

  describe('batch mode commit (onBatchCommit)', () => {
    it('applies every updated row, adds every new row, and fires onBatchSave once with the whole payload', () => {
      const onBatchSave = vi.fn();
      grid.render(container, baseProps({ gridMode: 'batch', onBatchSave }));
      const [nameInput] = container.querySelectorAll('.inline-edit-input');
      nameInput.value = 'Alicia';
      nameInput.dispatchEvent(new Event('input'));
      container.querySelector('button[aria-label="Add row"]').click();
      const newRowInputs = container.querySelectorAll('.column-layout > .full-row')[2].querySelectorAll('.inline-edit-input');
      newRowInputs[0].value = 'Zed';
      newRowInputs[0].dispatchEvent(new Event('input'));

      container.querySelector('.batch-save-button').click();

      expect(onBatchSave).toHaveBeenCalledTimes(1);
      expect(onBatchSave.mock.calls[0][0].added).toEqual([expect.objectContaining({ name: 'Zed' })]);
      expect(onBatchSave.mock.calls[0][0].updated).toEqual([expect.objectContaining({ updated: expect.objectContaining({ name: 'Alicia' }) })]);
      expect(container.querySelectorAll('.row-style').length).toBe(3);
    });

    it('fires onBatchSave with empty added/updated when nothing changed and no new rows were added', () => {
      const onBatchSave = vi.fn();
      grid.render(container, baseProps({ gridMode: 'batch', onBatchSave }));
      container.querySelector('.batch-save-button').click();
      expect(onBatchSave).toHaveBeenCalledWith({ added: [], updated: [] });
    });
  });

  describe('toolbar visibility and wiring', () => {
    it('renders no toolbar at all when every toolbar-related flag is off and gridMode is not batch', () => {
      grid.render(container, baseProps({ showAdd: false, showSearch: false, exportExcel: false, exportPDF: false, gridMode: 'popup' }));
      expect(container.querySelector('.grid-toolbar')).toBeNull();
    });

    it('renders the toolbar for gridMode "batch" alone, even with every other flag off', () => {
      grid.render(container, baseProps({ showAdd: false, showSearch: false, exportExcel: false, exportPDF: false, gridMode: 'batch' }));
      expect(container.querySelector('.grid-toolbar')).not.toBeNull();
      expect(container.querySelector('.batch-save-button')).not.toBeNull();
    });

    it('omits the Add button when showAdd is false', () => {
      grid.render(container, baseProps({ showAdd: false, showSearch: true }));
      expect(container.querySelector('button[aria-label="Add row"]')).toBeNull();
    });

    it('omits the batch-save button outside of batch mode', () => {
      grid.render(container, baseProps({ gridMode: 'popup', showAdd: true }));
      expect(container.querySelector('.batch-save-button')).toBeNull();
    });

    it('Export to Excel button calls exportExcel with the currently displayed rows and effective columns', () => {
      grid.render(container, baseProps({ exportExcel: true }));
      container.querySelector('button[aria-label="Export to Excel"]').click();
      expect(mockExportExcel).toHaveBeenCalledWith(
        [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
        columns
      );
    });

    it('omits the Export Excel button when exportExcel is false', () => {
      grid.render(container, baseProps({ exportExcel: false }));
      expect(container.querySelector('button[aria-label="Export to Excel"]')).toBeNull();
    });

    it('Export to PDF button calls exportPdf with the currently displayed rows and effective columns', () => {
      grid.render(container, baseProps({ exportPDF: true }));
      container.querySelector('button[aria-label="Export to PDF"]').click();
      expect(mockExportPdf).toHaveBeenCalledWith(
        [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
        columns
      );
    });

    it('omits the Export PDF button when exportPDF is false', () => {
      grid.render(container, baseProps({ exportPDF: false }));
      expect(container.querySelector('button[aria-label="Export to PDF"]')).toBeNull();
    });

    it('omits the search input when showSearch is false', () => {
      grid.render(container, baseProps({ showSearch: false }));
      expect(container.querySelector('.global-search-input')).toBeNull();
    });

    it('typing in the search box filters the grid and keeps focus on the same logical input (withFocusPreserved)', () => {
      grid.render(container, baseProps({ showSearch: true }));
      const search = container.querySelector('.global-search-input');
      search.focus();
      search.value = 'ali';
      search.dispatchEvent(new Event('input'));
      const searchAfter = container.querySelector('.global-search-input');
      expect(document.activeElement).toBe(searchAfter);
      expect(container.querySelectorAll('.row-style').length).toBe(1);
      expect(container.textContent).toContain('Alice');
    });

    it('preserves cursor position (selectionStart/End) across the re-render triggered by typing', () => {
      grid.render(container, baseProps({ showSearch: true }));
      const search = container.querySelector('.global-search-input');
      search.focus();
      search.value = 'bo';
      search.setSelectionRange(1, 1);
      search.dispatchEvent(new Event('input'));
      const searchAfter = container.querySelector('.global-search-input');
      expect(searchAfter.selectionStart).toBe(1);
      expect(searchAfter.selectionEnd).toBe(1);
    });
  });

  describe('header wiring (onFilterChange / onSortToggle, invoked through the real header)', () => {
    it('clicking a column sort toggle sorts the displayed rows (onSortToggle -> store.toggleSort)', () => {
      grid.render(container, baseProps({ showSort: true }));
      container.querySelectorAll('.sort-toggle')[0].click(); // sort by name, first click = desc
      const firstCellText = container.querySelector('.section-style').textContent;
      expect(firstCellText).toBe('Bob'); // 'Bob' > 'Alice' descending
    });

    it('selecting a filter checkbox filters the displayed rows (onFilterChange -> store.setFilter)', () => {
      grid.render(container, baseProps({ showFilter: true }));
      container.querySelector('.filter-toggle').click(); // open the "name" column filter dropdown
      const aliceCheckbox = Array.from(container.querySelectorAll('.filter-option')).find(label => label.textContent === 'Alice').querySelector('input');
      aliceCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(container.querySelectorAll('.row-style').length).toBe(1);
      expect(container.textContent).toContain('Alice');
    });
  });

  describe('reentrancy guard regression (pager init-time store calls during renderBody)', () => {
    it('produces exactly one grid tree in the DOM after the very first render (no duplicate stacked output)', () => {
      grid.render(container, baseProps());
      expect(container.querySelectorAll(':scope > .border-area-small').length).toBe(1);
      expect(container.querySelectorAll('.grid-toolbar').length).toBe(1);
      expect(container.querySelectorAll('.page-number-background').length).toBe(1);
    });
  });

  describe('render() dataSource-change reload logic', () => {
    it('reloads when a render call after the FIRST reference change supplies yet another new dataSource reference', () => {
      const first = [{ name: 'A', age: 1 }];
      grid.render(container, baseProps({ dataSource: first }));
      const second = [{ name: 'B', age: 2 }]; // first post-mount reference change -> skipped (isFirstDataSource)
      grid.render(container, baseProps({ dataSource: second }));
      expect(container.textContent).toContain('A'); // unchanged, skip-first applied
      const third = [{ name: 'C', age: 3 }]; // second reference change -> reloads
      grid.render(container, baseProps({ dataSource: third }));
      expect(container.textContent).toContain('C');
    });

    it('does not re-fetch when the same (empty) dataSource reference is passed again on an unrelated re-render', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [{ name: 'Fetched', age: 1 }] });
      const emptyDataSource = [];
      grid.render(container, baseProps({ dataSource: emptyDataSource, fetchUrl: 'http://x/y' }));
      await flush();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      // Unrelated prop change, but the exact same dataSource array reference -> no reload branch entered at all.
      grid.render(container, baseProps({ dataSource: emptyDataSource, fetchUrl: 'http://x/y', showAdd: false }));
      await flush();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchNow()', () => {
    it('does nothing when called before any render (no lastProps yet)', () => {
      const freshGrid = createGrid();
      expect(() => freshGrid.fetchNow()).not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('re-invokes loadData with the last rendered props when called after a render', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [{ name: 'Fresh', age: 5 }] });
      grid.render(container, baseProps({ dataSource: [], fetchUrl: 'http://x/y' }));
      await flush();
      global.fetch.mockClear();
      grid.fetchNow();
      await flush();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(container.textContent).toContain('Fresh');
    });
  });

  describe('destroy()', () => {
    it('unsubscribes from the store so a later store mutation no longer re-renders the container', () => {
      grid.render(container, baseProps());
      grid.destroy();
      const beforeHtml = container.innerHTML;
      // Any further external store mutation must not touch the (now stale) container.
      expect(container.innerHTML).toBe(beforeHtml);
    });

    it('does not throw when called a second time (already-cleared unsubscribe guard)', () => {
      grid.render(container, baseProps());
      grid.destroy();
      expect(() => grid.destroy()).not.toThrow();
    });

    it('does not throw when called before any render', () => {
      const freshGrid = createGrid();
      expect(() => freshGrid.destroy()).not.toThrow();
    });
  });

  describe('defaultsFor() — minimal props still render correctly with defaults applied', () => {
    it('applies default tableBorder/pagination/etc. when a minimal props object is passed', () => {
      grid.render(container, { dataSource: [{ name: 'Solo', age: 1 }] });
      expect(container.querySelector('.border-area-small')).not.toBeNull(); // tableBorder defaults true
      expect(container.querySelector('.page-number-background')).toBeNull(); // pagination defaults false
    });
  });
});
