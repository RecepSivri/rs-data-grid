import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTable } from './rsDataGridTable';

const columns = [
  { caption: 'title', dataField: 'title' },
  { caption: 'poster', dataField: 'poster' },
];

const baseProps = (overrides = {}) => ({
  columns,
  data: [
    { title: 'Movie A', poster: 'https://example.com/a.png' },
    { title: 'Movie B', poster: 'https://example.com/b.png' },
  ],
  bodyRowLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusBottom: false,
  diagonalRow: true,
  showActions: true,
  showIndex: false,
  dragDropRows: false,
  indexOffset: 0,
  gridMode: 'popup',
  onRowDelete: vi.fn(),
  onRowMove: vi.fn(),
  onRowEdit: vi.fn(),
  onRequestConfirm: vi.fn(async () => true),
  onBatchRowSave: vi.fn(),
  onBatchRowAdd: vi.fn(),
  onBatchCommit: vi.fn(),
  ...overrides,
});

let container;
let table;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  table = createTable();
});

afterEach(() => {
  container.remove();
});

const dataRows = () => Array.from(container.querySelectorAll('.column-layout > .full-row'));
const actionButton = (row, cls) => row.querySelector('.actions-cell .' + cls);
const editBtn = row => row.querySelector('.row-action-button:not(.row-action-delete):not(.row-action-save)');
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('display rows (popup mode)', () => {
  it('renders a cell per column with the row value as text and title attribute', () => {
    table.render(container, baseProps({ data: [{ title: 'Solo', poster: 'not-an-image' }] }));
    const row = dataRows()[0];
    const cell = row.querySelectorAll('.section-style')[0];
    expect(cell.textContent).toBe('Solo');
    expect(cell.getAttribute('title')).toBe('Solo');
  });

  it('renders an <img> thumbnail (no title/text) for image-URL values', () => {
    table.render(container, baseProps({ data: [{ title: 'Solo', poster: 'https://example.com/x.jpg' }] }));
    const row = dataRows()[0];
    const posterCell = row.querySelectorAll('.section-style')[1];
    const img = posterCell.querySelector('img.cell-thumbnail');
    expect(img.getAttribute('src')).toBe('https://example.com/x.jpg');
    expect(posterCell.hasAttribute('title')).toBe(false);
  });

  it('renders null/undefined values as empty text with an empty title', () => {
    table.render(container, baseProps({ data: [{ title: null, poster: undefined }] }));
    const row = dataRows()[0];
    const cell = row.querySelectorAll('.section-style')[0];
    expect(cell.textContent).toBe('');
    expect(cell.getAttribute('title')).toBe('');
  });

  it('shows an index cell with the offset applied when showIndex is on', () => {
    table.render(container, baseProps({ showIndex: true, indexOffset: 10 }));
    const row = dataRows()[0];
    expect(row.querySelector('.index-cell').textContent).toBe('11');
  });

  it('omits border-right on the leading drag/index cells when bodyColumnLines is off', () => {
    table.render(container, baseProps({ dragDropRows: true, showIndex: true, bodyColumnLines: false }));
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell').classList.contains('border-right')).toBe(false);
    expect(row.querySelector('.index-cell').classList.contains('border-right')).toBe(false);
  });

  it('omits the actions cell when showActions is off', () => {
    table.render(container, baseProps({ showActions: false }));
    expect(dataRows()[0].querySelector('.actions-cell')).toBeNull();
  });

  it('Edit calls onRowEdit directly in popup mode (no inline editing state)', () => {
    const props = baseProps({ gridMode: 'popup' });
    table.render(container, props);
    const row = dataRows()[0];
    editBtn(row).click();
    expect(props.onRowEdit).toHaveBeenCalledWith(props.data[0]);
    expect(row.querySelector('.inline-edit-input')).toBeNull();
  });

  it('Delete calls onRowDelete with the row', () => {
    const props = baseProps();
    table.render(container, props);
    const row = dataRows()[0];
    actionButton(row, 'row-action-delete').click();
    expect(props.onRowDelete).toHaveBeenCalledWith(props.data[0]);
  });
});

