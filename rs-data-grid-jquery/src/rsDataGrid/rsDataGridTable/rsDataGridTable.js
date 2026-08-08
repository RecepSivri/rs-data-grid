// jQuery port of rsDataGridTable.tsx -- the three CRUD modes (popup/row/batch)
// plus delete. Same row-identity/draft rules as the vanilla version (row
// objects flow by reference, drafts are separate plain objects mutated
// without triggering render()), but action buttons and draft inputs are
// wired via delegated jQuery handlers bound ONCE on the container
// (data-row-index / data-new-index / data-field / data-kind attributes
// identify context) instead of being re-attached to every freshly created
// node on every rebuild -- this is where jQuery genuinely simplifies batch
// mode's many dynamically-created inputs.
import $ from 'jquery';
import { el, clear } from '../domUtil.js';
import { SAVE_ICON, CANCEL_ICON, EDIT_ICON, DELETE_ICON, DRAG_HANDLE_ICON } from '../icons.js';
import './rsDataGridTable.css';

const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i;

function isImageUrl(value) {
  return typeof value === 'string' && IMAGE_URL_PATTERN.test(value);
}

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

  let $container = null;
  let lastProps = null;
  let delegationBound = false;

  function syncBatchDrafts(data, columns) {
    const draftByRow = new Map();
    batchDraftRowRefs.forEach((row, i) => {
      const existing = batchDrafts[i];
      if (existing) {
        draftByRow.set(row, existing);
      }
    });
    batchDrafts = data.map(row => draftByRow.get(row) ?? toDraft(row, columns));
    batchDraftRowRefs = data;
  }

  function renderCurrent() {
    if ($container && lastProps) {
      render($container[0], lastProps);
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
              attrs: { type: 'text', 'data-kind': 'add', 'data-field': column.dataField },
              props: { value: addDraft[column.dataField] ?? '' },
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
            el('button', { className: 'row-action-button row-action-save row-action-save-add', attrs: { type: 'button', title: 'Save row', 'aria-label': 'Save row' }, html: SAVE_ICON }),
            el('button', { className: 'row-action-button row-action-cancel-add', attrs: { type: 'button', title: 'Cancel', 'aria-label': 'Cancel' }, html: CANCEL_ICON }),
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
    const { columns, data, bodyRowLines, bodyColumnLines, tableBorder, borderRadiusBottom, diagonalRow, showActions, showIndex, dragDropRows, indexOffset, gridMode } = props;
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
                attrs: { type: 'text', 'data-kind': 'batch', 'data-field': column.dataField },
                props: { value: batchDrafts[i]?.[column.dataField] ?? '' },
              }),
            ],
          })
        );
      });
      if (showActions) {
        rowChildren.push(
          el('div', { className: 'actions-cell row-layout-center-center', children: [
            el('button', { className: 'row-action-button row-action-delete', attrs: { type: 'button', title: 'Delete row', 'aria-label': 'Delete row' }, html: DELETE_ICON }),
          ] })
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
                attrs: { type: 'text', 'data-kind': 'edit', 'data-field': column.dataField },
                props: { value: editDraft[column.dataField] ?? '' },
              }),
            ],
          })
        );
      });
      if (showActions) {
        rowChildren.push(
          el('div', { className: 'actions-cell row-layout-center-center', children: [
            el('button', { className: 'row-action-button row-action-save row-action-save-edit', attrs: { type: 'button', title: 'Save row', 'aria-label': 'Save row' }, html: SAVE_ICON }),
            el('button', { className: 'row-action-button row-action-cancel-edit', attrs: { type: 'button', title: 'Cancel', 'aria-label': 'Cancel' }, html: CANCEL_ICON }),
          ] })
        );
      }
    } else {
      columns.forEach((column, j) => {
        const value = item[column.dataField];
        rowChildren.push(
          el('div', {
            className: cellClass(j, columns, showActions, bodyColumnLines),
            children: isImageUrl(value) ? [el('img', { className: 'cell-thumbnail', attrs: { src: value, alt: '' } })] : undefined,
            text: isImageUrl(value) ? undefined : value === null || value === undefined ? '' : String(value),
          })
        );
      });
      if (showActions) {
        rowChildren.push(
          el('div', { className: 'actions-cell row-layout-center-center', children: [
            el('button', { className: 'row-action-button row-action-edit', attrs: { type: 'button', title: 'Edit row', 'aria-label': 'Edit row' }, html: EDIT_ICON }),
            el('button', { className: 'row-action-button row-action-delete', attrs: { type: 'button', title: 'Delete row', 'aria-label': 'Delete row' }, html: DELETE_ICON }),
          ] })
        );
      }
    }

    return el('div', { className: rowClass, attrs: { 'data-row-index': String(i) }, children: [el('div', { className: 'full-row row-layout', children: rowChildren })] });
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
              attrs: { type: 'text', 'data-kind': 'batchNew', 'data-field': column.dataField },
              props: { value: draft[column.dataField] ?? '' },
            }),
          ],
        })
      );
    });
    if (showActions) {
      cells.push(
        el('div', { className: 'actions-cell row-layout-center-center', children: [
          el('button', { className: 'row-action-button row-action-delete row-action-remove-new', attrs: { type: 'button', title: 'Remove row', 'aria-label': 'Remove row' }, html: DELETE_ICON }),
        ] })
      );
    }
    return el('div', {
      className: 'full-row' + (tableBorder ? ' row-style' : '') + ' row-style-bottom',
      attrs: { 'data-new-index': String(i) },
      children: [el('div', { className: 'full-row row-layout', children: cells })],
    });
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

  async function onSaveAddClick() {
    const confirmed = await lastProps.onRequestConfirm('Confirm add', 'Are you sure you want to add this row?');
    if (confirmed) {
      lastProps.onBatchRowAdd({ ...addDraft });
      isAddingRow = false;
      renderCurrent();
    }
  }

  function bindDelegation($c) {
    if (delegationBound) {
      return;
    }
    delegationBound = true;

    $c.on('click', '.row-action-edit', function (event) {
      event.stopPropagation();
      const i = Number($(this).closest('[data-row-index]').data('rowIndex'));
      const row = lastProps.data[i];
      if (lastProps.gridMode === 'row') {
        editingRow = row;
        editDraft = toDraft(row, lastProps.columns);
        renderCurrent();
      } else {
        lastProps.onRowEdit(row);
      }
    });

    $c.on('click', '.row-action-delete', function () {
      const i = Number($(this).closest('[data-row-index]').data('rowIndex'));
      lastProps.onRowDelete(lastProps.data[i]);
    });

    $c.on('click', '.row-action-save-edit', onSaveEditClick);
    $c.on('click', '.row-action-cancel-edit', () => { editingRow = null; renderCurrent(); });
    $c.on('click', '.row-action-save-add', onSaveAddClick);
    $c.on('click', '.row-action-cancel-add', () => { isAddingRow = false; renderCurrent(); });
    $c.on('click', '.row-action-remove-new', function () {
      const i = Number($(this).closest('[data-new-index]').data('newIndex'));
      batchNewDrafts = batchNewDrafts.filter((_, idx) => idx !== i);
      renderCurrent();
    });

    // Draft inputs -- mutate the closure-held draft directly, no render()
    // call, exactly like the vanilla version. This is what keeps focus
    // stable while typing regardless of framework/library.
    $c.on('input', '.inline-edit-input', function () {
      const $input = $(this);
      const field = $input.data('field');
      const kind = $input.data('kind');
      const value = $input.val();
      if (kind === 'add') {
        addDraft[field] = value;
      } else if (kind === 'edit') {
        editDraft[field] = value;
      } else if (kind === 'batch') {
        const i = Number($input.closest('[data-row-index]').data('rowIndex'));
        if (batchDrafts[i]) {
          batchDrafts[i][field] = value;
        }
      } else if (kind === 'batchNew') {
        const i = Number($input.closest('[data-new-index]').data('newIndex'));
        if (batchNewDrafts[i]) {
          batchNewDrafts[i][field] = value;
        }
      }
    });

    $c.on('dragstart', '.drag-cell .drag-handle', function (event) {
      const i = Number($(this).closest('[data-row-index]').data('rowIndex'));
      draggedRow = lastProps.data[i];
      $(this).closest('[data-row-index]').addClass('row-dragging');
      if (event.originalEvent && event.originalEvent.dataTransfer) {
        event.originalEvent.dataTransfer.effectAllowed = 'move';
      }
    });
    $c.on('dragend', '.drag-cell .drag-handle', function () {
      draggedRow = null;
      dragOverRow = null;
      renderCurrent();
    });
    // dragover/dragleave fire continuously while hovering, so they toggle the
    // highlight class directly instead of going through renderCurrent()'s
    // full clear()+rebuild -- a synchronous DOM rebuild mid-dispatch of a
    // jQuery-delegated drag event breaks the browser's native drag tracking
    // and silently cancels the drop.
    $c.on('dragover', '[data-row-index]', function (event) {
      event.preventDefault();
      const i = Number($(this).data('rowIndex'));
      const row = lastProps.data[i];
      if (dragOverRow !== row) {
        if (dragOverRow) {
          const prevIndex = lastProps.data.indexOf(dragOverRow);
          $c.find('[data-row-index="' + prevIndex + '"]').removeClass('row-drag-over');
        }
        dragOverRow = row;
        $(this).addClass('row-drag-over');
      }
    });
    $c.on('dragleave', '[data-row-index]', function () {
      const i = Number($(this).data('rowIndex'));
      if (dragOverRow === lastProps.data[i]) {
        dragOverRow = null;
        $(this).removeClass('row-drag-over');
      }
    });
    $c.on('drop', '[data-row-index]', function (event) {
      event.preventDefault();
      const i = Number($(this).data('rowIndex'));
      const row = lastProps.data[i];
      if (draggedRow) {
        lastProps.onRowMove(draggedRow, row);
      }
      dragOverRow = null;
      draggedRow = null;
      renderCurrent();
    });
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
    $container = $(container);
    lastProps = props;
    // Delegation binds to a stable ancestor (see rsDataGrid.js), NOT to
    // `container` itself -- container is a fresh <div> rebuilt on every
    // render, so listeners bound to it would vanish the moment it's replaced.
    bindDelegation($(props.delegationRoot ?? container));

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
