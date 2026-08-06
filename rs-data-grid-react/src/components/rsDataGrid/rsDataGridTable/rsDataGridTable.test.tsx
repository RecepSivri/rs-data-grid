import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RsDataGridTable, RsDataGridTableHandle } from './rsDataGridTable';
import { IColumn } from '../models/rsDataGrid.models';

const columns: IColumn[] = [
  { caption: 'Name', dataField: 'name' },
  { caption: 'Age', dataField: 'age' },
];

const baseProps = {
  columns,
  bodyRowLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusBottom: false,
  diagonalRow: true,
  showActions: true,
  showIndex: false,
  indexOffset: 0,
  onRowEdit: vi.fn(),
  onRowDelete: vi.fn(),
  onBatchRowSave: vi.fn(),
  onBatchRowAdd: vi.fn(),
  onBatchCommit: vi.fn(),
  onRequestConfirm: vi.fn(),
};

describe('RsDataGridTable - popup/default mode rendering', () => {
  it('renders static cell content and row index using indexOffset', () => {
    const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
    render(<RsDataGridTable {...baseProps} data={data} gridMode="popup" showIndex={true} indexOffset={20} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument(); // 20 + 0 + 1
    expect(screen.getByText('22')).toBeInTheDocument(); // 20 + 1 + 1
  });

  it('does not render the index cell when showIndex is false', () => {
    render(<RsDataGridTable {...baseProps} data={[{ name: 'Alice', age: 30 }]} gridMode="popup" showIndex={false} />);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('calls onRowEdit directly (no inline editing) when the Edit button is clicked in popup mode', () => {
    const onRowEdit = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="popup" onRowEdit={onRowEdit} />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    expect(onRowEdit).toHaveBeenCalledWith(row);
    // no inline inputs appear
    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
  });

  it('calls onRowDelete directly when the Delete button is clicked', () => {
    const onRowDelete = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="popup" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    expect(onRowDelete).toHaveBeenCalledWith(row);
  });

  it('does not render action buttons when showActions is false', () => {
    render(<RsDataGridTable {...baseProps} data={[{ name: 'Alice', age: 30 }]} gridMode="popup" showActions={false} />);
    expect(screen.queryByLabelText('Edit row')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete row')).not.toBeInTheDocument();
  });

  it('applies row-background class on odd rows only when diagonalRow is true', () => {
    const data = [{ name: 'A', age: 1 }, { name: 'B', age: 2 }, { name: 'C', age: 3 }];
    const { container } = render(<RsDataGridTable {...baseProps} data={data} gridMode="popup" diagonalRow={true} />);
    const rows = container.querySelectorAll('.column-layout > div');
    expect(rows[0].className).not.toContain('row-background');
    expect(rows[1].className).toContain('row-background');
    expect(rows[2].className).not.toContain('row-background');
  });

  it('does not apply row-background when diagonalRow is false', () => {
    const data = [{ name: 'A', age: 1 }, { name: 'B', age: 2 }];
    const { container } = render(<RsDataGridTable {...baseProps} data={data} gridMode="popup" diagonalRow={false} />);
    const rows = container.querySelectorAll('.column-layout > div');
    expect(rows[1].className).not.toContain('row-background');
  });

  it('applies border-area-small to the last row when borderRadiusBottom is true', () => {
    const data = [{ name: 'A', age: 1 }, { name: 'B', age: 2 }];
    const { container } = render(<RsDataGridTable {...baseProps} data={data} gridMode="popup" borderRadiusBottom={true} tableBorder={true} />);
    const rows = container.querySelectorAll('.column-layout > div');
    expect(rows[1].className).toContain('border-area-small');
    expect(rows[0].className).not.toContain('border-area-small');
  });

  it('applies row-style-bottom between rows when bodyRowLines is true and tableBorder is false', () => {
    const data = [{ name: 'A', age: 1 }, { name: 'B', age: 2 }];
    const { container } = render(<RsDataGridTable {...baseProps} data={data} gridMode="popup" bodyRowLines={true} tableBorder={false} />);
    const rows = container.querySelectorAll('.column-layout > div');
    expect(rows[0].className).toContain('row-style-bottom');
    expect(rows[1].className).not.toContain('row-style-bottom');
    // tableBorder is false, so the (separate) "row-style" token must be absent -- check as a
    // whitespace-delimited class token rather than a substring (row-style-bottom contains it).
    expect(rows[0].className.split(' ')).not.toContain('row-style');
  });

  it('omits the border-right class on the last column cell when showActions is false', () => {
    const data = [{ name: 'A', age: 1 }];
    const { container } = render(<RsDataGridTable {...baseProps} data={data} gridMode="popup" showActions={false} bodyColumnLines={true} />);
    const cells = container.querySelectorAll('.section-style');
    expect(cells[0].className).toContain('border-right'); // first column, not last
    expect(cells[1].className).not.toContain('border-right'); // last column, no actions
  });
});

describe('RsDataGridTable - row mode (inline add/edit)', () => {
  it('startAddingRow (via ref) renders an inline add row with empty inputs', () => {
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="row" />);
    act(() => ref.current!.startAddingRow());
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(inputs.every(i => i.value === '')).toBe(true);
  });

  it('typing into the add-row inputs updates the draft', () => {
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="row" />);
    act(() => ref.current!.startAddingRow());
    const [nameInput] = screen.getAllByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'New Person' } });
    expect(screen.getByDisplayValue('New Person')).toBeInTheDocument();
  });

  it('saving the add row asks for confirmation, and on confirm calls onBatchRowAdd and closes the row', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(true);
    const onBatchRowAdd = vi.fn();
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="row" onRequestConfirm={onRequestConfirm} onBatchRowAdd={onBatchRowAdd} />);
    act(() => ref.current!.startAddingRow());
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'New Person' } });
    fireEvent.click(screen.getByLabelText('Save row'));
    expect(onRequestConfirm).toHaveBeenCalledWith('Confirm add', 'Are you sure you want to add this row?');
    await vi.waitFor(() => expect(onBatchRowAdd).toHaveBeenCalledWith({ name: 'New Person', age: '' }));
    await vi.waitFor(() => expect(screen.queryByLabelText('Save row')).not.toBeInTheDocument());
  });

  it('saving the add row does nothing when confirmation is declined', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(false);
    const onBatchRowAdd = vi.fn();
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="row" onRequestConfirm={onRequestConfirm} onBatchRowAdd={onBatchRowAdd} />);
    act(() => ref.current!.startAddingRow());
    fireEvent.click(screen.getByLabelText('Save row'));
    await vi.waitFor(() => expect(onRequestConfirm).toHaveBeenCalled());
    expect(onBatchRowAdd).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Save row')).toBeInTheDocument(); // still open
  });

  it('cancelling the add row closes it without calling onBatchRowAdd', () => {
    const onBatchRowAdd = vi.fn();
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="row" onBatchRowAdd={onBatchRowAdd} />);
    act(() => ref.current!.startAddingRow());
    fireEvent.click(screen.getByLabelText('Cancel'));
    expect(onBatchRowAdd).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Save row')).not.toBeInTheDocument();
  });

  it('clicking Edit on a row switches it into inline edit mode with prefilled inputs', () => {
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="row" />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('treats null/undefined field values as empty strings when starting inline edit', () => {
    const row = { name: null, age: undefined };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="row" />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map(i => i.value)).toEqual(['', '']);
  });

  it('editing input values and saving (after confirm) calls onBatchRowSave with the merged row and exits edit mode', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(true);
    const onBatchRowSave = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="row" onRequestConfirm={onRequestConfirm} onBatchRowSave={onBatchRowSave} />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByLabelText('Save row'));
    expect(onRequestConfirm).toHaveBeenCalledWith('Confirm save', 'Are you sure you want to save the changes to this row?');
    await vi.waitFor(() => expect(onBatchRowSave).toHaveBeenCalledWith({ original: row, updated: { name: 'Alicia', age: '30' } }));
    await vi.waitFor(() => expect(screen.queryByLabelText('Save row')).not.toBeInTheDocument());
  });

  it('declining the save confirmation keeps the row in edit mode', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(false);
    const onBatchRowSave = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="row" onRequestConfirm={onRequestConfirm} onBatchRowSave={onBatchRowSave} />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    fireEvent.click(screen.getByLabelText('Save row'));
    await vi.waitFor(() => expect(onRequestConfirm).toHaveBeenCalled());
    expect(onBatchRowSave).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
  });

  it('cancelling inline edit reverts to static display without saving', () => {
    const onBatchRowSave = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="row" onBatchRowSave={onBatchRowSave} />);
    fireEvent.click(screen.getByLabelText('Edit row'));
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByLabelText('Cancel'));
    expect(onBatchRowSave).not.toHaveBeenCalled();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Changed')).not.toBeInTheDocument();
  });

  it('a second, non-editing row still renders statically while another row is being edited', () => {
    const rowA = { name: 'Alice', age: 30 };
    const rowB = { name: 'Bob', age: 25 };
    render(<RsDataGridTable {...baseProps} data={[rowA, rowB]} gridMode="row" />);
    fireEvent.click(screen.getAllByLabelText('Edit row')[0]);
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('delete still works directly (no confirm) while in row mode', () => {
    const onRowDelete = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="row" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    expect(onRowDelete).toHaveBeenCalledWith(row);
  });
});