describe('row-style classes', () => {
  it('marks the last row row-style-bottom when tableBorder is on', () => {
    table.render(container, baseProps({ tableBorder: true, bodyRowLines: false }));
    const rows = dataRows();
    expect(rows[rows.length - 1].classList.contains('row-style-bottom')).toBe(true);
  });

  it('marks non-last rows row-style-bottom when bodyRowLines is on', () => {
    table.render(container, baseProps({ tableBorder: false, bodyRowLines: true }));
    const rows = dataRows();
    expect(rows[0].classList.contains('row-style-bottom')).toBe(true);
  });

  it('omits row-style-bottom on the last row when both tableBorder and bodyRowLines are off', () => {
    table.render(container, baseProps({ tableBorder: false, bodyRowLines: false }));
    const rows = dataRows();
    expect(rows[rows.length - 1].classList.contains('row-style-bottom')).toBe(false);
  });

  it('adds border-area-small to the last row when borderRadiusBottom is on', () => {
    table.render(container, baseProps({ borderRadiusBottom: true }));
    const rows = dataRows();
    expect(rows[rows.length - 1].classList.contains('border-area-small')).toBe(true);
    expect(rows[0].classList.contains('border-area-small')).toBe(false);
  });

  it('alternates row-background on odd rows when diagonalRow is on', () => {
    table.render(container, baseProps({ diagonalRow: true }));
    const rows = dataRows();
    expect(rows[0].classList.contains('row-background')).toBe(false);
    expect(rows[1].classList.contains('row-background')).toBe(true);
  });

  it('never adds row-background when diagonalRow is off', () => {
    table.render(container, baseProps({ diagonalRow: false }));
    dataRows().forEach(row => expect(row.classList.contains('row-background')).toBe(false));
  });
});

describe('row mode (inline single-row editing)', () => {
  it('Edit switches that row into inline-editing with prefilled inputs', () => {
    const props = baseProps({ gridMode: 'row' });
    table.render(container, props);
    editBtn(dataRows()[0]).click();
    const row = dataRows()[0];
    const inputs = row.querySelectorAll('.inline-edit-input');
    expect(inputs.length).toBe(2);
    expect(inputs[0].value).toBe('Movie A');
    expect(props.onRowEdit).not.toHaveBeenCalled();
  });

  it('typing updates the draft without re-rendering (other row untouched)', () => {
    table.render(container, baseProps({ gridMode: 'row' }));
    editBtn(dataRows()[0]).click();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Edited title';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('Edited title');
  });

  it('Cancel exits editing mode without saving', () => {
    table.render(container, baseProps({ gridMode: 'row' }));
    editBtn(dataRows()[0]).click();
    const cancelBtn = dataRows()[0].querySelectorAll('.row-action-button')[1];
    cancelBtn.click();
    expect(dataRows()[0].querySelector('.inline-edit-input')).toBeNull();
  });

  it('keeps typed-in-progress edits across a full external re-render', () => {
    const props = baseProps({ gridMode: 'row' });
    table.render(container, props);
    editBtn(dataRows()[0]).click();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'In progress';
    input.dispatchEvent(new Event('input'));
    table.render(container, props);
    expect(dataRows()[0].querySelectorAll('.inline-edit-input')[0].value).toBe('In progress');
  });

  it('a column added after entering edit mode falls back to an empty value for it', () => {
    const props = baseProps({ gridMode: 'row', columns: [columns[0]] });
    table.render(container, props);
    editBtn(dataRows()[0]).click();
    table.render(container, { ...props, columns });
    const posterInput = dataRows()[0].querySelectorAll('.inline-edit-input')[1];
    expect(posterInput.value).toBe('');
  });

  it('omits Save/Cancel actions while editing once showActions turns off mid-edit', () => {
    const props = baseProps({ gridMode: 'row' });
    table.render(container, props);
    editBtn(dataRows()[0]).click();
    // Same row references, showActions flips off -- editingRow (matched by
    // identity) is still the same row, so this stays in inline-edit mode.
    table.render(container, { ...props, showActions: false });
    expect(dataRows()[0].querySelector('.actions-cell')).toBeNull();
    expect(dataRows()[0].querySelector('.inline-edit-input')).not.toBeNull();
  });

  it('Save asks for confirmation, then commits the merged row via onBatchRowSave', async () => {
    const props = baseProps({ gridMode: 'row', onRequestConfirm: vi.fn(async () => true) });
    table.render(container, props);
    editBtn(dataRows()[0]).click();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'New title';
    input.dispatchEvent(new Event('input'));
    dataRows()[0].querySelector('.row-action-save').click();
    await flush();
    expect(props.onRequestConfirm).toHaveBeenCalledWith('Confirm save', expect.any(String));
    expect(props.onBatchRowSave).toHaveBeenCalledWith({
      original: props.data[0],
      updated: { title: 'New title', poster: 'https://example.com/a.png' },
    });
    expect(dataRows()[0].querySelector('.inline-edit-input')).toBeNull();
  });

  it('Save does nothing further when the confirmation is declined', async () => {
    const props = baseProps({ gridMode: 'row', onRequestConfirm: vi.fn(async () => false) });
    table.render(container, props);
    editBtn(dataRows()[0]).click();
    dataRows()[0].querySelector('.row-action-save').click();
    await flush();
    expect(props.onBatchRowSave).not.toHaveBeenCalled();
    // Still editing since the save was declined.
    expect(dataRows()[0].querySelector('.inline-edit-input')).not.toBeNull();
  });
});

