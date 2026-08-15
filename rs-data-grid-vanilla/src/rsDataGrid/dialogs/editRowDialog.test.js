import { describe, expect, it } from 'vitest';
import { requestEditRow } from './editRowDialog';

// Same module-level singleton <dialog> pattern as confirmDialog -- these
// tests run against the one shared instance in sequence.
const getDialog = () => document.querySelector('dialog.rs-dialog');
const getButton = text => Array.from(getDialog().querySelectorAll('button')).find(b => b.textContent === text);
const getInputs = () => Array.from(getDialog().querySelectorAll('.edit-input'));
const getLabels = () => Array.from(getDialog().querySelectorAll('.edit-label')).map(l => l.textContent);

describe('requestEditRow', () => {
  it('add mode: builds one empty input per declared column, titled "Add row"', () => {
    requestEditRow({ columns: [{ caption: 'Title', dataField: 'title' }, { caption: 'Year', dataField: 'year' }] });
    expect(getDialog().querySelector('.rs-dialog-title').textContent).toBe('Add row');
    expect(getLabels()).toEqual(['title', 'year']);
    expect(getInputs().map(i => i.value)).toEqual(['', '']);
    getButton('Cancel').click();
  });

  it('add mode: defaults to no fields when columns is omitted', () => {
    requestEditRow({});
    expect(getLabels()).toEqual([]);
    getButton('Cancel').click();
  });

  it('edit mode: builds one input per the row\'s own keys, titled "Edit row"', () => {
    requestEditRow({ row: { title: 'Movie A', year: 2020 } });
    expect(getDialog().querySelector('.rs-dialog-title').textContent).toBe('Edit row');
    expect(getLabels()).toEqual(['title', 'year']);
    expect(getInputs().map(i => i.value)).toEqual(['Movie A', '2020']);
    getButton('Cancel').click();
  });

  it('edit mode: stringifies null/undefined row values as empty strings', () => {
    requestEditRow({ row: { a: null, b: undefined, c: 0 } });
    expect(getInputs().map(i => i.value)).toEqual(['', '', '0']);
    getButton('Cancel').click();
  });

  it('defaults the theme to light and accepts an explicit theme', () => {
    requestEditRow({ row: { a: 1 } });
    expect(getDialog().getAttribute('data-rg-theme')).toBe('light');
    getButton('Cancel').click();

    requestEditRow({ row: { a: 1 }, theme: 'dark' });
    expect(getDialog().getAttribute('data-rg-theme')).toBe('dark');
    getButton('Cancel').click();
  });

  it('resolves null on Cancel', async () => {
    const promise = requestEditRow({ row: { a: 1 } });
    getButton('Cancel').click();
    await expect(promise).resolves.toBeNull();
  });

  it('resolves null when the backdrop is clicked', async () => {
    const promise = requestEditRow({ row: { a: 1 } });
    getDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBeNull();
  });

  it('resolves the row spread with edited field values on Save', async () => {
    const row = { title: 'Old', year: 2000, extra: 'kept' };
    const promise = requestEditRow({ row });
    const inputs = getInputs();
    inputs[0].value = 'New title';
    inputs[0].dispatchEvent(new Event('input'));
    getButton('Save').click();
    await expect(promise).resolves.toEqual({ title: 'New title', year: '2000', extra: 'kept' });
  });

  it('add mode Save resolves an object built from declared columns only', async () => {
    const promise = requestEditRow({ columns: [{ caption: 'Title', dataField: 'title' }] });
    const inputs = getInputs();
    inputs[0].value = 'Brand new';
    inputs[0].dispatchEvent(new Event('input'));
    getButton('Save').click();
    await expect(promise).resolves.toEqual({ title: 'Brand new' });
  });

  it('is a no-op if close() fires again with no pending promise', async () => {
    const promise = requestEditRow({ row: { a: 1 } });
    getButton('Cancel').click();
    await expect(promise).resolves.toBeNull();
    expect(() => getDialog().close()).not.toThrow();
  });

  it('rebuilds the form (clearing prior fields) on each new call', () => {
    requestEditRow({ row: { onlyHere: 1 } });
    getButton('Cancel').click();
    requestEditRow({ columns: [{ caption: 'X', dataField: 'x' }] });
    expect(getLabels()).toEqual(['x']);
    getButton('Cancel').click();
  });
});
