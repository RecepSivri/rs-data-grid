import { describe, expect, it } from 'vitest';
import { requestConfirm } from './confirmDialog';

// confirmDialog keeps one module-level singleton <dialog>, created on first
// use and reused for the app's whole lifetime -- these tests run against
// that same one instance in sequence, matching how it's actually used.
const getDialog = () => document.querySelector('dialog.rs-dialog');
const getButton = text => Array.from(getDialog().querySelectorAll('button')).find(b => b.textContent === text);

describe('requestConfirm', () => {
  it('creates and appends a single dialog element, reused across calls', async () => {
    const p1 = requestConfirm('Delete row?', 'Are you sure?');
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
    getButton('No').click();
    await p1;
    requestConfirm('Delete row?', 'Are you sure?');
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
    getButton('No').click();
  });

  it('defaults the title to "Confirm" when none is given', () => {
    requestConfirm('', 'msg');
    expect(getDialog().querySelector('.rs-dialog-title').textContent).toBe('Confirm');
    getButton('No').click();
  });

  it('sets the title/message text', () => {
    requestConfirm('Delete row?', 'Are you sure?');
    expect(getDialog().querySelector('.rs-dialog-title').textContent).toBe('Delete row?');
    expect(getDialog().querySelector('.confirm-message').textContent).toBe('Are you sure?');
    getButton('No').click();
  });

  it('defaults the theme to light and accepts an explicit theme', () => {
    requestConfirm('t', 'm');
    expect(getDialog().getAttribute('data-rg-theme')).toBe('light');
    getButton('No').click();

    requestConfirm('t', 'm', 'dark');
    expect(getDialog().getAttribute('data-rg-theme')).toBe('dark');
    getButton('No').click();
  });

  it('resolves true when Yes is clicked', async () => {
    const promise = requestConfirm('t', 'm');
    getButton('Yes').click();
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when No is clicked', async () => {
    const promise = requestConfirm('t', 'm');
    getButton('No').click();
    await expect(promise).resolves.toBe(false);
  });

  it('resolves false when the backdrop (the dialog element itself) is clicked', async () => {
    const promise = requestConfirm('t', 'm');
    getDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBe(false);
  });

  it('does not close when a click on inner content bubbles up (target is not the dialog itself)', async () => {
    const promise = requestConfirm('t', 'm');
    const inner = getDialog().querySelector('.rs-dialog-title');
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    getButton('No').click();
    await expect(promise).resolves.toBe(false);
  });

  it('is a no-op if close() fires again with no pending promise', async () => {
    const promise = requestConfirm('t', 'm');
    getButton('Yes').click();
    await expect(promise).resolves.toBe(true);
    expect(() => getDialog().close()).not.toThrow();
  });
});