describe('RsDataGridTable - batch mode', () => {
  it('initializes batch drafts from data and renders editable inputs prefilled', () => {
    const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: null }];
    render(<RsDataGridTable {...baseProps} data={data} gridMode="batch" />);
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
  });

  it('editing a batch draft input updates only that field for that row', () => {
    const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
    render(<RsDataGridTable {...baseProps} data={data} gridMode="batch" />);
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    expect(screen.getByDisplayValue('Alicia')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
  });

  it('delete button in batch mode calls onRowDelete directly', () => {
    const onRowDelete = vi.fn();
    const row = { name: 'Alice', age: 30 };
    render(<RsDataGridTable {...baseProps} data={[row]} gridMode="batch" onRowDelete={onRowDelete} />);
    fireEvent.click(screen.getByLabelText('Delete row'));
    expect(onRowDelete).toHaveBeenCalledWith(row);
  });

  it('addBatchRow (via ref) appends a blank inline new-row', () => {
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="batch" />);
    act(() => ref.current!.addBatchRow());
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(inputs.every(i => i.value === '')).toBe(true);
    expect(screen.getByLabelText('Remove row')).toBeInTheDocument();
  });

  it('editing a new batch row updates its draft', () => {
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="batch" />);
    act(() => ref.current!.addBatchRow());
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Zed' } });
    expect(screen.getByDisplayValue('Zed')).toBeInTheDocument();
  });

  it('removing a new batch row via "Remove row" removes only that entry', () => {
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[]} gridMode="batch" />);
    act(() => ref.current!.addBatchRow());
    act(() => ref.current!.addBatchRow());
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'First' } });
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: 'Second' } });
    fireEvent.click(screen.getAllByLabelText('Remove row')[0]);
    expect(screen.queryByDisplayValue('First')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Second')).toBeInTheDocument();
  });

  it('saveBatch (via ref) reports only dirty existing rows as updated and clones new drafts as added, then clears new drafts', () => {
    const onBatchCommit = vi.fn();
    const rowA = { name: 'Alice', age: 30 };
    const rowB = { name: 'Bob', age: 25 };
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={[rowA, rowB]} gridMode="batch" onBatchCommit={onBatchCommit} />);

    // Only edit rowA -- rowB stays clean.
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    act(() => ref.current!.addBatchRow());
    // Inputs: [rowA.name, rowA.age, rowB.name, rowB.age, newRow.name, newRow.age] -- index 4 is the new row's name field.
    fireEvent.change(screen.getAllByRole('textbox')[4], { target: { value: 'Carol' } });

    act(() => ref.current!.saveBatch());

    expect(onBatchCommit).toHaveBeenCalledTimes(1);
    const payload = onBatchCommit.mock.calls[0][0];
    expect(payload.updated).toEqual([{ original: rowA, updated: { name: 'Alicia', age: '30' } }]);
    expect(payload.added).toEqual([{ name: 'Carol', age: '' }]);

    // new drafts are cleared after save
    expect(screen.queryByLabelText('Remove row')).not.toBeInTheDocument();
  });

  it('saveBatch reports no updates when no batch draft differs from its source row', () => {
    const onBatchCommit = vi.fn();
    const data = [{ name: 'Alice', age: 30 }];
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={data} gridMode="batch" onBatchCommit={onBatchCommit} />);
    act(() => ref.current!.saveBatch());
    expect(onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
  });

  it('saveBatch skips rows whose batch draft is not yet populated (e.g. saveBatch invoked outside batch mode)', () => {
    // gridMode is "popup" here, so the batch-draft-population effect never runs and
    // batchDrafts stays empty -- saveBatch's `if (!draft) return;` guard is exercised.
    const onBatchCommit = vi.fn();
    const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
    const ref = createRef<RsDataGridTableHandle>();
    render(<RsDataGridTable {...baseProps} ref={ref} data={data} gridMode="popup" onBatchCommit={onBatchCommit} />);
    act(() => ref.current!.saveBatch());
    expect(onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
  });

  it('preserves an edited (dirty) batch draft across a re-render that keeps the same row references', () => {
    const data = [{ name: 'Alice', age: 30 }];
    const { rerender } = render(<RsDataGridTable {...baseProps} data={data} gridMode="batch" />);
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    // Re-render with a new columns array reference (same row objects) -- the effect
    // re-runs (columns is a dependency) but should keep the edited draft via row identity.
    const newColumns = [...columns];
    rerender(<RsDataGridTable {...baseProps} data={data} gridMode="batch" columns={newColumns} />);
    expect(screen.getByDisplayValue('Alicia')).toBeInTheDocument();
  });

  it('resets batch drafts to fresh values when the data array is replaced with new row objects', () => {
    const data1 = [{ name: 'Alice', age: 30 }];
    const { rerender } = render(<RsDataGridTable {...baseProps} data={data1} gridMode="batch" />);
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } });
    const data2 = [{ name: 'Someone Else', age: 40 }];
    rerender(<RsDataGridTable {...baseProps} data={data2} gridMode="batch" />);
    expect(screen.queryByDisplayValue('Alicia')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Someone Else')).toBeInTheDocument();
  });

  it('resyncs batch drafts (clearing them) when gridMode switches away from batch and back', () => {
    const data = [{ name: 'Alice', age: 30 }];
    const { rerender } = render(<RsDataGridTable {...baseProps} data={data} gridMode="batch" />);
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Edited' } });
    rerender(<RsDataGridTable {...baseProps} data={data} gridMode="popup" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    rerender(<RsDataGridTable {...baseProps} data={data} gridMode="batch" />);
    // Back in batch mode: row identity unchanged, so the effect's draftByRow map (built from
    // the *previous* batchDrafts state) still had the edited value at the time gridMode was 'popup'... but the effect bails out
    // entirely when gridMode !== 'batch', so drafts were never cleared while away; re-entering re-runs the sync using the row
    // that's still associated in batchDraftRowRefsRef.
    expect(screen.getByDisplayValue('Edited')).toBeInTheDocument();
  });
});
