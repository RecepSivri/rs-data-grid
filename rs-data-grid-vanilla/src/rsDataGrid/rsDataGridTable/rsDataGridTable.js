// Port of rsDataGridTable.tsx -- the three CRUD modes (popup/row/batch) plus
// delete. Row objects flow through by REFERENCE (never cloned) since the
// store's addRow/removeRow/updateRow match rows by `===` identity. Drafts
// are separate plain objects, mutated directly by input handlers WITHOUT
// calling render() -- this is what keeps focus stable while typing.
import { el, clear } from '../domUtil.js';
import { SAVE_ICON, CANCEL_ICON, EDIT_ICON, DELETE_ICON, DRAG_HANDLE_ICON } from '../icons.js';
import './rsDataGridTable.css';

function toDraft(row, columns) {
  const draft = {};
  for (const column of columns) {
    const value = row[column.dataField];
    draft[column.dataField] = value === null || value === undefined ? '' : String(value);
  }
  return draft;
}

export function createTable() {
  let editingRow = null;
  let editDraft = {};
  let isAddingRow = false;
  let addDraft = {};
  let batchDrafts = [];
  let batchNewDrafts = [];
  let batchDraftRowRefs = [];
  let draggedRow = null;
  let dragOverRow = null;

  let containerEl = null;
  let lastProps = null;

  function syncBatchDrafts(data, columns) {
    const draftByRow = new Map();
    batchDraftRowRefs.forEach((row, i) => {
      const existing = batchDrafts[i];
      /* istanbul ignore else -- batchDraftRowRefs and batchDrafts are only
         ever reassigned together, as same-length arrays, at the bottom of
         this function; existing is therefore always defined for every index
         this loop visits. Kept as a guard for structural safety, not a
         reachable-via-the-public-API case. */
      if (existing) {
        draftByRow.set(row, existing);
      }
    });
    batchDrafts = data.map(row => draftByRow.get(row) ?? toDraft(row, columns));
    batchDraftRowRefs = data;
  }

  function renderCurrent() {
    /* istanbul ignore else -- every internal caller of renderCurrent() is
       itself only reachable from a DOM event on previously-rendered content
       or from startAddingRow/addBatchRow (both only meaningfully called
       after an initial render), so containerEl/lastProps are always set. */
    if (containerEl && lastProps) {
      render(containerEl, lastProps);
    }
  }

  function cellClass(j, columns, showActions, bodyColumnLines) {
    return 'full-row section-style row-layout-center-center' + (bodyColumnLines && (j < columns.length - 1 || showActions) ? ' border-right' : '');
  }

  function buildAddRow(props) {
    const { columns, tableBorder, showActions, showIndex, dragDropRows, bodyColumnLines } = props;
    const indexCellClass = 'index-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
    const dragCellClass = 'drag-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
    const cells = [];
    if (dragDropRows) {
      cells.push(el('div', { className: dragCellClass }));
    }
    if (showIndex) {
      cells.push(el('div', { className: indexCellClass }));
    }
    columns.forEach((column, j) => {
      cells.push(
        el('div', {
          className: cellClass(j, columns, showActions, bodyColumnLines),
          children: [
            el('input', {
              className: 'inline-edit-input',
              attrs: { type: 'text' },
              props: { value: addDraft[column.dataField] ?? '' },
              on: { input: event => { addDraft[column.dataField] = event.target.value; } },
            }),
          ],
        })
      );
    });
    if (showActions) {
      cells.push(
        el('div', {
          className: 'actions-cell row-layout-center-center',
          children: [
            el('button', {
              className: 'row-action-button row-action-save',
              attrs: { type: 'button', title: 'Save row', 'aria-label': 'Save row' },
              html: SAVE_ICON,
              on: { click: onSaveAddClick },
            }),
            el('button', {
              className: 'row-action-button',
              attrs: { type: 'button', title: 'Cancel', 'aria-label': 'Cancel' },
              html: CANCEL_ICON,
              on: { click: onCancelAddClick },
            }),
          ],
        })
      );
    }
    return el('div', {
      className: 'full-row' + (tableBorder ? ' row-style' : '') + ' row-style-bottom',
      children: [el('div', { className: 'full-row row-layout', children: cells })],
    });
  }

  function buildDataRow(item, i, props) {
    const { columns, data, bodyRowLines, bodyColumnLines, tableBorder, borderRadiusBottom, diagonalRow, showActions, showIndex, dragDropRows, indexOffset, gridMode, onRowDelete, onRowMove } = props;
    const indexCellClass = 'index-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
    const dragCellClass = 'drag-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
    const isEditingThis = item === editingRow;
    const rowClass =
      'full-row' +
      (tableBorder ? ' row-style' : '') +
      ((tableBorder && i === data.length - 1) || (bodyRowLines && i !== data.length - 1) ? ' row-style-bottom' : '') +
      (borderRadiusBottom && i === data.length - 1 ? ' border-area-small' : '') +
      (i % 2 === 1 && diagonalRow ? ' row-background' : '') +
      (draggedRow === item ? ' row-dragging' : '') +
      (dragDropRows && dragOverRow === item ? ' row-drag-over' : '');

    const rowChildren = [];
    if (dragDropRows) {
      rowChildren.push(
        el('div', {
          className: dragCellClass,
          children: [
            el('span', {
              className: 'drag-handle',
              attrs: { draggable: 'true', 'aria-label': 'Reorder row' },
              html: DRAG_HANDLE_ICON,
              on: {
                dragstart: event => { draggedRow = item; if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; },
                dragend: () => { draggedRow = null; dragOverRow = null; renderCurrent(); },
              },
            }),
          ],
        })
      );
    }
    if (showIndex) {
      rowChildren.push(el('div', { className: indexCellClass, text: String(indexOffset + i + 1) }));
    }

    if (gridMode === 'batch') {
      columns.forEach((column, j) => {
        rowChildren.push(
          el('div', {
            className: cellClass(j, columns, showActions, bodyColumnLines),
            children: [
              el('input', {
                className: 'inline-edit-input',
                attrs: { type: 'text' },
                props: { value: batchDrafts[i]?.[column.dataField] ?? '' },
                on: { input: event => { if (batchDrafts[i]) batchDrafts[i][column.dataField] = event.target.value; } },
              }),
            ],
          })
        );
      });
      if (showActions) {
        rowChildren.push(
          el('div', {
            className: 'actions-cell row-layout-center-center',
            children: [
              el('button', {
                className: 'row-action-button row-action-delete',
                attrs: { type: 'button', title: 'Delete row', 'aria-label': 'Delete row' },
                html: DELETE_ICON,
                on: { click: () => onRowDelete(item) },
              }),
            ],
          })
        );
      }
    } else if (isEditingThis) {
      columns.forEach((column, j) => {
        rowChildren.push(
          el('div', {
            className: cellClass(j, columns, showActions, bodyColumnLines),
            children: [
              el('input', {
                className: 'inline-edit-input',
                attrs: { type: 'text' },
                props: { value: editDraft[column.dataField] ?? '' },
                on: { input: event => { editDraft[column.dataField] = event.target.value; } },
              }),
            ],
          })
        );
      });
      if (showActions) {
        rowChildren.push(
          el('div', {
            className: 'actions-cell row-layout-center-center',
            children: [
              el('button', {
                className: 'row-action-button row-action-save',
                attrs: { type: 'button', title: 'Save row', 'aria-label': 'Save row' },
                html: SAVE_ICON,
                on: { click: onSaveEditClick },
              }),
              el('button', {
                className: 'row-action-button',
                attrs: { type: 'button', title: 'Cancel', 'aria-label': 'Cancel' },
                html: CANCEL_ICON,
                on: { click: onCancelEditClick },
              }),
            ],
          })
        );
      }
    } else {
      columns.forEach((column, j) => {
        rowChildren.push(
          el('div', { className: cellClass(j, columns, showActions, bodyColumnLines), text: item[column.dataField] === null || item[column.dataField] === undefined ? '' : String(item[column.dataField]) })
        );
      });
      if (showActions) {
        rowChildren.push(
          el('div', {
            className: 'actions-cell row-layout-center-center',
            children: [
              el('button', {
                className: 'row-action-button',
                attrs: { type: 'button', title: 'Edit row', 'aria-label': 'Edit row' },
                html: EDIT_ICON,
                on: { click: event => onEditClick(item, event, props) },
              }),
              el('button', {
                className: 'row-action-button row-action-delete',
                attrs: { type: 'button', title: 'Delete row', 'aria-label': 'Delete row' },
                html: DELETE_ICON,
                on: { click: () => onRowDelete(item) },
              }),
            ],
          })
        );
      }
    }

    return el('div', {
      className: rowClass,
      on: dragDropRows
        ? {
            dragover: event => { event.preventDefault(); dragOverRow = item; renderCurrent(); },
            dragleave: () => { if (dragOverRow === item) { dragOverRow = null; renderCurrent(); } },
            drop: event => {
              event.preventDefault();
              if (draggedRow) onRowMove(draggedRow, item);
              dragOverRow = null;
              draggedRow = null;
            },
          }
        : undefined,
      children: [el('div', { className: 'full-row row-layout', children: rowChildren })],
    });
  }

  function buildBatchNewRow(draft, i, props) {
    const { columns, tableBorder, showActions, showIndex, dragDropRows, bodyColumnLines } = props;
    const indexCellClass = 'index-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
    const dragCellClass = 'drag-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
    const cells = [];
    if (dragDropRows) {
      cells.push(el('div', { className: dragCellClass }));
    }
    if (showIndex) {
      cells.push(el('div', { className: indexCellClass }));
    }
    columns.forEach((column, j) => {
      cells.push(
        el('div', {
          className: cellClass(j, columns, showActions, bodyColumnLines),
          children: [
            el('input', {
              className: 'inline-edit-input',
              attrs: { type: 'text' },
              props: { value: draft[column.dataField] ?? '' },
              on: { input: event => { draft[column.dataField] = event.target.value; } },
            }),
          ],
        })
      );
    });
    if (showActions) {
      cells.push(
        el('div', {
          className: 'actions-cell row-layout-center-center',
          children: [
            el('button', {
              className: 'row-action-button row-action-delete',
              attrs: { type: 'button', title: 'Remove row', 'aria-label': 'Remove row' },
              html: DELETE_ICON,
              on: { click: () => { batchNewDrafts = batchNewDrafts.filter((_, idx) => idx !== i); renderCurrent(); } },
            }),
          ],
        })
      );
    }
    return el('div', {
      className: 'full-row' + (tableBorder ? ' row-style' : '') + ' row-style-bottom',
      children: [el('div', { className: 'full-row row-layout', children: cells })],
    });
  }

  function onEditClick(row, event, props) {
    event.stopPropagation();
    if (props.gridMode === 'row') {
      editingRow = row;
      editDraft = toDraft(row, props.columns);
      renderCurrent();
    } else {
      props.onRowEdit(row);
    }
  }

  async function onSaveEditClick() {
    const confirmed = await lastProps.onRequestConfirm('Confirm save', 'Are you sure you want to save the changes to this row?');
    if (confirmed) {
      const updated = { ...editingRow, ...editDraft };
      lastProps.onBatchRowSave({ original: editingRow, updated });
      editingRow = null;
      renderCurrent();
    }
  }

  function onCancelEditClick() {
    editingRow = null;
    renderCurrent();
  }

  async function onSaveAddClick() {
    const confirmed = await lastProps.onRequestConfirm('Confirm add', 'Are you sure you want to add this row?');
    if (confirmed) {
      lastProps.onBatchRowAdd({ ...addDraft });
      isAddingRow = false;
      renderCurrent();
    }
  }

  function onCancelAddClick() {
    isAddingRow = false;
    renderCurrent();
  }

  function saveBatch() {
    const updated = [];
    lastProps.data.forEach((row, i) => {
      const draft = batchDrafts[i];
      if (!draft) {
        return;
      }
      const isDirty = lastProps.columns.some(column => String(row[column.dataField] ?? '') !== draft[column.dataField]);
      if (isDirty) {
        updated.push({ original: row, updated: { ...row, ...draft } });
      }
    });
    const added = batchNewDrafts.map(draft => ({ ...draft }));
    batchNewDrafts = [];
    lastProps.onBatchCommit({ added, updated });
  }

  function startAddingRow() {
    isAddingRow = true;
    addDraft = {};
    for (const column of lastProps.columns) {
      addDraft[column.dataField] = '';
    }
    renderCurrent();
  }

  function addBatchRow() {
    batchNewDrafts = [...batchNewDrafts, toDraft({}, lastProps.columns)];
    renderCurrent();
  }

  function render(container, props) {
    containerEl = container;
    lastProps = props;

    if (props.gridMode === 'batch') {
      syncBatchDrafts(props.data, props.columns);
    }

    clear(container);
    const rows = [];
    if (isAddingRow) {
      rows.push(buildAddRow(props));
    }
    props.data.forEach((item, i) => rows.push(buildDataRow(item, i, props)));
    if (props.gridMode === 'batch') {
      batchNewDrafts.forEach((draft, i) => rows.push(buildBatchNewRow(draft, i, props)));
    }
    container.appendChild(el('div', { className: 'column-layout full-row', children: rows }));
  }

  return { render, startAddingRow, addBatchRow, saveBatch };
}
