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

  it('shows a custom emptyTemplate when provided', () => {
    render(<RsDataGrid dataSource={[]} emptyTemplate={<div>Nothing here</div>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
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

describe('RsDataGrid - toolbar visibility', () => {
  it('renders no toolbar when search/export/add are all off and gridMode is not batch', () => {
    const { container } = render(
      <RsDataGrid dataSource={[{ name: 'A', age: 1 }]} columns={columns} showSearch={false} exportExcel={false} exportPDF={false} showAdd={false} gridMode="popup" />
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

  it('cancelling the popup dialog does not add/edit anything', () => {
    const onRowAdd = vi.fn();
    render(<RsDataGrid dataSource={[{ name: 'Alice', age: 30 }]} columns={columns} showAdd={true} showActions={true} gridMode="popup" onRowAdd={onRowAdd} />);
    fireEvent.click(screen.getByLabelText('Add row'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onRowAdd).not.toHaveBeenCalled();
    expect(screen.queryByText('Add row', { selector: '.MuiDialogTitle-root' })).not.toBeInTheDocument();
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

    expect(onRowEdit).toHaveBeenCalledWith({ name: 'Alicia', age: '30' });
    expect(onRowAdd).toHaveBeenCalledWith({ name: 'Carol', age: '' });
    expect(onBatchSave).toHaveBeenCalledWith({
      added: [{ name: 'Carol', age: '' }],
      updated: [{ original: rowA, updated: { name: 'Alicia', age: '30' } }],
    });
    expect(screen.getByText('Alicia')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
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
