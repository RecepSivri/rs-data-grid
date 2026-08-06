import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('editRowDialog', () => {
  let requestEditRow;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.resetModules();
    ({ requestEditRow } = await import('../../src/rsDataGrid/dialogs/editRowDialog.js'));
  });

  it('creates a single <dialog> appended to document.body, lazily on first call', () => {
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(0);
    requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
  });

  it('reuses the same dialog element across multiple calls (ensureDialog no-op on 2nd call)', () => {
    requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
    const first = document.querySelector('dialog.rs-dialog');
    requestEditRow({ columns: [{ caption: 'Age', dataField: 'age' }] });
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
    expect(document.querySelector('dialog.rs-dialog')).toBe(first);
  });

  describe('add mode (row undefined)', () => {
    it('sets the title to "Add row" and builds one input per declared column, defaulted to empty string', () => {
      requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }, { caption: 'Age', dataField: 'age' }] });
      expect(document.querySelector('.rs-dialog-title').textContent).toBe('Add row');
      const inputs = document.querySelectorAll('.edit-input');
      expect(inputs.length).toBe(2);
      expect(inputs[0].value).toBe('');
      expect(inputs[1].value).toBe('');
      const labels = document.querySelectorAll('.edit-label');
      expect(labels[0].textContent).toBe('name');
      expect(labels[1].textContent).toBe('age');
    });

    it('defaults columns to an empty array when omitted (no fields rendered)', () => {
      requestEditRow({});
      expect(document.querySelectorAll('.edit-input').length).toBe(0);
    });

    it('resolves the entered values keyed by dataField on Save', async () => {
      const promise = requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
      const input = document.querySelector('.edit-input');
      input.value = 'Ada';
      input.dispatchEvent(new Event('input'));
      document.querySelector('.rs-dialog-button-primary').click();
      await expect(promise).resolves.toEqual({ name: 'Ada' });
    });

    it('resolves null on Cancel', async () => {
      const promise = requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
      document.querySelectorAll('.rs-dialog-button')[0].click();
      await expect(promise).resolves.toBeNull();
    });
  });

  describe('edit mode (row provided)', () => {
    it('sets the title to "Edit row" and builds one input per the ROW\'S OWN keys (not the declared columns)', () => {
      requestEditRow({ row: { firstName: 'Ada', extra: 'x' }, columns: [{ caption: 'Name', dataField: 'firstName' }] });
      expect(document.querySelector('.rs-dialog-title').textContent).toBe('Edit row');
      const labels = [...document.querySelectorAll('.edit-label')].map(l => l.textContent);
      expect(labels).toEqual(['firstName', 'extra']);
    });

    it('stringifies non-null/undefined values for the input, and coerces null/undefined to empty string', () => {
      requestEditRow({ row: { age: 30, missing: null, blank: undefined } });
      const inputs = document.querySelectorAll('.edit-input');
      expect(inputs[0].value).toBe('30');
      expect(inputs[1].value).toBe('');
      expect(inputs[2].value).toBe('');
    });

    it('merges edited fields onto a copy of the original row (extra row keys survive) on Save', async () => {
      const original = { id: 7, name: 'Ada', untouched: 'kept' };
      const promise = requestEditRow({ row: original });
      const inputs = document.querySelectorAll('.edit-input');
      const nameInput = [...inputs][1]; // order: id, name, untouched
      nameInput.value = 'Ada Lovelace';
      nameInput.dispatchEvent(new Event('input'));
      document.querySelector('.rs-dialog-button-primary').click();
      // Every field.key present in the row is written back from editableRow (all
      // stringified on read), not just the one the user actually touched -- so
      // untouched fields round-trip as strings too.
      await expect(promise).resolves.toEqual({ id: '7', name: 'Ada Lovelace', untouched: 'kept' });
      // original object itself must not be mutated
      expect(original.name).toBe('Ada');
      expect(original.id).toBe(7);
    });

    it('resolves null on Cancel without mutating the row', async () => {
      const original = { id: 1 };
      const promise = requestEditRow({ row: original });
      document.querySelectorAll('.rs-dialog-button')[0].click();
      await expect(promise).resolves.toBeNull();
    });
  });

  it('opens the dialog via showModal and resets returnValue before opening', async () => {
    const first = requestEditRow({ columns: [] });
    document.querySelector('.rs-dialog-button-primary').click();
    await first;
    const dialog = document.querySelector('dialog.rs-dialog');
    expect(dialog.returnValue).toBe('confirm');
    requestEditRow({ columns: [] });
    expect(dialog.returnValue).toBe('');
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('resolves null on backdrop click (click target === dialog itself)', async () => {
    const promise = requestEditRow({ columns: [] });
    const dialog = document.querySelector('dialog.rs-dialog');
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBeNull();
  });

  it('does not close when a click lands on inner content (not the dialog element itself)', () => {
    requestEditRow({ columns: [] });
    const dialog = document.querySelector('dialog.rs-dialog');
    const title = document.querySelector('.rs-dialog-title');
    title.click();
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('ignores a close event fired with no pending promise (pendingResolve null guard)', () => {
    requestEditRow({ columns: [] });
    const dialog = document.querySelector('dialog.rs-dialog');
    document.querySelector('.rs-dialog-button-primary').click(); // resolves + clears pendingResolve
    expect(() => dialog.dispatchEvent(new Event('close'))).not.toThrow();
  });

  it('clears stale fields from a previous call before rendering the next set', () => {
    requestEditRow({ columns: [{ caption: 'A', dataField: 'a' }, { caption: 'B', dataField: 'b' }] });
    expect(document.querySelectorAll('.edit-input').length).toBe(2);
    requestEditRow({ columns: [{ caption: 'C', dataField: 'c' }] });
    expect(document.querySelectorAll('.edit-input').length).toBe(1);
    expect(document.querySelector('.edit-label').textContent).toBe('c');
  });
});
