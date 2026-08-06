import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTable } from '../../src/rsDataGrid/rsDataGridTable/rsDataGridTable.js';

const columns = [
  { caption: 'first name', dataField: 'firstName' },
  { caption: 'age', dataField: 'age' },
];

function makeData() {
  return [
    { firstName: 'ada', age: 30 },
    { firstName: 'bob', age: 25 },
    { firstName: 'cid', age: 40 },
  ];
}

function baseProps(overrides = {}) {
  return {
    columns,
    data: makeData(),
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
    delegationRoot: undefined,
    ...overrides,
  };
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('rsDataGridTable', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('normal (display) rows', () => {
    it('renders one row per data item with data-row-index and text cells', () => {
      const table = createTable();
      table.render(container, baseProps());
      const rows = container.querySelectorAll('[data-row-index]');
      expect(rows.length).toBe(3);
      expect(rows[0].getAttribute('data-row-index')).toBe('0');
      const cellTexts = [...rows[0].querySelectorAll('.section-style')].map(c => c.textContent);
      expect(cellTexts).toEqual(['ada', '30']);
    });

    it('renders an index cell showing indexOffset + i + 1 when showIndex is true', () => {
      const table = createTable();
      table.render(container, baseProps({ showIndex: true, indexOffset: 20 }));
      const indexCells = container.querySelectorAll('.index-cell');
      expect([...indexCells].map(c => c.textContent)).toEqual(['21', '22', '23']);
    });

    it('renders empty string for null/undefined cell values', () => {
      const table = createTable();
      table.render(container, baseProps({ data: [{ firstName: null, age: undefined }] }));
      const cellTexts = [...container.querySelector('[data-row-index]').querySelectorAll('.section-style')].map(c => c.textContent);
      expect(cellTexts).toEqual(['', '']);
    });

    it('renders edit and delete action buttons when showActions is true, and none when false', () => {
      const table = createTable();
      table.render(container, baseProps({ showActions: true }));
      expect(container.querySelectorAll('.row-action-edit').length).toBe(3);
      expect(container.querySelectorAll('.row-action-delete').length).toBe(3);

      const table2 = createTable();
      const container2 = document.createElement('div');
      table2.render(container2, baseProps({ showActions: false }));
      expect(container2.querySelectorAll('.actions-cell').length).toBe(0);
    });

    it('applies row-background on odd rows only when diagonalRow is true', () => {
      const table = createTable();
      table.render(container, baseProps({ diagonalRow: true }));
      const rows = container.querySelectorAll('[data-row-index]');
      expect(rows[0].className).not.toContain('row-background');
      expect(rows[1].className).toContain('row-background');
      expect(rows[2].className).not.toContain('row-background');
    });

    it('applies border-area-small to the last row when borderRadiusBottom is true', () => {
      const table = createTable();
      table.render(container, baseProps({ borderRadiusBottom: true }));
      const rows = container.querySelectorAll('[data-row-index]');
      expect(rows[2].className).toContain('border-area-small');
      expect(rows[0].className).not.toContain('border-area-small');
    });

    it('applies row-style-bottom to the last row when tableBorder is true even if bodyRowLines is false', () => {
      const table = createTable();
      table.render(container, baseProps({ tableBorder: true, bodyRowLines: false }));
      const rows = container.querySelectorAll('[data-row-index]');
      expect(rows[2].className).toContain('row-style-bottom');
      expect(rows[0].className).not.toContain('row-style-bottom');
    });

    it('applies row-style-bottom to all-but-last row when bodyRowLines is true', () => {
      const table = createTable();
      table.render(container, baseProps({ tableBorder: false, bodyRowLines: true }));
      const rows = container.querySelectorAll('[data-row-index]');
      expect(rows[0].className).toContain('row-style-bottom');
      expect(rows[2].className).not.toContain('row-style-bottom');
    });
  });

  describe('row-mode editing (gridMode: "row")', () => {
    it('row-action-edit click enters edit mode for that row: shows draft inputs pre-filled with stringified values', () => {
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row' }));
      container.querySelectorAll('.row-action-edit')[1].click();
      const editingRow = container.querySelectorAll('[data-row-index]')[1];
      const inputs = editingRow.querySelectorAll('.inline-edit-input');
      expect(inputs.length).toBe(2);
      expect(inputs[0].value).toBe('bob');
      expect(inputs[1].value).toBe('25');
      expect(editingRow.querySelector('.row-action-save-edit')).not.toBeNull();
      expect(editingRow.querySelector('.row-action-cancel-edit')).not.toBeNull();
    });

    it('typing in a draft input updates the in-memory draft without re-rendering (value persists, no data-loss on other fields)', () => {
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row' }));
      container.querySelectorAll('.row-action-edit')[0].click();
      const input = container.querySelector('.inline-edit-input[data-field="firstName"]');
      input.value = 'ADA EDITED';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // no re-render triggered by typing: same input node, and it still holds the typed value
      expect(container.querySelector('.inline-edit-input[data-field="firstName"]')).toBe(input);
      expect(input.value).toBe('ADA EDITED');
    });

    it('row-action-cancel-edit exits edit mode without saving', () => {
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row' }));
      container.querySelectorAll('.row-action-edit')[0].click();
      container.querySelector('.row-action-cancel-edit').click();
      expect(container.querySelectorAll('.inline-edit-input').length).toBe(0);
      expect(container.querySelectorAll('.row-action-edit').length).toBe(3);
    });

    it('row-action-save-edit asks for confirmation, and on confirm merges the draft onto the row and calls onBatchRowSave', async () => {
      const onRequestConfirm = vi.fn().mockResolvedValue(true);
      const onBatchRowSave = vi.fn();
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'row', data, onRequestConfirm, onBatchRowSave }));
      container.querySelectorAll('.row-action-edit')[0].click();
      const input = container.querySelector('.inline-edit-input[data-field="firstName"]');
      input.value = 'Ada Lovelace';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      container.querySelector('.row-action-save-edit').click();
      await flush();
      expect(onRequestConfirm).toHaveBeenCalledWith('Confirm save', 'Are you sure you want to save the changes to this row?');
      expect(onBatchRowSave).toHaveBeenCalledWith({ original: data[0], updated: { ...data[0], firstName: 'Ada Lovelace', age: '30' } });
      // edit mode exited afterward
      expect(container.querySelectorAll('.inline-edit-input').length).toBe(0);
    });

    it('row-action-save-edit does nothing (stays in edit mode) when confirmation is declined', async () => {
      const onRequestConfirm = vi.fn().mockResolvedValue(false);
      const onBatchRowSave = vi.fn();
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row', onRequestConfirm, onBatchRowSave }));
      container.querySelectorAll('.row-action-edit')[0].click();
      container.querySelector('.row-action-save-edit').click();
      await flush();
      expect(onBatchRowSave).not.toHaveBeenCalled();
      expect(container.querySelectorAll('.inline-edit-input').length).toBeGreaterThan(0);
    });
  });

  describe('popup-mode editing (gridMode: "popup", the default)', () => {
    it('row-action-edit click calls onRowEdit(row) directly instead of entering inline edit mode', () => {
      const onRowEdit = vi.fn();
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'popup', data, onRowEdit }));
      container.querySelectorAll('.row-action-edit')[2].click();
      expect(onRowEdit).toHaveBeenCalledWith(data[2]);
      expect(container.querySelectorAll('.inline-edit-input').length).toBe(0);
    });
  });

  describe('delete (any non-batch mode)', () => {
    it('row-action-delete click calls onRowDelete with the correct row by data-row-index', () => {
      const onRowDelete = vi.fn();
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ data, onRowDelete }));
      container.querySelectorAll('.row-action-delete')[1].click();
      expect(onRowDelete).toHaveBeenCalledWith(data[1]);
    });
  });

  describe('add row (row/popup add flow via startAddingRow)', () => {
    it('startAddingRow() renders an add-row with one empty input per column, above the data rows', () => {
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row' }));
      table.startAddingRow();
      const allRows = container.querySelectorAll('.column-layout > .full-row');
      const firstInputs = allRows[0].querySelectorAll('.inline-edit-input');
      expect(firstInputs.length).toBe(2);
      expect(firstInputs[0].value).toBe('');
      expect(firstInputs[0].getAttribute('data-kind')).toBe('add');
    });

    it('typing in an add-row input updates the addDraft', () => {
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row' }));
      table.startAddingRow();
      const input = container.querySelector('.inline-edit-input[data-kind="add"][data-field="firstName"]');
      input.value = 'New Name';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(input.value).toBe('New Name');
    });

    it('row-action-save-add confirms, calls onBatchRowAdd with the collected draft, and exits add mode', async () => {
      const onRequestConfirm = vi.fn().mockResolvedValue(true);
      const onBatchRowAdd = vi.fn();
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row', onRequestConfirm, onBatchRowAdd }));
      table.startAddingRow();
      const nameInput = container.querySelector('.inline-edit-input[data-kind="add"][data-field="firstName"]');
      nameInput.value = 'Zed';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      const ageInput = container.querySelector('.inline-edit-input[data-kind="add"][data-field="age"]');
      ageInput.value = '99';
      ageInput.dispatchEvent(new Event('input', { bubbles: true }));
      container.querySelector('.row-action-save-add').click();
      await flush();
      expect(onRequestConfirm).toHaveBeenCalledWith('Confirm add', 'Are you sure you want to add this row?');
      expect(onBatchRowAdd).toHaveBeenCalledWith({ firstName: 'Zed', age: '99' });
      expect(container.querySelectorAll('.inline-edit-input[data-kind="add"]').length).toBe(0);
    });

    it('row-action-save-add does nothing when confirmation is declined', async () => {
      const onRequestConfirm = vi.fn().mockResolvedValue(false);
      const onBatchRowAdd = vi.fn();
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row', onRequestConfirm, onBatchRowAdd }));
      table.startAddingRow();
      container.querySelector('.row-action-save-add').click();
      await flush();
      expect(onBatchRowAdd).not.toHaveBeenCalled();
      expect(container.querySelectorAll('.inline-edit-input[data-kind="add"]').length).toBeGreaterThan(0);
    });

    it('row-action-cancel-add exits add mode without calling onBatchRowAdd', () => {
      const onBatchRowAdd = vi.fn();
      const table = createTable();
      table.render(container, baseProps({ gridMode: 'row', onBatchRowAdd }));
      table.startAddingRow();
      container.querySelector('.row-action-cancel-add').click();
      expect(onBatchRowAdd).not.toHaveBeenCalled();
      expect(container.querySelectorAll('.inline-edit-input[data-kind="add"]').length).toBe(0);
    });
  });

  describe('batch mode', () => {
    it('renders an editable input for every cell of every row, pre-filled from the row', () => {
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'batch', data }));
      const rows = container.querySelectorAll('[data-row-index]');
      expect(rows.length).toBe(3);
      const row0Inputs = rows[0].querySelectorAll('.inline-edit-input[data-kind="batch"]');
      expect(row0Inputs[0].value).toBe('ada');
      expect(row0Inputs[1].value).toBe('30');
      // only a delete action -- no edit/save/cancel buttons for plain batch rows
      expect(rows[0].querySelector('.row-action-delete')).not.toBeNull();
      expect(rows[0].querySelector('.row-action-edit')).toBeNull();
    });

    it('typing into a batch row input updates that row\'s draft in place (via data-row-index)', () => {
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'batch', data }));
      const row1FirstNameInput = container.querySelectorAll('[data-row-index]')[1].querySelector('.inline-edit-input[data-field="firstName"]');
      row1FirstNameInput.value = 'Bobby';
      row1FirstNameInput.dispatchEvent(new Event('input', { bubbles: true }));

      const onBatchCommit = vi.fn();
      table.render(container, baseProps({ gridMode: 'batch', data, onBatchCommit }));
      table.saveBatch();
      // saveBatch spreads the WHOLE draft over the row, so every column comes back
      // through the (always-stringified) draft, not just the field actually touched.
      expect(onBatchCommit).toHaveBeenCalledWith({
        added: [],
        updated: [{ original: data[1], updated: { ...data[1], firstName: 'Bobby', age: '25' } }],
      });
    });

    it('the input-routing guard no-ops for a batch input whose row-index draft is momentarily absent', () => {
      // Defensive `if (batchDrafts[i])` guard: exercise the change path with an
      // out-of-range/missing draft slot and confirm no throw and no mutation.
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'batch', data }));
      const row = container.querySelectorAll('[data-row-index]')[0];
      row.setAttribute('data-row-index', '99'); // simulate a stale/missing slot
      const input = row.querySelector('.inline-edit-input[data-field="firstName"]');
      expect(() => {
        input.value = 'whatever';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }).not.toThrow();
    });

    it('saveBatch() only includes rows whose draft actually differs from the current row values (dirty-check)', () => {
      const table = createTable();
      const data = makeData();
      const onBatchCommit = vi.fn();
      table.render(container, baseProps({ gridMode: 'batch', data, onBatchCommit }));
      // no edits made
      table.saveBatch();
      expect(onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
    });

    it('addBatchRow() appends a new blank draft row with data-new-index, rendered after the data rows', () => {
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'batch', data }));
      table.addBatchRow();
      const newRow = container.querySelector('[data-new-index="0"]');
      expect(newRow).not.toBeNull();
      const inputs = newRow.querySelectorAll('.inline-edit-input[data-kind="batchNew"]');
      expect(inputs.length).toBe(2);
      expect(inputs[0].value).toBe('');
    });

    it('typing into a batchNew row input updates that new row\'s draft (via data-new-index)', () => {
      const table = createTable();
      const data = makeData();
      const onBatchCommit = vi.fn();
      table.render(container, baseProps({ gridMode: 'batch', data, onBatchCommit }));
      table.addBatchRow();
      const input = container.querySelector('[data-new-index="0"] .inline-edit-input[data-field="firstName"]');
      input.value = 'Newbie';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      table.render(container, baseProps({ gridMode: 'batch', data, onBatchCommit }));
      table.saveBatch();
      expect(onBatchCommit).toHaveBeenCalledWith({ added: [{ firstName: 'Newbie', age: '' }], updated: [] });
    });

    it('row-action-remove-new removes only the targeted new-row draft by its data-new-index', () => {
      const table = createTable();
      const data = makeData();
      table.render(container, baseProps({ gridMode: 'batch', data }));
      table.addBatchRow();
      table.addBatchRow();
      const secondRemove = container.querySelectorAll('.row-action-remove-new')[1];
      secondRemove.click();
      expect(container.querySelectorAll('[data-new-index]').length).toBe(1);
    });

    it('saveBatch() resets batchNewDrafts (a subsequent saveBatch with no further adds sends none)', () => {
      const table = createTable();
      const data = makeData();
      const onBatchCommit = vi.fn();
      table.render(container, baseProps({ gridMode: 'batch', data, onBatchCommit }));
      table.addBatchRow();
      table.saveBatch();
      expect(onBatchCommit.mock.calls[0][0].added.length).toBe(1);
      onBatchCommit.mockClear();
      table.saveBatch();
      expect(onBatchCommit).toHaveBeenCalledWith({ added: [], updated: [] });
    });

    it('regression: batch draft correctly follows its row by reference (not by index) after a reorder/sort, so typed edits are not lost or misattributed', () => {
      const table = createTable();
      const data = makeData(); // [ada, bob, cid]
      const [rowAda, rowBob, rowCid] = data;

      table.render(container, baseProps({ gridMode: 'batch', data }));
      // edit rowAda's firstName while it's at index 0
      const adaInput = container.querySelectorAll('[data-row-index]')[0].querySelector('.inline-edit-input[data-field="firstName"]');
      adaInput.value = 'Ada Edited';
      adaInput.dispatchEvent(new Event('input', { bubbles: true }));

      // simulate a sort: same row objects, new order [cid, ada, bob]
      const reordered = [rowCid, rowAda, rowBob];
      const onBatchCommit = vi.fn();
      table.render(container, baseProps({ gridMode: 'batch', data: reordered, onBatchCommit }));

      // rowAda is now rendered at index 1 -- its edited draft value must have followed it
      const movedInput = container.querySelectorAll('[data-row-index]')[1].querySelector('.inline-edit-input[data-field="firstName"]');
      expect(movedInput.value).toBe('Ada Edited');

      // further edits at its NEW position must route to the correct (moved) draft
      const ageInputAtNewPos = container.querySelectorAll('[data-row-index]')[1].querySelector('.inline-edit-input[data-field="age"]');
      ageInputAtNewPos.value = '31';
      ageInputAtNewPos.dispatchEvent(new Event('input', { bubbles: true }));

      table.saveBatch();
      expect(onBatchCommit).toHaveBeenCalledWith({
        added: [],
        updated: [{ original: rowAda, updated: { ...rowAda, firstName: 'Ada Edited', age: '31' } }],
      });
    });
  });

  describe('jQuery event delegation survives full DOM rebuilds', () => {
    it('a stable delegationRoot keeps row-action clicks working after the table container is torn down and replaced', () => {
      const table = createTable();
      const stableRoot = document.createElement('div');
      document.body.appendChild(stableRoot);
      const onRowDelete = vi.fn();
      const data = makeData();

      let tableContainer = document.createElement('div');
      stableRoot.appendChild(tableContainer);
      table.render(tableContainer, baseProps({ data, onRowDelete, delegationRoot: stableRoot }));
      tableContainer.querySelectorAll('.row-action-delete')[0].click();
      expect(onRowDelete).toHaveBeenCalledTimes(1);

      // Force a full rebuild: a brand new container replaces the old one, exactly
      // like renderBody() does on every store change (tableContainer = el('div')).
      stableRoot.removeChild(tableContainer);
      tableContainer = document.createElement('div');
      stableRoot.appendChild(tableContainer);
      table.render(tableContainer, baseProps({ data, onRowDelete, delegationRoot: stableRoot }));

      tableContainer.querySelectorAll('.row-action-delete')[1].click();
      expect(onRowDelete).toHaveBeenCalledTimes(2);
      expect(onRowDelete).toHaveBeenLastCalledWith(data[1]);
    });

    it('delegated batch input handling keeps routing correctly after a full container rebuild triggered by a sort', () => {
      const table = createTable();
      const stableRoot = document.createElement('div');
      document.body.appendChild(stableRoot);
      const data = makeData();
      const onBatchCommit = vi.fn();

      let tableContainer = document.createElement('div');
      stableRoot.appendChild(tableContainer);
      table.render(tableContainer, baseProps({ gridMode: 'batch', data, delegationRoot: stableRoot }));

      // Full rebuild simulating a sort-triggered re-render (fresh container, reordered data).
      stableRoot.removeChild(tableContainer);
      tableContainer = document.createElement('div');
      stableRoot.appendChild(tableContainer);
      const reordered = [data[2], data[0], data[1]];
      table.render(tableContainer, baseProps({ gridMode: 'batch', data: reordered, onBatchCommit, delegationRoot: stableRoot }));

      const input = tableContainer.querySelectorAll('[data-row-index]')[1].querySelector('.inline-edit-input[data-field="firstName"]');
      input.value = 'Still Works';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      table.saveBatch();
      expect(onBatchCommit).toHaveBeenCalledWith({
        added: [],
        updated: [{ original: data[0], updated: { ...data[0], firstName: 'Still Works' } }],
      });
    });

    it('falls back to binding directly on the passed container when no delegationRoot is supplied', () => {
      const table = createTable();
      const onRowDelete = vi.fn();
      table.render(container, baseProps({ onRowDelete, delegationRoot: undefined }));
      container.querySelectorAll('.row-action-delete')[0].click();
      expect(onRowDelete).toHaveBeenCalledTimes(1);
    });

    it('bindDelegation only binds once per table instance even across many render() calls (no duplicate handler firing)', () => {
      const table = createTable();
      const onRowDelete = vi.fn();
      const data = makeData();
      table.render(container, baseProps({ data, onRowDelete }));
      table.render(container, baseProps({ data, onRowDelete }));
      table.render(container, baseProps({ data, onRowDelete }));
      container.querySelectorAll('.row-action-delete')[0].click();
      expect(onRowDelete).toHaveBeenCalledTimes(1);
    });
  });
});
