import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTable } from '../../src/rsDataGrid/rsDataGridTable/rsDataGridTable.js';

const columns = [
  { caption: 'name', dataField: 'name' },
  { caption: 'age', dataField: 'age' },
];

function baseProps(overrides = {}) {
  return {
    columns,
    data: [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ],
    bodyRowLines: true,
    bodyColumnLines: true,
    tableBorder: true,
    borderRadiusBottom: false,
    diagonalRow: false,
    showActions: true,
    showIndex: false,
    indexOffset: 0,
    gridMode: 'popup',
    onRowEdit: vi.fn(),
    onRowDelete: vi.fn(),
    onBatchRowSave: vi.fn(),
    onBatchRowAdd: vi.fn(),
    onBatchCommit: vi.fn(),
    onRequestConfirm: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('rsDataGridTable', () => {
  let container;
  let table;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    table = createTable();
  });

  describe('view mode (popup, not editing)', () => {
    it('renders one row per data item with plain text cells', () => {
      table.render(container, baseProps());
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows.length).toBe(2);
      const firstRowCells = rows[0].querySelectorAll('.section-style');
      expect(firstRowCells[0].textContent).toBe('Alice');
      expect(firstRowCells[1].textContent).toBe('30');
    });

    it('renders null/undefined cell values as empty strings', () => {
      table.render(container, baseProps({ data: [{ name: null, age: undefined }] }));
      const cells = container.querySelectorAll('.section-style');
      expect(cells[0].textContent).toBe('');
      expect(cells[1].textContent).toBe('');
    });

    it('renders an index cell with 1-based index + indexOffset when showIndex is true', () => {
      table.render(container, baseProps({ showIndex: true, indexOffset: 20 }));
      const indexCells = container.querySelectorAll('.index-cell');
      expect(indexCells[0].textContent).toBe('21');
      expect(indexCells[1].textContent).toBe('22');
    });

    it('omits the index cell when showIndex is false', () => {
      table.render(container, baseProps({ showIndex: false }));
      expect(container.querySelector('.index-cell')).toBeNull();
    });

    it('renders Edit/Delete action buttons when showActions is true, omits them otherwise', () => {
      table.render(container, baseProps({ showActions: true }));
      expect(container.querySelectorAll('.actions-cell').length).toBe(2);
      table.render(container, baseProps({ showActions: false }));
      expect(container.querySelectorAll('.actions-cell').length).toBe(0);
    });

    it('clicking Delete invokes onRowDelete with the row by reference, with no confirmation gating inside the table itself', () => {
      const row = { name: 'Alice', age: 30 };
      const onRowDelete = vi.fn();
      table.render(container, baseProps({ data: [row], onRowDelete }));
      const deleteBtn = container.querySelectorAll('.row-action-button')[1];
      deleteBtn.click();
      expect(onRowDelete).toHaveBeenCalledWith(row);
    });

    it('clicking Edit in popup mode calls props.onRowEdit(row) directly (no local edit state)', () => {
      const row = { name: 'Alice', age: 30 };
      const onRowEdit = vi.fn();
      table.render(container, baseProps({ gridMode: 'popup', data: [row], onRowEdit }));
      const editBtn = container.querySelectorAll('.row-action-button')[0];
      editBtn.click();
      expect(onRowEdit).toHaveBeenCalledWith(row);
      // popup mode never enters row-edit state, so no inline inputs should appear
      expect(container.querySelector('.inline-edit-input')).toBeNull();
    });

    it('Edit click stops propagation', () => {
      const docClick = vi.fn();
      document.addEventListener('click', docClick);
      table.render(container, baseProps());
      container.querySelectorAll('.row-action-button')[0].click();
      expect(docClick).not.toHaveBeenCalled();
      document.removeEventListener('click', docClick);
    });

    it('applies row-background on odd rows when diagonalRow is true, not otherwise', () => {
      table.render(container, baseProps({ diagonalRow: true, data: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }));
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows[0].className).not.toContain('row-background');
      expect(rows[1].className).toContain('row-background');
      expect(rows[2].className).not.toContain('row-background');
    });

    it('does not apply row-background when diagonalRow is false, even on odd rows', () => {
      table.render(container, baseProps({ diagonalRow: false, data: [{ name: 'A' }, { name: 'B' }] }));
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows[1].className).not.toContain('row-background');
    });

    it('applies border-area-small to the last row when borderRadiusBottom is true', () => {
      table.render(container, baseProps({ borderRadiusBottom: true, data: [{ name: 'A' }, { name: 'B' }] }));
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows[0].className).not.toContain('border-area-small');
      expect(rows[1].className).toContain('border-area-small');
    });

    it('does not apply border-area-small on the last row when borderRadiusBottom is false', () => {
      table.render(container, baseProps({ borderRadiusBottom: false, data: [{ name: 'A' }] }));
      expect(container.querySelector('.column-layout > .full-row').className).not.toContain('border-area-small');
    });

    it('applies row-style when tableBorder is true, and row-style-bottom on the last row', () => {
      table.render(container, baseProps({ tableBorder: true, bodyRowLines: false, data: [{ name: 'A' }, { name: 'B' }] }));
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows[0].classList.contains('row-style')).toBe(true);
      expect(rows[0].classList.contains('row-style-bottom')).toBe(false); // not last, bodyRowLines false
      expect(rows[1].classList.contains('row-style-bottom')).toBe(true); // last row + tableBorder
    });

    it('applies row-style-bottom on every non-last row when bodyRowLines is true, regardless of tableBorder', () => {
      table.render(container, baseProps({ tableBorder: false, bodyRowLines: true, data: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }));
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows[0].classList.contains('row-style')).toBe(false);
      expect(rows[0].classList.contains('row-style-bottom')).toBe(true);
      expect(rows[1].classList.contains('row-style-bottom')).toBe(true);
      // last row: tableBorder false and bodyRowLines with i !== length-1 is false -> no row-style-bottom
      expect(rows[2].classList.contains('row-style-bottom')).toBe(false);
    });

    it('applies border-right to non-last body columns (and to the last when showActions), respecting bodyColumnLines', () => {
      table.render(container, baseProps({ bodyColumnLines: true, showActions: false, data: [{ name: 'A', age: 1 }] }));
      const cells = container.querySelectorAll('.section-style');
      expect(cells[0].className).toContain('border-right');
      expect(cells[1].className).not.toContain('border-right');
    });

    it('adds border-right to the last body column when showActions is true', () => {
      table.render(container, baseProps({ bodyColumnLines: true, showActions: true, data: [{ name: 'A', age: 1 }] }));
      const cells = container.querySelectorAll('.section-style');
      expect(cells[1].className).toContain('border-right');
    });

    it('omits border-right entirely when bodyColumnLines is false', () => {
      table.render(container, baseProps({ bodyColumnLines: false, showActions: true, data: [{ name: 'A', age: 1 }] }));
      container.querySelectorAll('.section-style').forEach(cell => expect(cell.className).not.toContain('border-right'));
    });

    it('applies border-right to the index cell when bodyColumnLines is true', () => {
      table.render(container, baseProps({ showIndex: true, bodyColumnLines: true }));
      expect(container.querySelector('.index-cell').className).toContain('border-right');
    });
  });

  describe('row mode (gridMode: "row") inline edit', () => {
    it('clicking Edit enters local edit state and renders inputs prefilled from the row', () => {
      const row = { name: 'Alice', age: 30 };
      table.render(container, baseProps({ gridMode: 'row', data: [row] }));
      container.querySelectorAll('.row-action-button')[0].click();
      const inputs = container.querySelectorAll('.inline-edit-input');
      expect(inputs.length).toBe(2);
      expect(inputs[0].value).toBe('Alice');
      expect(inputs[1].value).toBe('30');
    });

    it('typing into an edit input mutates the draft without forcing a re-render (retains focus/DOM node)', () => {
      const row = { name: 'Alice', age: 30 };
      table.render(container, baseProps({ gridMode: 'row', data: [row] }));
      container.querySelectorAll('.row-action-button')[0].click();
      const nameInput = container.querySelectorAll('.inline-edit-input')[0];
      nameInput.value = 'Alicia';
      nameInput.dispatchEvent(new Event('input'));
      // same DOM node should still be present with the mutated value (no clear()/rebuild happened)
      expect(container.querySelectorAll('.inline-edit-input')[0]).toBe(nameInput);
      expect(nameInput.value).toBe('Alicia');
    });

    it('Save prompts onRequestConfirm, and on confirm calls onBatchRowSave with {original, updated} and exits edit mode', async () => {
      const row = { name: 'Alice', age: 30 };
      const onBatchRowSave = vi.fn();
      const onRequestConfirm = vi.fn().mockResolvedValue(true);
      table.render(container, baseProps({ gridMode: 'row', data: [row], onBatchRowSave, onRequestConfirm }));
      container.querySelectorAll('.row-action-button')[0].click(); // Edit
      const nameInput = container.querySelector('.inline-edit-input');
      nameInput.value = 'Alicia';
      nameInput.dispatchEvent(new Event('input'));
      container.querySelector('.row-action-save').click(); // Save
      await flush();
      expect(onRequestConfirm).toHaveBeenCalledWith('Confirm save', 'Are you sure you want to save the changes to this row?');
      // editDraft holds every column as a string (from toDraft), so even the
      // untouched "age" field round-trips as the string '30', not the number 30.
      expect(onBatchRowSave).toHaveBeenCalledWith({ original: row, updated: { name: 'Alicia', age: '30' } });
      expect(container.querySelector('.inline-edit-input')).toBeNull(); // back to view mode
    });

    it('Save does nothing further when onRequestConfirm resolves false, staying in edit mode', async () => {
      const row = { name: 'Alice', age: 30 };
      const onBatchRowSave = vi.fn();
      const onRequestConfirm = vi.fn().mockResolvedValue(false);
      table.render(container, baseProps({ gridMode: 'row', data: [row], onBatchRowSave, onRequestConfirm }));
      container.querySelectorAll('.row-action-button')[0].click();
      container.querySelector('.row-action-save').click();
      await flush();
      expect(onBatchRowSave).not.toHaveBeenCalled();
      expect(container.querySelector('.inline-edit-input')).not.toBeNull(); // still editing
    });

    it('Cancel exits edit mode without saving', () => {
      const row = { name: 'Alice', age: 30 };
      const onBatchRowSave = vi.fn();
      table.render(container, baseProps({ gridMode: 'row', data: [row], onBatchRowSave }));
      container.querySelectorAll('.row-action-button')[0].click();
      const cancelBtn = container.querySelectorAll('.row-action-button')[1];
      cancelBtn.click();
      expect(onBatchRowSave).not.toHaveBeenCalled();
      expect(container.querySelector('.inline-edit-input')).toBeNull();
    });
  });

  describe('add row (popup/row modes via startAddingRow)', () => {
    it('startAddingRow renders an empty input per column at the top and clears on cancel', () => {
      table.render(container, baseProps());
      table.startAddingRow();
      const inputs = container.querySelectorAll('.inline-edit-input');
      expect(inputs.length).toBe(2 + 0); // add-row inputs only (data rows are view-mode text, not inputs)
      expect(inputs[0].value).toBe('');
      const cancelBtn = container.querySelectorAll('.row-action-button')[1];
      cancelBtn.click();
      expect(container.querySelector('.inline-edit-input')).toBeNull();
    });

    it('typing into the add-row input mutates the draft', () => {
      table.render(container, baseProps());
      table.startAddingRow();
      const nameInput = container.querySelectorAll('.inline-edit-input')[0];
      nameInput.value = 'Zed';
      nameInput.dispatchEvent(new Event('input'));
      expect(nameInput.value).toBe('Zed');
    });

    it('Save prompts confirm and, when confirmed, calls onBatchRowAdd with the draft and exits add mode', async () => {
      const onBatchRowAdd = vi.fn();
      const onRequestConfirm = vi.fn().mockResolvedValue(true);
      table.render(container, baseProps({ onBatchRowAdd, onRequestConfirm }));
      table.startAddingRow();
      const [nameInput, ageInput] = container.querySelectorAll('.inline-edit-input');
      nameInput.value = 'Zed';
      nameInput.dispatchEvent(new Event('input'));
      ageInput.value = '50';
      ageInput.dispatchEvent(new Event('input'));
      container.querySelector('.row-action-save').click();
      await flush();
      expect(onRequestConfirm).toHaveBeenCalledWith('Confirm add', 'Are you sure you want to add this row?');
      expect(onBatchRowAdd).toHaveBeenCalledWith({ name: 'Zed', age: '50' });
      expect(container.querySelector('.row-action-save')).toBeNull(); // add row gone
    });

    it('Save does nothing when not confirmed, staying in add mode', async () => {
      const onBatchRowAdd = vi.fn();
      const onRequestConfirm = vi.fn().mockResolvedValue(false);
      table.render(container, baseProps({ onBatchRowAdd, onRequestConfirm }));
      table.startAddingRow();
      container.querySelector('.row-action-save').click();
      await flush();
      expect(onBatchRowAdd).not.toHaveBeenCalled();
      expect(container.querySelector('.row-action-save')).not.toBeNull();
    });
  });

  describe('batch mode', () => {
    function batchProps(overrides = {}) {
      return baseProps({ gridMode: 'batch', ...overrides });
    }

    it('renders an inline-editable input per column per row, prefilled from the row', () => {
      table.render(container, batchProps());
      const rows = container.querySelectorAll('.column-layout > .full-row');
      const firstRowInputs = rows[0].querySelectorAll('.inline-edit-input');
      expect(firstRowInputs[0].value).toBe('Alice');
      expect(firstRowInputs[1].value).toBe('30');
    });

    it('typing updates the batch draft for that row/column without a re-render', () => {
      table.render(container, batchProps());
      const input = container.querySelectorAll('.inline-edit-input')[0];
      input.value = 'Alicia';
      input.dispatchEvent(new Event('input'));
      expect(container.querySelectorAll('.inline-edit-input')[0]).toBe(input);
      expect(input.value).toBe('Alicia');
    });

    it('preserves in-progress edits across a re-render when the same row references persist (syncBatchDrafts by reference)', () => {
      const rowA = { name: 'Alice', age: 30 };
      const rowB = { name: 'Bob', age: 25 };
      table.render(container, batchProps({ data: [rowA, rowB] }));
      const firstInput = container.querySelectorAll('.inline-edit-input')[0];
      firstInput.value = 'Alicia-draft';
      firstInput.dispatchEvent(new Event('input'));
      // re-render with the same row references (e.g. after an unrelated store notify)
      table.render(container, batchProps({ data: [rowA, rowB] }));
      const afterRerender = container.querySelectorAll('.inline-edit-input')[0];
      expect(afterRerender.value).toBe('Alicia-draft');
    });

    it('resets the draft for a row when the row reference is no longer present, replaced by a fresh row (new reference)', () => {
      const rowA = { name: 'Alice', age: 30 };
      table.render(container, batchProps({ data: [rowA] }));
      const input = container.querySelectorAll('.inline-edit-input')[0];
      input.value = 'Alicia-draft';
      input.dispatchEvent(new Event('input'));
      const rowC = { name: 'Carl', age: 40 }; // new reference entirely
      table.render(container, batchProps({ data: [rowC] }));
      const freshInput = container.querySelectorAll('.inline-edit-input')[0];
      expect(freshInput.value).toBe('Carl');
    });

    it('Delete button calls onRowDelete(item) directly with no confirmation inside the table', () => {
      const row = { name: 'Alice', age: 30 };
      const onRowDelete = vi.fn();
      table.render(container, batchProps({ data: [row], onRowDelete }));
      container.querySelector('.row-action-button').click();
      expect(onRowDelete).toHaveBeenCalledWith(row);
    });

    it('addBatchRow appends an empty draft row at the bottom, editable, with a Remove button', () => {
      table.render(container, batchProps());
      table.addBatchRow();
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows.length).toBe(3); // 2 data rows + 1 new
      const newRowInputs = rows[2].querySelectorAll('.inline-edit-input');
      expect(newRowInputs[0].value).toBe('');
      expect(newRowInputs[1].value).toBe('');
    });

    it('typing into a new batch row input mutates its own draft object', () => {
      table.render(container, batchProps());
      table.addBatchRow();
      const rows = container.querySelectorAll('.column-layout > .full-row');
      const input = rows[2].querySelectorAll('.inline-edit-input')[0];
      input.value = 'New Person';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('New Person');
    });

    it('clicking Remove on a new batch row removes it and re-renders', () => {
      table.render(container, batchProps());
      table.addBatchRow();
      table.addBatchRow();
      let rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows.length).toBe(4); // 2 data + 2 new
      const removeBtn = rows[2].querySelector('.row-action-button');
      removeBtn.click();
      rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows.length).toBe(3); // 2 data + 1 remaining new
    });

    it('addBatchRow renders index cells (blank) and honors showIndex/showActions/bodyColumnLines like other batch rows', () => {
      table.render(container, batchProps({ showIndex: true }));
      table.addBatchRow();
      const rows = container.querySelectorAll('.column-layout > .full-row');
      const newRowIndexCell = rows[2].querySelector('.index-cell');
      expect(newRowIndexCell).not.toBeNull();
      expect(newRowIndexCell.textContent).toBe('');
    });

    it('omits the Remove button on a new batch row when showActions is false', () => {
      table.render(container, batchProps({ showActions: false }));
      table.addBatchRow();
      const rows = container.querySelectorAll('.column-layout > .full-row');
      expect(rows[2].querySelector('.row-action-button')).toBeNull();
    });

    it('saveBatch collects only dirty rows as updated, all new drafts as added, resets new drafts, and calls onBatchCommit', () => {
      const rowA = { name: 'Alice', age: 30 };
      const rowB = { name: 'Bob', age: 25 };
      const onBatchCommit = vi.fn();
      table.render(container, batchProps({ data: [rowA, rowB], onBatchCommit }));
      const inputs = container.querySelectorAll('.inline-edit-input');
      inputs[0].value = 'Alicia'; // dirty rowA.name
      inputs[0].dispatchEvent(new Event('input'));
      table.addBatchRow();
      const newRowInputs = container.querySelectorAll('.column-layout > .full-row')[2].querySelectorAll('.inline-edit-input');
      newRowInputs[0].value = 'Zed';
      newRowInputs[0].dispatchEvent(new Event('input'));

      table.saveBatch();

      expect(onBatchCommit).toHaveBeenCalledWith({
        added: [{ name: 'Zed', age: '' }],
        // batchDrafts hold every column as a string, so untouched "age" round-trips as '30'.
        updated: [{ original: rowA, updated: { name: 'Alicia', age: '30' } }],
      });
    });

    it('saveBatch clears the new-row drafts afterward (next render shows no leftover new rows)', () => {
      const onBatchCommit = vi.fn();
      table.render(container, batchProps({ onBatchCommit }));
      table.addBatchRow();
      table.saveBatch();
      table.render(container, batchProps({ onBatchCommit }));
      expect(container.querySelectorAll('.column-layout > .full-row').length).toBe(2); // just the 2 original data rows
    });

    it('saveBatch produces no updated entries when nothing changed', () => {
      const rowA = { name: 'Alice', age: 30 };
      const onBatchCommit = vi.fn();
      table.render(container, batchProps({ data: [rowA], onBatchCommit }));
      table.saveBatch();
      expect(onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
    });

    it('applies border-right to batch-mode inputs cells the same way as view-mode cells', () => {
      table.render(container, batchProps({ bodyColumnLines: true, showActions: false }));
      const firstRowCells = container.querySelectorAll('.column-layout > .full-row')[0].querySelectorAll('.section-style');
      expect(firstRowCells[0].className).toContain('border-right');
      expect(firstRowCells[1].className).not.toContain('border-right');
    });
  });
});
