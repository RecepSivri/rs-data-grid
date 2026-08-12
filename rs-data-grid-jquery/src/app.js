// Port of App.tsx -- the standalone/single-spa adapter layer. Maps the
// shell's gridConfig object onto the grid component's props and watches
// fetchNonce (skip-first, only react to genuine changes -- not every
// unrelated settings push) to trigger a manual refetch.
import { createGrid } from 'rs-data-grid-jquery';
import { defaultGridConfig } from './defaultGridConfig.js';

const noop = () => {};

function toGridProps(props) {
  const gridConfig = props.gridConfig ?? defaultGridConfig;
  return {
    theme: gridConfig.theme,
    fetchUrl: gridConfig.fetchUrl,
    fetchMethod: gridConfig.apiMethod,
    fetchHeaders: gridConfig.apiHeaders,
    authToken: gridConfig.authToken,
    entrySection: gridConfig.entrySection,
    remoteMode: gridConfig.remoteMode,
    dataSource: gridConfig.dataSource,
    defaultVisibleColumns: gridConfig.defaultVisibleColumns,
    headerRowLines: gridConfig.headerRowLines,
    headerColumnLines: gridConfig.headerColumnLines,
    showFilter: gridConfig.showFilter,
    showSort: gridConfig.showSort,
    showSearch: gridConfig.showSearch,
    showActions: gridConfig.showActions,
    showAdd: gridConfig.showAdd,
    showGridSettings: gridConfig.showGridSettings,
    showIndex: gridConfig.showIndex,
    gridMode: gridConfig.gridMode,
    exportExcel: gridConfig.exportExcel,
    exportPDF: gridConfig.exportPDF,
    onRowAdd: props.onRowAdd ?? noop,
    onRowEdit: props.onRowEdit ?? noop,
    onRowDelete: props.onRowDelete ?? noop,
    onBatchSave: props.onBatchSave ?? noop,
    bodyRowLines: gridConfig.bodyRowLines,
    bodyColumnLines: gridConfig.bodyColumnLines,
    tableBorder: gridConfig.tableBorder,
    borderRadiusTop: gridConfig.borderRadiusTop,
    borderRadiusBottom: gridConfig.borderRadiusBottom,
    diagonalRow: gridConfig.diagonalRow,
    dragDropColumns: gridConfig.dragDropColumns,
    dragDropRows: gridConfig.dragDropRows,
    pagination: gridConfig.pagination,
    pagingSizes: gridConfig.pagingSizes,
    currentPagingSize: gridConfig.currentPagingSize,
    pageListSize: gridConfig.pageListSize,
  };
}

export function createApp() {
  const grid = createGrid();
  let wrapperEl = null;
  let lastFetchNonce;

  // mount() already seeds lastFetchNonce with whatever value fetchNonce
  // starts at, so any later value that differs from it is by definition a
  // genuine change -- no separate "skip the first call" flag needed (one
  // used to exist here and, combined with this same lastFetchNonce check,
  // silently ate the very first real Fetch click after every page load).
  function handleFetchNonce(props) {
    if (props.fetchNonce === undefined || props.fetchNonce === lastFetchNonce) {
      return;
    }
    lastFetchNonce = props.fetchNonce;
    grid.fetchNow();
  }

  function mount(container, props) {
    wrapperEl = document.createElement('div');
    wrapperEl.style.width = '100%';
    wrapperEl.style.minHeight = '100vh';
    wrapperEl.style.margin = '0';
    container.appendChild(wrapperEl);
    lastFetchNonce = props.fetchNonce;
    const gridProps = toGridProps(props);
    wrapperEl.style.background = gridProps.theme === 'light' ? '#ffffff' : '#1c1e21';
    grid.render(wrapperEl, gridProps);
  }

  function update(props) {
    handleFetchNonce(props);
    const gridProps = toGridProps(props);
    wrapperEl.style.background = gridProps.theme === 'light' ? '#ffffff' : '#1c1e21';
    grid.render(wrapperEl, gridProps);
  }

  function unmount() {
    grid.destroy();
    if (wrapperEl && wrapperEl.parentNode) {
      wrapperEl.parentNode.removeChild(wrapperEl);
    }
    wrapperEl = null;
  }

  return { mount, update, unmount };
}
