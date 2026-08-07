// Port of rsDataGrid.tsx -- the top-level orchestrator. Owns the store
// instance, the header/table/pager sub-renderers, dialog wiring, data
// loading, and export handlers.
import { el, clear } from './domUtil.js';
import { createDataGridStore } from './store/createDataGridStore.js';
import { createHeader } from './rsDataGridHeader/rsDataGridHeader.js';
import { createTable } from './rsDataGridTable/rsDataGridTable.js';
import { createPager } from './rsDataGridPager/rsDataGridPager.js';
import { requestConfirm } from './dialogs/confirmDialog.js';
import { requestEditRow } from './dialogs/editRowDialog.js';
import { exportExcel, exportPdf } from './exporters.js';
import { titleCase } from './titleCase.js';
import { ADD_ICON, BATCH_SAVE_ICON, EXPORT_EXCEL_ICON, EXPORT_PDF_ICON } from './icons.js';
import './rsDataGrid.css';
import './global.css';

/**
 * Live-typing inputs (currently just the global search box) rebuild the
 * whole region they live in on every keystroke -- unlike edit/batch drafts,
 * search genuinely needs to filter as you type. A full DOM rebuild would
 * otherwise steal focus after every character; this restores it by tagging
 * the input with data-focus-key before clearing and re-selecting it after.
 */
function withFocusPreserved(container, renderFn) {
  const active = document.activeElement;
  let restore = null;
  if (active && container.contains(active) && active.dataset && active.dataset.focusKey) {
    restore = { key: active.dataset.focusKey, start: active.selectionStart, end: active.selectionEnd };
  }
  renderFn();
  if (restore) {
    const next = container.querySelector(`[data-focus-key="${restore.key}"]`);
    if (next) {
      next.focus();
      if (typeof next.setSelectionRange === 'function' && restore.start != null) {
        next.setSelectionRange(restore.start, restore.end);
      }
    }
  }
}

