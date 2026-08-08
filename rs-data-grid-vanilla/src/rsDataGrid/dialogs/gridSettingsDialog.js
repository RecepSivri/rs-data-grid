// Native <dialog>-based port of GridSettingsDialog.tsx. A singleton modal
// (like confirmDialog/editRowDialog) with a hand-rolled Select-style
// dropdown (button trigger + checkbox panel, reusing the filter-panel/
// filter-option classes from rsDataGridHeader.css) for column picking, plus
// a separate draggable "Visible order" chip list. Unlike the other two
// dialogs here, this one is NOT promise-based -- selection changes must
// apply live while the dialog stays open, so it takes an onChange callback
// instead and never resolves a value on close.
import { el, clear } from '../domUtil.js';
import './dialogs.css';

let dialogEl = null;
let bodyEl = null;
let actionsEl = null;
let columns = [];
let selected = [];
let onChangeCb = null;
let dropdownOpen = false;
let draggedField = null;

function captionFor(field) {
  const column = columns.find(c => c.dataField === field);
  return column ? column.caption : field;
}

function emitChange(next) {
  selected = next;
  if (onChangeCb) {
    onChangeCb(selected);
  }
}

function toggleField(field) {
  emitChange(selected.includes(field) ? selected.filter(f => f !== field) : [...selected, field]);
  renderAll();
}

function removeField(field) {
  emitChange(selected.filter(f => f !== field));
  renderAll();
}

function clearAll() {
  emitChange([]);
  renderAll();
}

function moveSelected(fromField, toField) {
  if (fromField === toField) {
    return;
  }
  const fromIndex = selected.indexOf(fromField);
  const toIndexOriginal = selected.indexOf(toField);
  if (fromIndex === -1 || toIndexOriginal === -1) {
    return;
  }
  const next = selected.slice();
  next.splice(fromIndex, 1);
  let insertAt = next.indexOf(toField);
  if (fromIndex < toIndexOriginal) {
    insertAt += 1;
  }
  next.splice(insertAt, 0, fromField);
  emitChange(next);
  renderAll();
}

function closeDropdown() {
  if (!dropdownOpen) {
    return;
  }
  dropdownOpen = false;
  renderAll();
}

function buildSelect() {
  const triggerContent =
    selected.length > 0
      ? el('div', { className: 'grid-settings-chip-row', children: selected.map(field => el('span', { className: 'grid-settings-trigger-chip', text: captionFor(field) })) })
      : el('span', { className: 'grid-settings-select-placeholder', text: 'All columns' });

  const trigger = el('button', {
    className: 'grid-settings-select-trigger',
    attrs: { type: 'button', 'aria-label': 'Columns' },
    children: [triggerContent, el('span', { className: 'filter-caret' + (dropdownOpen ? ' filter-caret-open' : ''), html: '&#9662;' })],
    on: {
      click: event => {
        event.stopPropagation();
        dropdownOpen = !dropdownOpen;
        renderAll();
      },
    },
  });

  const wrapperChildren = [trigger];
  if (dropdownOpen) {
    const options =
      columns.length === 0
        ? [el('div', { className: 'filter-empty', text: 'No columns' })]
        : columns.map(column => {
            const checked = selected.includes(column.dataField);
            const checkbox = el('input', {
              attrs: { type: 'checkbox' },
              props: { checked },
              on: { change: event => { event.stopPropagation(); toggleField(column.dataField); } },
            });
            return el('label', {
              className: 'filter-option' + (checked ? ' filter-option-selected' : ''),
              children: [checkbox, el('span', { text: column.caption })],
            });
          });
    wrapperChildren.push(el('div', { className: 'filter-panel grid-settings-dropdown-panel', on: { click: event => event.stopPropagation() }, children: options }));
  }
  return el('div', { className: 'grid-settings-select-wrapper', children: wrapperChildren });
}

function buildOrderSection() {
  if (selected.length === 0) {
    return null;
  }
  const chips = selected.map(field =>
    el('span', {
      className: 'grid-settings-drag-chip',
      attrs: { draggable: 'true' },
      children: [
        el('span', { text: captionFor(field) }),
        el('button', {
          className: 'grid-settings-chip-remove',
          html: '&times;',
          attrs: { type: 'button', 'aria-label': 'Remove ' + captionFor(field) },
          on: { click: () => removeField(field) },
        }),
      ],
      on: {
        dragstart: () => { draggedField = field; },
        dragend: event => { draggedField = null; event.currentTarget.classList.remove('grid-settings-drag-chip-over'); },
        dragover: event => { event.preventDefault(); event.currentTarget.classList.add('grid-settings-drag-chip-over'); },
        dragleave: event => { event.currentTarget.classList.remove('grid-settings-drag-chip-over'); },
        drop: event => {
          event.preventDefault();
          event.currentTarget.classList.remove('grid-settings-drag-chip-over');
          const from = draggedField;
          draggedField = null;
          if (from) {
            moveSelected(from, field);
          }
        },
      },
    })
  );
  return el('div', {
    className: 'grid-settings-section',
    children: [
      el('div', { className: 'grid-settings-heading', text: 'Visible order' }),
      el('div', { className: 'grid-settings-hint', text: 'Drag to reorder.' }),
      el('div', { className: 'grid-settings-chip-row', children: chips }),
    ],
  });
}

function renderAll() {
  clear(bodyEl);
  bodyEl.appendChild(
    el('div', {
      className: 'grid-settings-section',
      children: [el('div', { className: 'grid-settings-hint', text: 'Pick which columns to show. Nothing selected shows every column.' }), buildSelect()],
    })
  );
  const orderSection = buildOrderSection();
  if (orderSection) {
    bodyEl.appendChild(orderSection);
  }

  clear(actionsEl);
  const footerChildren = [];
  if (selected.length > 0) {
    footerChildren.push(el('button', { className: 'rs-dialog-button', text: 'Clear', attrs: { type: 'button' }, on: { click: clearAll } }));
  }
  footerChildren.push(el('button', { className: 'rs-dialog-button rs-dialog-button-primary', text: 'Close', attrs: { type: 'button' }, on: { click: () => dialogEl.close() } }));
  actionsEl.append(...footerChildren);
}

function ensureDialog() {
  if (dialogEl) {
    return;
  }
  const titleEl = el('h2', { className: 'rs-dialog-title', text: 'Grid Settings' });
  bodyEl = el('div', { className: 'grid-settings-body' });
  actionsEl = el('div', { className: 'rs-dialog-actions' });

  dialogEl = el('dialog', {
    className: 'rs-dialog grid-settings-dialog',
    children: [titleEl, bodyEl, actionsEl],
    on: {
      click: event => { if (event.target === dialogEl) dialogEl.close(); },
      close: () => { dropdownOpen = false; },
    },
  });
  document.body.appendChild(dialogEl);
  document.addEventListener('click', closeDropdown);
}

/**
 * @param {{ columns: Array<{caption: string, dataField: string}>, selected: string[], theme?: 'dark'|'light', onChange: (next: string[]) => void }} opts
 */
export function openGridSettings({ columns: cols, selected: sel, theme, onChange }) {
  ensureDialog();
  columns = cols;
  selected = sel;
  onChangeCb = onChange;
  dropdownOpen = false;
  dialogEl.setAttribute('data-rg-theme', theme ?? 'light');
  renderAll();
  dialogEl.showModal();
}
