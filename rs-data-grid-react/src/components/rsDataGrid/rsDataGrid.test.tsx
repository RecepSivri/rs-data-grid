import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { RsDataGrid, RsDataGridHandle } from './rsDataGrid';
import { IColumn } from './models/rsDataGrid.models';

const jsonResponse = (body: any, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

const mockPdfSave = vi.fn();
const mockAutoTable = vi.fn();
const mockJsonToSheet = vi.fn(() => ({ sheet: true }));
const mockBookNew = vi.fn(() => ({ book: true }));
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (...args: any[]) => mockJsonToSheet(...args),
    book_new: (...args: any[]) => mockBookNew(...args),
    book_append_sheet: (...args: any[]) => mockBookAppendSheet(...args),
  },
  writeFile: (...args: any[]) => mockWriteFile(...args),
}));

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(function (this: any, opts: any) {
    this.__opts = opts;
    this.save = mockPdfSave;
  }),
}));

vi.mock('jspdf-autotable', () => ({
  default: (...args: any[]) => mockAutoTable(...args),
}));

const columns: IColumn[] = [
  { caption: 'name', dataField: 'name' },
  { caption: 'age', dataField: 'age' },
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('RsDataGrid - loading / error / empty / data states', () => {
  it('shows the default loading template while a fetch is pending', () => {
    (fetch as any).mockReturnValue(new Promise(() => {}));
    render(<RsDataGrid fetchUrl="http://api.test/data" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows a custom loadingTemplate when provided', () => {
    (fetch as any).mockReturnValue(new Promise(() => {}));
    render(<RsDataGrid fetchUrl="http://api.test/data" loadingTemplate={<div>Custom Loading</div>} />);
    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows the default error message when the fetch fails', async () => {
    (fetch as any).mockRejectedValue(new Error('network boom'));
    render(<RsDataGrid fetchUrl="http://api.test/data" />);
    expect(await screen.findByText('network boom')).toBeInTheDocument();
  });

  it('shows the generic fallback error message when the error has no message', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({}, false, 500));
    render(<RsDataGrid fetchUrl="http://api.test/data" />);
    expect(await screen.findByText('Request failed with status 500')).toBeInTheDocument();
  });

  it('falls back to a generic error message when the error message is genuinely empty', async () => {
    (fetch as any).mockRejectedValue(new Error(''));
    render(<RsDataGrid fetchUrl="http://api.test/data" />);
    expect(await screen.findByText('Something went wrong while loading data.')).toBeInTheDocument();
  });

  it('renders a custom errorTemplate function with the error', async () => {
    (fetch as any).mockRejectedValue(new Error('oops'));
    render(<RsDataGrid fetchUrl="http://api.test/data" errorTemplate={err => <div>Custom Error: {err.message}</div>} />);
    expect(await screen.findByText('Custom Error: oops')).toBeInTheDocument();
  });

  it('shows the default empty-state message when there is no data and no fetchUrl', () => {
    render(<RsDataGrid dataSource={[]} />);
    expect(screen.getByText('No data to display.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('applies border-area-small to the root when tableBorder is true, and omits it when false', () => {
    const { container, rerender } = render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} tableBorder={true} />);
    expect(container.firstChild).toHaveClass('border-area-small');
    rerender(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} tableBorder={false} />);
    expect(container.firstChild).not.toHaveClass('border-area-small');
  });

  it('shows a custom emptyTemplate when provided', () => {
    render(<RsDataGrid dataSource={[]} emptyTemplate={<div>Nothing here</div>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('sends an Authorization header built from authToken', async () => {
    (fetch as any).mockResolvedValue(jsonResponse([]));
    render(<RsDataGrid dataSource={[]} fetchUrl="http://api.test/data" authToken="secret" />);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('http://api.test/data', expect.objectContaining({ headers: { Authorization: 'Bearer secret' } }))
    );
  });

  it('renders the header, table and pager once data is available', () => {
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} pagination={true} pagingSizes={[10]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument(); // header caption, title-cased
  });
});

describe('RsDataGrid - effectiveColumns auto-derivation', () => {
  it('derives columns from the union of row keys (title-cased) when no columns prop is given', () => {
    render(<RsDataGrid dataSource={[{ a: 1, b: 2 }, { b: 3, c: 4 }]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('uses the explicit columns prop instead of deriving them when provided', () => {
    render(<RsDataGrid dataSource={[{ a: 1, extra: 'x' }]} columns={[{ caption: 'Only A', dataField: 'a' }]} />);
    expect(screen.getByText('Only A')).toBeInTheDocument();
    expect(screen.queryByText('Extra')).not.toBeInTheDocument();
  });
});

describe('RsDataGrid - column drag-reorder', () => {
  const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];

  it('reorders columns via drag-and-drop and keeps the order across a data update', () => {
    const { container, rerender } = render(<RsDataGrid dataSource={data} columns={columns} dragDropColumns={true} />);
    const handles = container.querySelectorAll('.drag-handle');
    const cells = container.querySelectorAll('.content-style');
    fireEvent.dragStart(handles[0], { dataTransfer: { effectAllowed: null } });
    fireEvent.drop(cells[1]);
    let captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Age', 'Name']);

    rerender(<RsDataGrid dataSource={[...data, { name: 'Carol', age: 40 }]} columns={columns} dragDropColumns={true} />);
    captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Age', 'Name']);
  });

  it('dropping a dragged column onto itself is a no-op', () => {
    const { container } = render(<RsDataGrid dataSource={data} columns={columns} dragDropColumns={true} />);
    const before = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    const handles = container.querySelectorAll('.drag-handle');
    const cells = container.querySelectorAll('.content-style');
    fireEvent.dragStart(handles[0], { dataTransfer: { effectAllowed: null } });
    fireEvent.drop(cells[0]);
    const after = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(after).toEqual(before);
  });

  it('dragging a column backward (later index onto an earlier one) reorders correctly', () => {
    const threeColumns: IColumn[] = [...columns, { caption: 'city', dataField: 'city' }];
    const { container } = render(
      <RsDataGrid dataSource={[{ name: 'A', age: 1, city: 'X' }]} columns={threeColumns} dragDropColumns={true} />
    );
    const handles = container.querySelectorAll('.drag-handle');
    const cells = container.querySelectorAll('.content-style');
    fireEvent.dragStart(handles[2], { dataTransfer: { effectAllowed: null } });
    fireEvent.drop(cells[0]);
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['City', 'Name', 'Age']);
  });

  it('drops fields from the retained drag order once they no longer exist, and appends genuinely new fields at the end', () => {
    const { container, rerender } = render(<RsDataGrid dataSource={data} columns={columns} dragDropColumns={true} />);
    fireEvent.dragStart(container.querySelectorAll('.drag-handle')[0], { dataTransfer: { effectAllowed: null } });
    fireEvent.drop(container.querySelectorAll('.content-style')[1]);
    // The first dataSource reference change after mount is intentionally
    // swallowed (see "RsDataGrid - dataSource prop change reload semantics"
    // below) -- an extra no-op rerender consumes that skip so the next
    // (real) change actually reloads.
    rerender(<RsDataGrid dataSource={[...data]} columns={[]} dragDropColumns={true} />);
    rerender(<RsDataGrid dataSource={[{ age: 5, genre: 'Action' }]} columns={[]} dragDropColumns={true} />);
    const captions = Array.from(container.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Age', 'Genre']);
  });
});

describe('RsDataGrid - Grid Settings', () => {
  const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];

  it('opens via the toolbar button and filters/orders visible columns, ignoring unknown fields', () => {
    render(<RsDataGrid dataSource={data} columns={columns} showGridSettings={true} />);
    fireEvent.click(screen.getByLabelText('Grid settings'));
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByRole('option', { name: 'age' }));
    let captions = Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Age']);
  });

  it('shows the badge dot once a selection is active, and hides it again once cleared', () => {
    render(<RsDataGrid dataSource={data} columns={columns} showGridSettings={true} />);
    fireEvent.click(screen.getByLabelText('Grid settings'));
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByRole('option', { name: 'name' }));
    expect(document.querySelector('.MuiBadge-dot:not(.MuiBadge-invisible)')).not.toBeNull();
    fireEvent.click(screen.getByText('Clear'));
    expect(document.querySelector('.MuiBadge-dot:not(.MuiBadge-invisible)')).toBeNull();
  });

  it('the Close button closes the dialog', async () => {
    render(<RsDataGrid dataSource={data} columns={columns} showGridSettings={true} />);
    fireEvent.click(screen.getByLabelText('Grid settings'));
    expect(screen.getByText('Grid Settings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('Grid Settings')).not.toBeInTheDocument());
  });

  it('persists the selection to localStorage and restores it on the next mount', () => {
    const { unmount } = render(<RsDataGrid dataSource={data} columns={columns} showGridSettings={true} />);
    fireEvent.click(screen.getByLabelText('Grid settings'));
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByRole('option', { name: 'name' }));
    unmount();
    render(<RsDataGrid dataSource={data} columns={columns} showGridSettings={true} />);
    const captions = Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Name']);
  });

  it('seeds the initial selection from defaultVisibleColumns on a fresh visit (nothing persisted yet)', () => {
    render(<RsDataGrid dataSource={data} columns={columns} defaultVisibleColumns={['age']} />);
    const captions = Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Age']);
  });

  it('ignores corrupted (non-array) persisted JSON and falls back to showing everything', () => {
    localStorage.setItem('rs-data-grid-selected-columns', JSON.stringify({ not: 'an array' }));
    render(<RsDataGrid dataSource={data} columns={columns} />);
    const captions = Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Name', 'Age']);
  });

  it('ignores unparseable persisted JSON and falls back to showing everything', () => {
    localStorage.setItem('rs-data-grid-selected-columns', 'not valid json {{{');
    render(<RsDataGrid dataSource={data} columns={columns} />);
    const captions = Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent);
    expect(captions).toEqual(['Name', 'Age']);
  });

  it('a real dataSource change resets the selection back to "show everything"', () => {
    const { rerender } = render(<RsDataGrid dataSource={[{ name: 'First', age: 1 }]} columns={columns} showGridSettings={true} />);
    fireEvent.click(screen.getByLabelText('Grid settings'));
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByRole('option', { name: 'name' }));
    expect(Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Name']);

    rerender(<RsDataGrid dataSource={[{ name: 'Second', age: 2 }]} columns={columns} showGridSettings={true} />);
    expect(Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Name']);
    rerender(<RsDataGrid dataSource={[{ name: 'Third', age: 3 }]} columns={columns} showGridSettings={true} />);
    expect(Array.from(document.querySelectorAll('.header-caption')).map(el => el.textContent)).toEqual(['Name', 'Age']);
  });
});

describe('RsDataGrid - header wiring (filter/sort)', () => {
  const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Carol', age: 20 }];

  it('a header filter selection narrows the displayed rows via the store', () => {
    const { container } = render(<RsDataGrid dataSource={data} columns={columns} showFilter={true} />);
    fireEvent.click(screen.getByLabelText('Filter name'));
    const checkbox = container.querySelector('.filter-panel input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    // Close the still-open filter dropdown so "Alice" is unambiguous (row cell only).
    fireEvent.click(document.body);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('a header sort toggle reorders the displayed rows via the store', () => {
    const { container } = render(<RsDataGrid dataSource={data} columns={columns} showSort={true} />);
    fireEvent.click(screen.getByLabelText('Sort name'));
    const names = Array.from(container.querySelectorAll('.section-style')).filter(el => !el.className.includes('drag')).map(el => el.textContent);
    // First click sorts descending: Carol, Bob, Alice (by age column absent from sort; sort is on `name` field alphabetically desc)
    expect(names[0]).toBe('Carol');
  });

  it('shows an inline "No matching rows" state when a filter/search leaves nothing, without unmounting the header', () => {
    render(<RsDataGrid dataSource={data} columns={columns} showSearch={true} />);
    const input = screen.getByLabelText('Search all columns');
    fireEvent.change(input, { target: { value: 'nonexistent name' } });
    expect(screen.getByText('No matching rows.')).toBeInTheDocument();
    expect(document.querySelector('.header-caption')).not.toBeNull();
  });
});

describe('RsDataGrid - row drag-and-drop', () => {
  it('reordering rows via drag calls store.moveRow, reflected in render order', () => {
    const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Carol', age: 20 }];
    const { container } = render(<RsDataGrid dataSource={data} columns={columns} dragDropRows={true} />);
    const handles = screen.getAllByLabelText('Reorder row');
    const rows = container.querySelectorAll('.column-layout > div');
    fireEvent.dragStart(handles[0], { dataTransfer: { effectAllowed: null } });
    fireEvent.drop(rows[2]);
    const names = Array.from(container.querySelectorAll('.section-style:not(.drag-cell)'))
      .filter((_, i) => i % 2 === 0)
      .map(el => el.textContent);
    expect(names).toEqual(['Bob', 'Carol', 'Alice']);
  });
});

describe('RsDataGrid - toolbar visibility', () => {
  it('renders no toolbar when search/export/add/gridSettings are all off and gridMode is not batch', () => {
    const { container } = render(
      <RsDataGrid
        dataSource={[{ name: 'A', age: 1 }]}
        columns={columns}
        showSearch={false}
        exportExcel={false}
        exportPDF={false}
        showAdd={false}
        showGridSettings={false}
        gridMode="popup"
      />
    );
    expect(container.querySelector('.grid-toolbar')).toBeNull();
  });

  it('renders the toolbar (with only the batch-save button) when gridMode is batch even if nothing else is enabled', () => {
    const { container } = render(
      <RsDataGrid dataSource={[{ name: 'A', age: 1 }]} columns={columns} showSearch={false} exportExcel={false} exportPDF={false} showAdd={false} gridMode="batch" />
    );
    expect(container.querySelector('.grid-toolbar')).not.toBeNull();
    expect(screen.getByLabelText('Save batch changes')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add row')).not.toBeInTheDocument();
  });

  it('renders the search input and updates the store on change', () => {
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]} columns={columns} showSearch={true} />);
    const search = screen.getByLabelText('Search all columns');
    fireEvent.change(search, { target: { value: 'ali' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });
});

describe('RsDataGrid - export', () => {
  const data = [{ name: 'Alice', age: 30 }];

  it('exports the currently displayed rows to Excel with title-cased captions', () => {
    render(<RsDataGrid dataSource={data} columns={columns} exportExcel={true} />);
    fireEvent.click(screen.getByLabelText('Export to Excel'));
    expect(mockJsonToSheet).toHaveBeenCalledWith([{ Name: 'Alice', Age: 30 }]);
    expect(mockBookNew).toHaveBeenCalled();
    expect(mockBookAppendSheet).toHaveBeenCalledWith({ book: true }, { sheet: true }, 'Sheet1');
    expect(mockWriteFile).toHaveBeenCalledWith({ book: true }, 'export.xlsx');
  });

  it('exports the currently displayed rows to PDF with landscape orientation and stringified cells', () => {
    render(<RsDataGrid dataSource={data} columns={columns} exportPDF={true} />);
    fireEvent.click(screen.getByLabelText('Export to PDF'));
    expect(mockAutoTable).toHaveBeenCalledTimes(1);
    const [doc, config] = mockAutoTable.mock.calls[0];
    expect(doc.__opts).toEqual({ orientation: 'landscape' });
    expect(config.head).toEqual([['Name', 'Age']]);
    expect(config.body).toEqual([['Alice', '30']]);
    expect(mockPdfSave).toHaveBeenCalledWith('export.pdf');
  });

  it('renders a null/undefined field value as an empty string in the PDF body', () => {
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: null }]} columns={columns} exportPDF={true} />);
    fireEvent.click(screen.getByLabelText('Export to PDF'));
    const [, config] = mockAutoTable.mock.calls[0];
    expect(config.body).toEqual([['Alice', '']]);
  });
});

describe('RsDataGrid - popup gridMode add/edit/delete flow', () => {
  it('adds a row through the popup dialog and calls onRowAdd', () => {
    const onRowAdd = vi.fn();
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} showAdd={true} showActions={true} gridMode="popup" onRowAdd={onRowAdd} />);
    fireEvent.click(screen.getByLabelText('Add row'));
    expect(screen.getByText('Add row', { selector: '.MuiDialogTitle-root' })).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Zed' } });
    fireEvent.change(inputs[1], { target: { value: '40' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onRowAdd).toHaveBeenCalledWith({ name: 'Zed', age: '40' });
    expect(screen.getByText('Zed')).toBeInTheDocument();
  });

  it('edits a row through the popup dialog and calls onRowEdit', () => {
    const onRowEdit = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGrid dataSource={[row]} columns={columns} showActions={true} gridMode="popup" onRowEdit={onRowEdit} />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    expect(screen.getByText('Edit row')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onRowEdit).toHaveBeenCalledWith({ name: 'Alicia', age: '30' });
    expect(screen.getByText('Alicia')).toBeInTheDocument();
  });

  it('cancelling the popup dialog does not add/edit anything', async () => {
    const onRowAdd = vi.fn();
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} showAdd={true} showActions={true} gridMode="popup" onRowAdd={onRowAdd} />);
    fireEvent.click(screen.getByLabelText('Add row'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onRowAdd).not.toHaveBeenCalled();
    // MUI's Dialog exit transition keeps the content mounted for a moment
    // after `open` flips to false, so this needs to wait rather than assert
    // synchronously (the delete-confirmation tests below already do this).
    await waitFor(() => expect(screen.queryByText('Add row', { selector: '.MuiDialogTitle-root' })).not.toBeInTheDocument());
  });

  it('deletes a row after confirming, and calls onRowDelete', async () => {
    const onRowDelete = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGrid dataSource={[row]} columns={columns} showActions={true} gridMode="popup" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    expect(screen.getByText('Confirm delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this row?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Yes'));
    await waitFor(() => expect(onRowDelete).toHaveBeenCalledWith(row));
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('declining the delete confirmation keeps the row', async () => {
    const onRowDelete = vi.fn();
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} showActions={true} gridMode="popup" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    fireEvent.click(screen.getByText('No'));
    await waitFor(() => expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument());
    expect(onRowDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});

describe('RsDataGrid - row gridMode add/edit flow', () => {
  it('adds an inline row (with confirm) and calls onRowAdd', async () => {
    const onRowAdd = vi.fn();
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} showAdd={true} showActions={true} gridMode="row" onRowAdd={onRowAdd} />);
    fireEvent.click(screen.getByLabelText('Add row'));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Zed' } });
    fireEvent.click(screen.getByLabelText('Save row'));
    expect(screen.getByText('Confirm add')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Yes'));
    await waitFor(() => expect(onRowAdd).toHaveBeenCalledWith({ name: 'Zed', age: '' }));
  });

  it('edits an inline row (with confirm) and calls onRowEdit', async () => {
    const onRowEdit = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGrid dataSource={[row]} columns={columns} showActions={true} gridMode="row" onRowEdit={onRowEdit} />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByLabelText('Save row'));
    expect(screen.getByText('Confirm save')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Yes'));
    await waitFor(() => expect(onRowEdit).toHaveBeenCalledWith({ name: 'Alicia', age: '30' }));
    expect(screen.getByText('Alicia')).toBeInTheDocument();
  });

  it('still deletes via confirmation dialog in row mode', async () => {
    const onRowDelete = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGrid dataSource={[row]} columns={columns} showActions={true} gridMode="row" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    fireEvent.click(screen.getByText('Yes'));
    await waitFor(() => expect(onRowDelete).toHaveBeenCalledWith(row));
  });
});

describe('RsDataGrid - batch gridMode flow', () => {
  it('adds and edits rows inline, then commits everything via Save batch changes', () => {
    const onRowAdd = vi.fn();
    const onRowEdit = vi.fn();
    const onBatchSave = vi.fn();
    const rowA = { name: 'Alice', age: 30 };
    render(
      <RsDataGrid
        dataSource={[rowA]}
        columns={columns}
        showAdd={true}
        showActions={true}
        gridMode="batch"
        onRowAdd={onRowAdd}
        onRowEdit={onRowEdit}
        onBatchSave={onBatchSave}
      />
    );
    // Edit existing row inline.
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    // Add a new inline row.
    fireEvent.click(screen.getByLabelText('Add row'));
    const newRowInputs = screen.getAllByRole('textbox');
    fireEvent.change(newRowInputs[newRowInputs.length - 2], { target: { value: 'Carol' } });

    fireEvent.click(screen.getByLabelText('Save batch changes'));

    // Batch commit only fires the aggregate onBatchSave -- individual
    // onRowEdit/onRowAdd are for the popup/row-mode single-row flows, not
    // batch commit (same contract as the Vue/vanilla/jQuery implementations).
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(onRowAdd).not.toHaveBeenCalled();
    expect(onBatchSave).toHaveBeenCalledWith({
      added: [{ name: 'Carol', age: '' }],
      updated: [{ original: rowA, updated: { name: 'Alicia', age: '30' } }],
    });
    // Batch mode's own row commit is a store update (not a data reload), so
    // the row cells stay editable inputs -- assert on their value, not text.
    expect(screen.getByDisplayValue('Alicia')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Carol')).toBeInTheDocument();
  });

  it('deletes still go through the confirmation dialog in batch mode', async () => {
    const onRowDelete = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGrid dataSource={[row]} columns={columns} showActions={true} gridMode="batch" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    fireEvent.click(screen.getByText('Yes'));
    await waitFor(() => expect(onRowDelete).toHaveBeenCalledWith(row));
  });
});

describe('RsDataGrid - fetchNow via ref', () => {
  it('re-runs loadData when fetchNow is invoked imperatively', async () => {
    (fetch as any).mockResolvedValue(jsonResponse([{ name: 'Alice', age: 30 }]));
    const ref = createRef<RsDataGridHandle>();
    render(<RsDataGrid ref={ref} fetchUrl="http://api.test/data" columns={columns} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    act(() => {
      ref.current!.fetchNow();
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});

describe('RsDataGrid - remoteMode', () => {
  it('uses the provided dataSource directly (remote=true) without calling fetch', () => {
    // Note: loadData() computes `new URL(remoteModeParams!.endpoint)` unconditionally whenever
    // remoteMode is true, even on the dataSource-provided path, so remoteModeParams must be set.
    render(
      <RsDataGrid
        remoteMode={true}
        dataSource={[{ name: 'Alice', age: 30 }]}
        columns={columns}
        remoteModeParams={{ endpoint: 'http://api.test/remote', aliases: { data: 'items' } }}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches through remoteModeParams (endpoint + data alias) when dataSource is empty', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ items: [{ name: 'Alice', age: 30 }], size: 33 }));
    render(
      <RsDataGrid
        remoteMode={true}
        dataSource={[]}
        columns={columns}
        remoteModeParams={{ endpoint: 'http://api.test/remote', aliases: { data: 'items' } }}
        pagination={true}
        pagingSizes={[10]}
      />
    );
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = (fetch as any).mock.calls[0];
    expect(calledUrl).toContain('http://api.test/remote');
    expect(calledUrl).toContain('page=0');
  });

  it('does not client-side slice rows when remoteModeParams is set, even though pagination is on', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ name: `Row${i}`, age: i }));
    render(
      <RsDataGrid
        remoteMode={true}
        dataSource={rows}
        columns={columns}
        remoteModeParams={{ endpoint: 'http://api.test/remote', aliases: { data: 'items' } }}
        pagination={true}
        pagingSizes={[10]}
        currentPagingSize={10}
      />
    );
    // All 15 rows render because remoteModeParams bypasses the local pagination slice.
    expect(screen.getByText('Row0')).toBeInTheDocument();
    expect(screen.getByText('Row14')).toBeInTheDocument();
  });

  it('client-side slices rows to the current page when pagination is on and remoteModeParams is not set', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ name: `Row${i}`, age: i }));
    render(<RsDataGrid dataSource={rows} columns={columns} pagination={true} pagingSizes={[10]} currentPagingSize={10} />);
    expect(screen.getByText('Row0')).toBeInTheDocument();
    expect(screen.getByText('Row9')).toBeInTheDocument();
    expect(screen.queryByText('Row10')).not.toBeInTheDocument();
  });
});

describe('RsDataGrid - dataSource prop change reload semantics', () => {
  it('does not reload when the dataSource prop reference is unchanged across a re-render', () => {
    const rows = [{ name: 'Alice', age: 30 }];
    const { rerender } = render(<RsDataGrid dataSource={rows} columns={columns} showActions={false} />);
    rerender(<RsDataGrid dataSource={rows} columns={columns} showActions={true} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips the first dataSource reference change, then reloads on the next one', () => {
    const { rerender } = render(<RsDataGrid dataSource={[{ name: 'First', age: 1 }]} columns={columns} />);
    expect(screen.getByText('First')).toBeInTheDocument();

    // First reference change is skipped by design.
    rerender(<RsDataGrid dataSource={[{ name: 'Second', age: 2 }]} columns={columns} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();

    // Second reference change actually reloads.
    rerender(<RsDataGrid dataSource={[{ name: 'Third', age: 3 }]} columns={columns} />);
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });
});

describe('RsDataGrid - loadData branch when both dataSource and fetchUrl are empty', () => {
  it('renders the empty state without ever calling fetch (remoteMode false)', () => {
    render(<RsDataGrid dataSource={[]} fetchUrl="" remoteMode={false} />);
    expect(screen.getByText('No data to display.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
