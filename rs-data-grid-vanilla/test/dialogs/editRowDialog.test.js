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

  it('reuses the same dialog element across multiple calls', () => {
    requestEditRow({ columns: [] });
    const dialog = document.querySelector('dialog.rs-dialog');
    requestEditRow({ columns: [] });
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
    expect(document.querySelector('dialog.rs-dialog')).toBe(dialog);
  });

  describe('add mode (row undefined, columns provided)', () => {
    it('sets the title to "Add row"', () => {
      requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
      expect(document.querySelector('.rs-dialog-title').textContent).toBe('Add row');
    });

    it('renders one empty input per declared column', () => {
      requestEditRow({
        columns: [
          { caption: 'Name', dataField: 'name' },
          { caption: 'Age', dataField: 'age' },
        ],
      });
      const inputs = document.querySelectorAll('.edit-input');
      expect(inputs.length).toBe(2);
      expect(inputs[0].value).toBe('');
      expect(inputs[1].value).toBe('');
      const labels = Array.from(document.querySelectorAll('.edit-label')).map(l => l.textContent);
      expect(labels).toEqual(['name', 'age']);
    });

    it('treats a missing columns array as empty (columns ?? [])', () => {
      requestEditRow({});
      expect(document.querySelectorAll('.edit-input').length).toBe(0);
    });

    it('typing into an input updates the draft, and Save resolves with the new row object', async () => {
      const promise = requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
      const input = document.querySelector('.edit-input');
      input.value = 'Alice';
      input.dispatchEvent(new Event('input'));
      document.querySelector('.rs-dialog-button-primary').click();
      const result = await promise;
      expect(result).toEqual({ name: 'Alice' });
    });

    it('resolves null when Cancel is clicked', async () => {
      const promise = requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
      const cancelBtn = document.querySelectorAll('.rs-dialog-button')[0];
      expect(cancelBtn.textContent).toBe('Cancel');
      cancelBtn.click();
      await expect(promise).resolves.toBeNull();
    });

    it('resolves null on backdrop dismissal', async () => {
      const promise = requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
      const dialog = document.querySelector('dialog.rs-dialog');
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await expect(promise).resolves.toBeNull();
    });
  });

  describe('edit mode (row provided)', () => {
    it('sets the title to "Edit row"', () => {
      requestEditRow({ row: { name: 'Bob', age: 40 } });
      expect(document.querySelector('.rs-dialog-title').textContent).toBe('Edit row');
    });

    it("renders one input per the row's OWN keys, prefilled with its values, ignoring the declared columns list", () => {
      requestEditRow({
        row: { name: 'Bob', extra: 'field', age: 40 },
        columns: [{ caption: 'Name', dataField: 'name' }],
      });
      const labels = Array.from(document.querySelectorAll('.edit-label')).map(l => l.textContent);
      expect(labels).toEqual(['name', 'extra', 'age']);
      const inputs = document.querySelectorAll('.edit-input');
      expect(inputs[0].value).toBe('Bob');
      expect(inputs[1].value).toBe('field');
      expect(inputs[2].value).toBe('40');
    });

    it('stringifies non-string values (numbers) and coerces null/undefined to an empty string', () => {
      requestEditRow({ row: { count: 5, missing: null, blank: undefined } });
      const inputs = document.querySelectorAll('.edit-input');
      expect(inputs[0].value).toBe('5');
      expect(inputs[1].value).toBe('');
      expect(inputs[2].value).toBe('');
    });

    it('Save merges edited fields (all round-tripped as strings) onto a shallow copy of the original row', async () => {
      const originalRow = { id: 1, name: 'Bob', untouchedExtra: 'keep-me' };
      const promise = requestEditRow({ row: originalRow });
      const nameInput = Array.from(document.querySelectorAll('.edit-row')).find(r => r.querySelector('.edit-label').textContent === 'name').querySelector('.edit-input');
      nameInput.value = 'Robert';
      nameInput.dispatchEvent(new Event('input'));
      document.querySelector('.rs-dialog-button-primary').click();
      const result = await promise;
      // Every one of the row's own keys is a declared field, so all round-trip
      // through the string draft -- even id, which was untouched by the user.
      expect(result).toEqual({ id: '1', name: 'Robert', untouchedExtra: 'keep-me' });
      expect(result).not.toBe(originalRow);
      expect(originalRow).toEqual({ id: 1, name: 'Bob', untouchedExtra: 'keep-me' }); // original untouched
    });

    it('resolves null on Cancel without mutating the original row', async () => {
      const originalRow = { name: 'Bob' };
      const promise = requestEditRow({ row: originalRow });
      const input = document.querySelector('.edit-input');
      input.value = 'Changed';
      input.dispatchEvent(new Event('input'));
      document.querySelectorAll('.rs-dialog-button')[0].click();
      const result = await promise;
      expect(result).toBeNull();
      expect(originalRow).toEqual({ name: 'Bob' });
    });
  });

  it('re-renders fields fresh on each call (clear() removes prior inputs)', () => {
    requestEditRow({ columns: [{ caption: 'A', dataField: 'a' }, { caption: 'B', dataField: 'b' }] });
    expect(document.querySelectorAll('.edit-input').length).toBe(2);
    requestEditRow({ columns: [{ caption: 'C', dataField: 'c' }] });
    expect(document.querySelectorAll('.edit-input').length).toBe(1);
  });

  it('resets returnValue to empty string before opening for a fresh call', async () => {
    const first = requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
    document.querySelector('.rs-dialog-button-primary').click();
    await first;
    const dialog = document.querySelector('dialog.rs-dialog');
    expect(dialog.returnValue).toBe('confirm');
    requestEditRow({ columns: [] });
    expect(dialog.returnValue).toBe('');
  });

  it('opens the dialog via showModal', () => {
    requestEditRow({ columns: [] });
    const dialog = document.querySelector('dialog.rs-dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('does not close when a click lands on inner content (not the dialog element itself)', () => {
    requestEditRow({ columns: [{ caption: 'Name', dataField: 'name' }] });
    const dialog = document.querySelector('dialog.rs-dialog');
    document.querySelector('.rs-dialog-title').click();
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('ignores a close event fired with no pending promise (pendingResolve null guard)', () => {
    requestEditRow({ columns: [] });
    const dialog = document.querySelector('dialog.rs-dialog');
    document.querySelector('.rs-dialog-button-primary').click();
    expect(() => dialog.dispatchEvent(new Event('close'))).not.toThrow();
  });
});
