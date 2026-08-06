// Port of App.tsx -- the standalone/single-spa adapter layer. Maps the
// shell's gridConfig object onto the grid component's props and watches
// fetchNonce (skip-first, only react to genuine changes -- not every
// unrelated settings push) to trigger a manual refetch.
import { createGrid } from './rsDataGrid/rsDataGrid.js';
import { defaultGridConfig } from './defaultGridConfig.js';

const noop = () => {};

function toGridProps(props) {
  const gridConfig = props.gridConfig ?? defaultGridConfig;
  return {
    fetchUrl: gridConfig.fetchUrl,
    fetchMethod: gridConfig.apiMethod,
    fetchHeaders: gridConfig.apiHeaders,
    authToken: gridConfig.authToken,
    entrySection: gridConfig.entrySection,
    remoteMode: gridConfig.remoteMode,
    dataSource: gridConfig.dataSource,
    headerRowLines: gridConfig.headerRowLines,
    headerColumnLines: gridConfig.headerColumnLines,
    showFilter: gridConfig.showFilter,
    showSort: gridConfig.showSort,
    showSearch: gridConfig.showSearch,
    showActions: gridConfig.showActions,
    showAdd: gridConfig.showAdd,
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
    pagination: gridConfig.pagination,
    pagingSizes: gridConfig.pagingSizes,
    currentPagingSize: gridConfig.currentPagingSize,
    pageListSize: gridConfig.pageListSize,
  };
}

export function createApp() {
  const grid = createGrid();
  let wrapperEl = null;
  let isFirstFetchNonce = true;
  let lastFetchNonce;

  function handleFetchNonce(props) {
    if (props.fetchNonce === undefined || props.fetchNonce === lastFetchNonce) {
      return;
    }
    lastFetchNonce = props.fetchNonce;
    if (isFirstFetchNonce) {
      isFirstFetchNonce = false;
      return;
    }
    grid.fetchNow();
  }

  function mount(container, props) {
    wrapperEl = document.createElement('div');
    wrapperEl.style.width = '100%';
    wrapperEl.style.minHeight = '100vh';
    wrapperEl.style.margin = '0';
    container.appendChild(wrapperEl);
    lastFetchNonce = props.fetchNonce;
    grid.render(wrapperEl, toGridProps(props));
  }

  function update(props) {
    handleFetchNonce(props);
    grid.render(wrapperEl, toGridProps(props));
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
