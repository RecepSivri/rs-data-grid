// Native <dialog>-based port of EditRowDialog.tsx. Add mode (row undefined,
// columns provided): one text input per declared column. Edit mode (row
// provided): one input per the ROW'S OWN keys (not just declared columns),
// so extra/missing fields on a row still round-trip -- matches React exactly.
import { el, clear } from '../domUtil.js';
import './dialogs.css';

let dialogEl = null;
let titleEl = null;
let formEl = null;
let pendingResolve = null;
let currentRow = null;
let fields = []; // [{ key }]
let editableRow = {};

function ensureDialog() {
  if (dialogEl) {
    return;
  }
  titleEl = el('h2', { className: 'rs-dialog-title' });
  formEl = el('div', { className: 'edit-form' });

  const cancelBtn = el('button', {
    className: 'rs-dialog-button',
    text: 'Cancel',
    attrs: { type: 'button' },
    on: { click: () => { dialogEl.returnValue = 'cancel'; dialogEl.close(); } },
  });
  const saveBtn = el('button', {
    className: 'rs-dialog-button rs-dialog-button-primary',
    text: 'Save',
    attrs: { type: 'button' },
    on: { click: () => { dialogEl.returnValue = 'confirm'; dialogEl.close(); } },
  });

  dialogEl = el('dialog', {
    className: 'rs-dialog',
    children: [titleEl, formEl, el('div', { className: 'rs-dialog-actions', children: [cancelBtn, saveBtn] })],
    on: {
      click: event => {
        if (event.target === dialogEl) {
          dialogEl.close();
        }
      },
      close: () => {
        if (!pendingResolve) {
          return;
        }
        const resolve = pendingResolve;
        pendingResolve = null;
        if (dialogEl.returnValue === 'confirm') {
          const result = { ...currentRow };
          for (const field of fields) {
            result[field.key] = editableRow[field.key];
          }
          resolve(result);
        } else {
          resolve(null);
        }
      },
    },
  });
  document.body.appendChild(dialogEl);
}

function renderFields() {
  clear(formEl);
  for (const field of fields) {
    const input = el('input', {
      className: 'edit-input',
      attrs: { type: 'text' },
      props: { value: editableRow[field.key] ?? '' },
      on: { input: event => { editableRow[field.key] = event.target.value; } },
    });
    formEl.appendChild(
      el('div', { className: 'edit-row', children: [el('label', { className: 'edit-label', text: field.key }), input] })
    );
  }
}

/**
 * @param {{ row?: any, columns?: Array<{caption: string, dataField: string}>, theme?: 'dark' | 'light' }} opts
 * @returns {Promise<Record<string, any>|null>} resolves the merged row on Save, null on Cancel/dismiss
 */
export function requestEditRow({ row, columns, theme }) {
  ensureDialog();
  currentRow = row;
  fields = [];
  editableRow = {};
  if (row) {
    for (const [key, value] of Object.entries(row)) {
      fields.push({ key });
      editableRow[key] = value === null || value === undefined ? '' : String(value);
    }
  } else {
    for (const column of columns ?? []) {
      fields.push({ key: column.dataField });
      editableRow[column.dataField] = '';
    }
  }
  titleEl.textContent = row ? 'Edit row' : 'Add row';
  renderFields();
  dialogEl.returnValue = '';
  dialogEl.setAttribute('data-rg-theme', theme ?? 'dark');
  return new Promise(resolve => {
    pendingResolve = resolve;
    dialogEl.showModal();
  });
}
