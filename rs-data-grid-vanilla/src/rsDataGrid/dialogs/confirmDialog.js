// Native <dialog>-based port of ConfirmDialog.tsx. A single reusable modal,
// driven by a promise-based API matching the React version's call-site shape
// exactly: requestConfirm(title, message) -> Promise<boolean>.
import { el } from '../domUtil.js';
import './dialogs.css';

let dialogEl = null;
let titleEl = null;
let messageEl = null;
let pendingResolve = null;

function ensureDialog() {
  if (dialogEl) {
    return;
  }
  titleEl = el('h2', { className: 'rs-dialog-title' });
  messageEl = el('p', { className: 'confirm-message' });

  const noBtn = el('button', {
    className: 'rs-dialog-button',
    text: 'No',
    attrs: { type: 'button' },
    on: { click: () => { dialogEl.returnValue = 'cancel'; dialogEl.close(); } },
  });
  const yesBtn = el('button', {
    className: 'rs-dialog-button rs-dialog-button-danger',
    text: 'Yes',
    attrs: { type: 'button' },
    on: { click: () => { dialogEl.returnValue = 'confirm'; dialogEl.close(); } },
  });

  dialogEl = el('dialog', {
    className: 'rs-dialog',
    children: [titleEl, messageEl, el('div', { className: 'rs-dialog-actions', children: [noBtn, yesBtn] })],
    on: {
      // Backdrop click: only the <dialog> element itself (not its content) is
      // the click target when the click lands on the backdrop area.
      click: event => {
        if (event.target === dialogEl) {
          dialogEl.close();
        }
      },
      // Single source of truth for resolving the pending promise -- fires on
      // close(), Esc (native 'cancel' then 'close'), and backdrop dismissal.
      close: () => {
        if (pendingResolve) {
          const resolve = pendingResolve;
          pendingResolve = null;
          resolve(dialogEl.returnValue === 'confirm');
        }
      },
    },
  });
  document.body.appendChild(dialogEl);
}

/**
 * @param {string} title
 * @param {string} message
 * @param {'dark' | 'light'} [theme]
 * @returns {Promise<boolean>}
 */
export function requestConfirm(title, message, theme) {
  ensureDialog();
  titleEl.textContent = title || 'Confirm';
  messageEl.textContent = message;
  dialogEl.returnValue = '';
  dialogEl.setAttribute('data-rg-theme', theme ?? 'light');
  return new Promise(resolve => {
    pendingResolve = resolve;
    dialogEl.showModal();
  });
}