describe('batch mode', () => {
  it('every row starts pre-filled and editable', () => {
    table.render(container, baseProps({ gridMode: 'batch' }));
    const rows = dataRows();
    expect(rows[0].querySelectorAll('.inline-edit-input')[0].value).toBe('Movie A');
    expect(rows[1].querySelectorAll('.inline-edit-input')[0].value).toBe('Movie B');
  });

  it('typing mutates the batch draft directly', () => {
    table.render(container, baseProps({ gridMode: 'batch' }));
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Changed';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('Changed');
  });

  it('Delete in batch mode calls onRowDelete', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    dataRows()[0].querySelector('.row-action-delete').click();
    expect(props.onRowDelete).toHaveBeenCalledWith(props.data[0]);
  });

  it('preserves in-progress drafts across a re-render for rows that persist by reference', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Still editing';
    input.dispatchEvent(new Event('input'));
    // Re-render with the exact same row objects/array (e.g. an unrelated prop changed).
    table.render(container, props);
    expect(dataRows()[0].querySelectorAll('.inline-edit-input')[0].value).toBe('Still editing');
  });

  it('gives a fresh draft to a row that has never been seen before', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    const newRow = { title: 'Movie C', poster: 'https://example.com/c.png' };
    table.render(container, baseProps({ gridMode: 'batch', data: [...props.data, newRow] }));
    expect(dataRows()[2].querySelectorAll('.inline-edit-input')[0].value).toBe('Movie C');
  });

  it('a newly-added column on an already-cached row draft falls back to an empty value', () => {
    const oneColumn = [columns[0]];
    const props = baseProps({ gridMode: 'batch', columns: oneColumn, data: [{ title: 'Movie A' }] });
    table.render(container, props);
    // Same row reference, but now with a second column the cached draft
    // (built from the old, single-column `columns`) never populated.
    table.render(container, baseProps({ gridMode: 'batch', columns, data: props.data }));
    const posterInput = dataRows()[0].querySelectorAll('.inline-edit-input')[1];
    expect(posterInput.value).toBe('');
  });

  it('typing is a no-op if the row it belongs to has since dropped out of the batch draft array', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    const staleInput = dataRows()[1].querySelectorAll('.inline-edit-input')[0];
    // Shrink data so batchDrafts no longer has an entry at this stale input's index.
    table.render(container, baseProps({ gridMode: 'batch', data: [props.data[0]] }));
    expect(() => {
      staleInput.value = 'orphaned edit';
      staleInput.dispatchEvent(new Event('input'));
    }).not.toThrow();
  });

  it('omits the delete action in batch mode when showActions is off', () => {
    table.render(container, baseProps({ gridMode: 'batch', showActions: false }));
    expect(dataRows()[0].querySelector('.actions-cell')).toBeNull();
  });

  it('addBatchRow appends a blank editable row with its own remove button', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    table.addBatchRow();
    const rows = dataRows();
    expect(rows.length).toBe(3);
    const newRowInputs = rows[2].querySelectorAll('.inline-edit-input');
    expect(newRowInputs[0].value).toBe('');
    newRowInputs[0].value = 'Brand new';
    newRowInputs[0].dispatchEvent(new Event('input'));
    expect(newRowInputs[0].value).toBe('Brand new');
  });

  it('batch-new rows show drag/index leading cells, omit row-style when tableBorder is off, and omit actions when showActions is off', () => {
    const props = baseProps({
      gridMode: 'batch',
      data: [],
      dragDropRows: true,
      showIndex: true,
      bodyColumnLines: false,
      tableBorder: false,
      showActions: false,
    });
    table.render(container, props);
    table.addBatchRow();
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')).not.toBeNull();
    expect(row.querySelector('.drag-cell').classList.contains('border-right')).toBe(false);
    expect(row.querySelector('.index-cell')).not.toBeNull();
    expect(row.querySelector('.index-cell').classList.contains('border-right')).toBe(false);
    expect(row.classList.contains('row-style')).toBe(false);
    expect(row.querySelector('.actions-cell')).toBeNull();
  });

  it('keeps a batch-new row\'s typed-in-progress value across a full external re-render', () => {
    const props = baseProps({ gridMode: 'batch', data: [] });
    table.render(container, props);
    table.addBatchRow();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'New draft in progress';
    input.dispatchEvent(new Event('input'));
    table.render(container, props);
    expect(dataRows()[0].querySelectorAll('.inline-edit-input')[0].value).toBe('New draft in progress');
  });

  it('a column added after addBatchRow falls back to an empty value for it on the new row', () => {
    table.render(container, baseProps({ gridMode: 'batch', data: [], columns: [columns[0]] }));
    table.addBatchRow();
    table.render(container, baseProps({ gridMode: 'batch', data: [], columns }));
    const posterInput = dataRows()[0].querySelectorAll('.inline-edit-input')[1];
    expect(posterInput.value).toBe('');
  });

  it('removing a batch-new row via its own delete button drops just that one', () => {
    const props = baseProps({ gridMode: 'batch', data: [] });
    table.render(container, props);
    table.addBatchRow();
    table.addBatchRow();
    dataRows()[0].querySelector('.row-action-delete').click();
    expect(dataRows().length).toBe(1);
  });

  it('saveBatch collects only dirty existing rows plus every new-batch row, then clears new rows', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Changed title';
    input.dispatchEvent(new Event('input'));
    table.addBatchRow();
    const newInput = dataRows()[2].querySelectorAll('.inline-edit-input')[0];
    newInput.value = 'Fresh row';
    newInput.dispatchEvent(new Event('input'));

    table.saveBatch();

    expect(props.onBatchCommit).toHaveBeenCalledWith({
      added: [{ title: 'Fresh row', poster: '' }],
      updated: [{ original: props.data[0], updated: { title: 'Changed title', poster: 'https://example.com/a.png' } }],
    });
    // New-batch rows are cleared after commit.
    table.render(container, props);
    expect(dataRows().length).toBe(2);
  });

  it('saveBatch treats a null-valued field, unedited, as not dirty', () => {
    const props = baseProps({ gridMode: 'batch', data: [{ title: null, poster: 'https://example.com/a.png' }] });
    table.render(container, props);
    table.saveBatch();
    expect(props.onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
  });

  it('saveBatch treats unmodified rows as not dirty', () => {
    const props = baseProps({ gridMode: 'batch' });
    table.render(container, props);
    table.saveBatch();
    expect(props.onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
  });

  it('saveBatch skips rows with no known draft (e.g. called outside batch mode)', () => {
    const props = baseProps({ gridMode: 'popup' });
    table.render(container, props);
    table.saveBatch();
    expect(props.onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
  });
});

describe('add row', () => {
  it('startAddingRow renders a blank add-row above the data with Save/Cancel', () => {
    const props = baseProps();
    table.render(container, props);
    table.startAddingRow();
    const rows = dataRows();
    expect(rows.length).toBe(3);
    const inputs = rows[0].querySelectorAll('.inline-edit-input');
    expect(inputs.length).toBe(2);
    expect(inputs[0].value).toBe('');
  });

  it('shows drag/index leading cells, and omits row-style when tableBorder is off', () => {
    const props = baseProps({ dragDropRows: true, showIndex: true, tableBorder: false, bodyColumnLines: false });
    table.render(container, props);
    table.startAddingRow();
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')).not.toBeNull();
    expect(row.querySelector('.drag-cell').classList.contains('border-right')).toBe(false);
    expect(row.querySelector('.index-cell')).not.toBeNull();
    expect(row.querySelector('.index-cell').classList.contains('border-right')).toBe(false);
    expect(row.classList.contains('row-style')).toBe(false);
  });

  it('keeps typed-in-progress values across a full external re-render', () => {
    const props = baseProps();
    table.render(container, props);
    table.startAddingRow();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'Draft in progress';
    input.dispatchEvent(new Event('input'));
    table.render(container, props);
    expect(dataRows()[0].querySelectorAll('.inline-edit-input')[0].value).toBe('Draft in progress');
  });

  it('a column added after startAddingRow falls back to an empty value for it', () => {
    table.render(container, baseProps({ columns: [columns[0]] }));
    table.startAddingRow();
    table.render(container, baseProps({ columns }));
    const posterInput = dataRows()[0].querySelectorAll('.inline-edit-input')[1];
    expect(posterInput.value).toBe('');
  });

  it('Cancel removes the add-row', () => {
    const props = baseProps();
    table.render(container, props);
    table.startAddingRow();
    dataRows()[0].querySelector('.row-action-button:not(.row-action-save)').click();
    expect(dataRows().length).toBe(2);
  });

  it('Save asks for confirmation, then commits the draft via onBatchRowAdd', async () => {
    const props = baseProps({ onRequestConfirm: vi.fn(async () => true) });
    table.render(container, props);
    table.startAddingRow();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    input.value = 'New movie';
    input.dispatchEvent(new Event('input'));
    dataRows()[0].querySelector('.row-action-save').click();
    await flush();
    expect(props.onRequestConfirm).toHaveBeenCalledWith('Confirm add', expect.any(String));
    expect(props.onBatchRowAdd).toHaveBeenCalledWith({ title: 'New movie', poster: '' });
    expect(dataRows().length).toBe(2);
  });

  it('Save does nothing further when declined', async () => {
    const props = baseProps({ onRequestConfirm: vi.fn(async () => false) });
    table.render(container, props);
    table.startAddingRow();
    dataRows()[0].querySelector('.row-action-save').click();
    await flush();
    expect(props.onBatchRowAdd).not.toHaveBeenCalled();
    expect(dataRows().length).toBe(3);
  });

  it('omits Save/Cancel actions when showActions is off', () => {
    const props = baseProps({ showActions: false });
    table.render(container, props);
    table.startAddingRow();
    expect(dataRows()[0].querySelector('.actions-cell')).toBeNull();
  });
});

describe('leading drag/index cells across all three row builders', () => {
  it('shows drag cells on the add row, data rows, and batch-new rows', () => {
    const props = baseProps({ gridMode: 'batch', dragDropRows: true, data: [] });
    table.render(container, props);
    table.addBatchRow();
    expect(dataRows()[0].querySelector('.drag-cell')).not.toBeNull();
  });

  it('shows index cells on the add row', () => {
    const props = baseProps({ showIndex: true });
    table.render(container, props);
    table.startAddingRow();
    expect(dataRows()[0].querySelector('.index-cell')).not.toBeNull();
  });
});

describe('drag-to-reorder rows', () => {
  it('sets dataTransfer.effectAllowed on dragstart when available, tolerates its absence', () => {
    table.render(container, baseProps({ dragDropRows: true }));
    const handle = dataRows()[0].querySelector('.drag-handle');
    const event = new Event('dragstart');
    event.dataTransfer = {};
    handle.dispatchEvent(event);
    expect(event.dataTransfer.effectAllowed).toBe('move');
    expect(() => handle.dispatchEvent(new Event('dragstart'))).not.toThrow();
  });

  it('highlights the hovered row on dragover, clears on dragleave (no-op if not the current target)', () => {
    table.render(container, baseProps({ dragDropRows: true }));
    const [rowA, rowB] = dataRows();
    rowA.dispatchEvent(new Event('dragover'));
    expect(rowA.classList.contains('row-drag-over')).toBe(true);
    rowA.dispatchEvent(new Event('dragover'));
    expect(() => rowB.dispatchEvent(new Event('dragleave'))).not.toThrow();
    rowA.dispatchEvent(new Event('dragleave'));
    expect(rowA.classList.contains('row-drag-over')).toBe(false);
  });

  it('keeps the highlight class through a full external re-render while a hover is still active', () => {
    const props = baseProps({ dragDropRows: true });
    table.render(container, props);
    dataRows()[0].dispatchEvent(new Event('dragover'));
    table.render(container, props);
    expect(dataRows()[0].classList.contains('row-drag-over')).toBe(true);
  });

  it('drop calls onRowMove with the dragged and target rows', () => {
    const props = baseProps({ dragDropRows: true });
    table.render(container, props);
    const handle = dataRows()[0].querySelector('.drag-handle');
    handle.dispatchEvent(new Event('dragstart'));
    dataRows()[1].dispatchEvent(new Event('drop'));
    expect(props.onRowMove).toHaveBeenCalledWith(props.data[0], props.data[1]);
  });

  it('marks the dragged row row-dragging through a full external re-render while the drag is still active', () => {
    const props = baseProps({ dragDropRows: true });
    table.render(container, props);
    const handle = dataRows()[0].querySelector('.drag-handle');
    handle.dispatchEvent(new Event('dragstart'));
    table.render(container, props);
    expect(dataRows()[0].classList.contains('row-dragging')).toBe(true);
  });

  it('drop with no active draggedRow does not call onRowMove', () => {
    const props = baseProps({ dragDropRows: true });
    table.render(container, props);
    dataRows()[1].dispatchEvent(new Event('drop'));
    expect(props.onRowMove).not.toHaveBeenCalled();
  });

  it('dragend clears drag state and re-renders', () => {
    const props = baseProps({ dragDropRows: true });
    table.render(container, props);
    const handle = dataRows()[0].querySelector('.drag-handle');
    handle.dispatchEvent(new Event('dragstart'));
    handle.dispatchEvent(new Event('dragend'));
    expect(dataRows()[0].classList.contains('row-dragging')).toBe(false);
    dataRows()[1].dispatchEvent(new Event('drop'));
    expect(props.onRowMove).not.toHaveBeenCalled();
  });
});