export function createGrid() {
  const store = createDataGridStore();
  const header = createHeader();
  const table = createTable();
  const pager = createPager();

  let containerEl = null;
  let lastProps = null;
  let unsubscribe = null;
  let didMount = false;
  let isFirstDataSource = true;
  let dataSourceRef;

  function buildRequestHeaders(fetchHeaders, authToken) {
    const headers = { ...(fetchHeaders ?? {}) };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  function loadData(props) {
    const { remoteMode = false, remoteModeParams, dataSource = [], fetchUrl = '', entrySection, fetchMethod = 'GET', fetchHeaders, authToken } = props;
    const headers = buildRequestHeaders(fetchHeaders, authToken);
    if (remoteMode) {
      // Faithfully replicates the existing React/Vue/Angular apps: remoteModeParams
      // is never derived from gridConfig, so this throws if it isn't otherwise
      // supplied -- intentional parity, not a bug to silently work around.
      const endpoint = new URL(remoteModeParams.endpoint);
      if (dataSource.length > 0) {
        store.setData(dataSource, true);
      } else {
        store.fetchData(endpoint.href, remoteModeParams.aliases.data, true, 'size', fetchMethod, headers);
      }
    } else {
      if (dataSource.length > 0) {
        store.setData(dataSource, false);
      } else if (fetchUrl !== '') {
        store.fetchData(fetchUrl, entrySection, false, undefined, fetchMethod, headers);
      } else {
        store.setData(dataSource, false);
      }
    }
  }

  function fetchNow() {
    if (lastProps) {
      loadData(lastProps);
    }
  }

  function effectiveColumns(props) {
    const columns = props.columns ?? [];
    if (columns.length > 0) {
      return columns;
    }
    const rawData = store.getSnapshot().rawData;
    const result = Object.keys(Object.assign({}, ...rawData));
    return result.map(item => ({ caption: item, dataField: item }));
  }

  function getDisplayedRows(props) {
    const snapshot = store.getSnapshot();
    const rows = snapshot.data ?? [];
    if (!props.remoteModeParams && props.pagination) {
      return rows.slice(snapshot.pageNumber * snapshot.pageSize, (snapshot.pageNumber + 1) * snapshot.pageSize);
    }
    return rows;
  }

  async function onAddRowClick(props, columns) {
    if (props.gridMode === 'row') {
      table.startAddingRow();
      return;
    }
    if (props.gridMode === 'batch') {
      table.addBatchRow();
      return;
    }
    const result = await requestEditRow({ columns, theme: props.theme });
    if (result) {
      store.addRow(result);
      props.onRowAdd?.(result);
    }
  }

  async function onRowEditRequest(row) {
    const result = await requestEditRow({ row, theme: lastProps.theme });
    if (result) {
      store.updateRow(row, result);
      lastProps.onRowEdit?.(result);
    }
  }

  async function onRowDeleteRequest(row) {
    const confirmed = await requestConfirm('Confirm delete', 'Are you sure you want to delete this row?', lastProps.theme);
    if (confirmed) {
      store.removeRow(row);
      lastProps.onRowDelete?.(row);
    }
  }

  function onBatchRowSave(payload) {
    store.updateRow(payload.original, payload.updated);
    lastProps.onRowEdit?.(payload.updated);
  }

  function onBatchRowAdd(row) {
    store.addRow(row);
    lastProps.onRowAdd?.(row);
  }

  function onBatchCommit(payload) {
    for (const { original, updated } of payload.updated) {
      store.updateRow(original, updated);
    }
    for (const row of payload.added) {
      store.addRow(row);
    }
    lastProps.onBatchSave?.(payload);
  }

  function buildToolbar(props, columns) {
    const { showSearch, exportExcel: showExportExcel, exportPDF: showExportPdf, showAdd, gridMode } = props;
    if (!(showSearch || showExportExcel || showExportPdf || showAdd || gridMode === 'batch')) {
      return null;
    }
    const children = [];
    if (showAdd) {
      children.push(
        el('button', {
          className: 'export-button',
          attrs: { type: 'button', title: 'Add row', 'aria-label': 'Add row' },
          html: ADD_ICON,
          on: { click: () => onAddRowClick(props, columns) },
        })
      );
    }
    if (gridMode === 'batch') {
      children.push(
        el('button', {
          className: 'export-button batch-save-button',
          attrs: { type: 'button', title: 'Save batch changes', 'aria-label': 'Save batch changes' },
          html: BATCH_SAVE_ICON,
          on: { click: () => table.saveBatch() },
        })
      );
    }
    if (showExportExcel) {
      children.push(
        el('button', {
          className: 'export-button',
          attrs: { type: 'button', title: 'Export to Excel', 'aria-label': 'Export to Excel' },
          html: EXPORT_EXCEL_ICON,
          on: { click: () => exportExcel(getDisplayedRows(props), columns) },
        })
      );
    }
    if (showExportPdf) {
      children.push(
        el('button', {
          className: 'export-button',
          attrs: { type: 'button', title: 'Export to PDF', 'aria-label': 'Export to PDF' },
          html: EXPORT_PDF_ICON,
          on: { click: () => exportPdf(getDisplayedRows(props), columns) },
        })
      );
    }
    if (showSearch) {
      children.push(
        el('div', {
          className: 'global-search-wrapper',
          children: [
            el('span', { className: 'global-search-icon', html: '&#128269;' }),
            el('input', {
              className: 'global-search-input',
              attrs: { type: 'text', placeholder: 'Search...', 'aria-label': 'Search all columns', 'data-focus-key': 'global-search' },
              props: { value: store.getSnapshot().globalSearch },
              on: { input: event => store.setGlobalSearch(event.target.value) },
            }),
          ],
        })
      );
    }
    return el('div', { className: 'grid-toolbar', children });
  }

  function renderBody(props) {
    const snapshot = store.getSnapshot();
    if (snapshot.isLoading) {
      return props.loadingTemplate ?? el('div', { className: 'grid-state grid-state-loading', text: 'Loading...' });
    }
    if (snapshot.error) {
      return props.errorTemplate
        ? props.errorTemplate(snapshot.error)
        : el('div', {
            className: 'grid-state grid-state-error',
            children: [el('span', { className: 'grid-state-icon', html: '&#9888;' }), el('span', { text: snapshot.error.message || 'Something went wrong while loading data.' })],
          });
    }
    if ((snapshot.data ?? []).length === 0) {
      return props.emptyTemplate ?? el('div', { className: 'grid-state grid-state-empty', text: 'No data to display.' });
    }

    const columns = effectiveColumns(props);
    const bodyRows = getDisplayedRows(props);
    const toolbar = buildToolbar(props, columns);
    const headerContainer = el('div');
    const tableContainer = el('div');
    const pagerContainer = el('div');

    header.render(headerContainer, {
      columns,
      data: snapshot.rawData,
      headerRowLines: props.headerRowLines,
      headerColumnLines: props.headerColumnLines,
      bodyColumnLines: props.bodyColumnLines,
      tableBorder: props.tableBorder,
      borderRadiusTop: props.borderRadiusTop,
      showFilter: props.showFilter,
      showSort: props.showSort,
      showActions: props.showActions,
      showIndex: props.showIndex,
      sort: snapshot.sort,
      onFilterChange: event => store.setFilter(event.dataField, event.values),
      onSortToggle: dataField => store.toggleSort(dataField),
      // headerContainer is a fresh <div> every renderBody() call -- jQuery's
      // delegated listeners must bind to something that survives across
      // rebuilds, so header.js binds to this stable top-level container
      // instead (bubbling still reaches it from anywhere inside).
      delegationRoot: containerEl,
    });

    table.render(tableContainer, {
      columns,
      data: bodyRows,
      bodyRowLines: props.bodyRowLines,
      bodyColumnLines: props.bodyColumnLines,
      tableBorder: props.tableBorder,
      borderRadiusBottom: props.borderRadiusBottom,
      diagonalRow: props.diagonalRow,
      showActions: props.showActions,
      showIndex: props.showIndex,
      indexOffset: !props.remoteModeParams && props.pagination ? snapshot.pageNumber * snapshot.pageSize : 0,
      gridMode: props.gridMode,
      onRowEdit: onRowEditRequest,
      onRowDelete: onRowDeleteRequest,
      onBatchRowSave,
      onBatchRowAdd,
      onBatchCommit,
      onRequestConfirm: (title, message) => requestConfirm(title, message, props.theme),
      delegationRoot: containerEl,
    });

    pager.render(pagerContainer, {
      pagination: props.pagination,
      pagingSizes: props.pagingSizes ?? [],
      pageListSize: props.pageListSize,
      currentPagingSize: props.currentPagingSize,
      store,
    });

    const scrollContainer = el('div', { className: 'grid-scroll-x', children: [headerContainer, tableContainer] });
    return el('div', { children: [toolbar, scrollContainer, pagerContainer] });
  }

  // renderBody() constructs the header/table/pager subtree, and the pager's
  // OWN first render synchronously calls store.changePageListSize()/
  // changePageSize() (see rsDataGridPager.js) -- both of which call
  // notify() before this renderNow() call has even finished building its
  // wrapper. Without a guard, that reentrant renderNow() would clear+append
  // its own complete tree, and then THIS (outer, still-suspended) call would
  // resume and append its own wrapper on top without re-clearing first --
  // two full grids stacked. isRendering defers any renderNow() that fires
  // while one is already in progress to a single follow-up pass instead.
  let isRendering = false;
  let renderPending = false;

  function renderNow() {
    if (isRendering) {
      renderPending = true;
      return;
    }
    if (!containerEl || !lastProps) {
      return;
    }
    isRendering = true;
    const props = lastProps;
    withFocusPreserved(containerEl, () => {
      clear(containerEl);
      const wrapper = el('div', {
        className: props.tableBorder ? 'border-area-small' : '',
        attrs: { 'data-rg-theme': props.theme ?? 'dark' },
        children: [renderBody(props)],
      });
      containerEl.appendChild(wrapper);
    });
    isRendering = false;
    if (renderPending) {
      renderPending = false;
      renderNow();
    }
  }

  function render(container, props) {
    containerEl = container;
    lastProps = { ...defaultsFor(props), ...props };

    if (!unsubscribe) {
      unsubscribe = store.subscribe(renderNow);
    }

    if (!didMount) {
      didMount = true;
      dataSourceRef = lastProps.dataSource;
      loadData(lastProps);
      return; // loadData's store.setData/fetchData triggers notify() -> renderNow()
    }

    const nextDataSource = lastProps.dataSource;
    if (nextDataSource !== dataSourceRef) {
      dataSourceRef = nextDataSource;
      if (isFirstDataSource) {
        isFirstDataSource = false;
      } else {
        loadData(lastProps);
      }
    }

    renderNow();
  }

  function defaultsFor() {
    return {
      headerColumnLines: true,
      fetchUrl: '',
      fetchMethod: 'GET',
      fetchHeaders: {},
      authToken: '',
      headerRowLines: true,
      bodyRowLines: true,
      bodyColumnLines: true,
      columns: [],
      tableBorder: true,
      borderRadiusTop: false,
      borderRadiusBottom: false,
      diagonalRow: false,
      pagination: false,
      showFilter: false,
      showSort: false,
      showSearch: false,
      showActions: false,
      showAdd: false,
      showIndex: false,
      gridMode: 'popup',
      exportExcel: false,
      exportPDF: false,
      pagingSizes: [],
      currentPagingSize: 10,
      dataSource: [],
      pageListSize: 5,
    };
  }

  function destroy() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    header.destroy();
    containerEl = null;
    lastProps = null;
  }

  return { render, destroy, fetchNow };
}
