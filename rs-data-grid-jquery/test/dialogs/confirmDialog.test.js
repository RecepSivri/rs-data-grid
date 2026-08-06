import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('confirmDialog', () => {
  let requestConfirm;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.resetModules();
    ({ requestConfirm } = await import('../../src/rsDataGrid/dialogs/confirmDialog.js'));
  });

  it('creates a single <dialog> appended to document.body, lazily on first call', () => {
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(0);
    requestConfirm('Title', 'Message');
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
  });

  it('reuses the same dialog element across multiple calls (ensureDialog no-op on 2nd call)', () => {
    requestConfirm('First', 'first message');
    const firstDialog = document.querySelector('dialog.rs-dialog');
    requestConfirm('Second', 'second message');
    expect(document.querySelectorAll('dialog.rs-dialog').length).toBe(1);
    expect(document.querySelector('dialog.rs-dialog')).toBe(firstDialog);
  });

  it('sets title and message text, defaulting title to "Confirm" when falsy', () => {
    requestConfirm('', 'body text');
    expect(document.querySelector('.rs-dialog-title').textContent).toBe('Confirm');
    expect(document.querySelector('.confirm-message').textContent).toBe('body text');
  });

  it('uses the provided title when truthy', () => {
    requestConfirm('Delete row', 'Are you sure?');
    expect(document.querySelector('.rs-dialog-title').textContent).toBe('Delete row');
  });

  it('opens the dialog via showModal', () => {
    requestConfirm('T', 'M');
    const dialog = document.querySelector('dialog.rs-dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('resolves true when the Yes button is clicked', async () => {
    const promise = requestConfirm('T', 'M');
    document.querySelector('.rs-dialog-button-danger').click();
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when the No button is clicked', async () => {
    const promise = requestConfirm('T', 'M');
    const noButton = document.querySelectorAll('.rs-dialog-button')[0];
    expect(noButton.textContent).toBe('No');
    noButton.click();
    await expect(promise).resolves.toBe(false);
  });

  it('resolves false on backdrop click (click target === dialog itself)', async () => {
    const promise = requestConfirm('T', 'M');
    const dialog = document.querySelector('dialog.rs-dialog');
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBe(false);
  });

  it('does not close when a click lands on inner content (not the dialog element itself)', () => {
    requestConfirm('T', 'M');
    const dialog = document.querySelector('dialog.rs-dialog');
    const title = document.querySelector('.rs-dialog-title');
    title.click();
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('resets returnValue to empty string before opening for a fresh call', async () => {
    const first = requestConfirm('T', 'M');
    document.querySelector('.rs-dialog-button-danger').click();
    await first;
    const dialog = document.querySelector('dialog.rs-dialog');
    // Immediately after close(), returnValue holds the previous result.
    expect(dialog.returnValue).toBe('confirm');
    requestConfirm('T2', 'M2');
    expect(dialog.returnValue).toBe('');
  });

  it('ignores a close event fired with no pending promise (pendingResolve null guard)', () => {
    requestConfirm('T', 'M');
    const dialog = document.querySelector('dialog.rs-dialog');
    document.querySelector('.rs-dialog-button-danger').click(); // resolves + clears pendingResolve
    expect(() => dialog.dispatchEvent(new Event('close'))).not.toThrow();
  });
});
