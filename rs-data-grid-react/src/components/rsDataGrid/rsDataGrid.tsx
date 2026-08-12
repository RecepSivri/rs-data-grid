import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Badge } from '@mui/material';
import './rsDataGrid.scss';
import { IColumn, GridMode, RemoteModeParams } from './models/rsDataGrid.models';
import { useDataGridStore } from './store/useDataGridStore';
import { RsDataGridHeader } from './rsDataGridHeader/rsDataGridHeader';
import { RsDataGridTable, RsDataGridTableHandle } from './rsDataGridTable/rsDataGridTable';
import { RsDataGridPager } from './rsDataGridPager/rsDataGridPager';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { EditRowDialog } from './dialogs/EditRowDialog';
import { GridSettingsDialog } from './dialogs/GridSettingsDialog';

// Stable references for array/object-typed prop defaults. A `= []`/`= {}`
// default in a destructuring parameter is a FRESH literal on every call
// where the caller omits the prop, so every render "changes" -- harmless by
// itself, but rsDataGrid.tsx compares dataSource by reference (`dataSourceRef
// .current !== dataSource`) to detect real prop changes, and a fresh []
// every render makes that check always true. That fires loadData() during
// render on every single render once mounted, which synchronously updates
// state and re-renders, which sees a new [] again -- an infinite render loop
// that only shows up when a consumer doesn't pass dataSource at all (every
// usage in this repo always did, which is why this went unnoticed until a
// real npm-installed consumer without that prop hit it). columns/pagingSizes
// /fetchHeaders don't currently gate anything by reference, but share the
// same "fresh literal by default" shape, so they're pinned here too rather
// than leaving the next dependent effect/memo to silently break the same way.
const EMPTY_ARRAY: never[] = [];
const EMPTY_RECORD: Record<string, never> = {};

// Grid Settings' column selection persists across page reloads (localStorage)
// but resets whenever the underlying data actually changes (a real dataSource
// change or a manual fetch) -- a selection saved against one dataset can
// reference fields that don't exist in the next one, which otherwise filters
// every column out and makes the grid look empty even though rows loaded.
const GRID_SETTINGS_STORAGE_KEY = 'rs-data-grid-selected-columns';

function readPersistedColumnSelection(): string[] {
  try {
    const raw = localStorage.getItem(GRID_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : EMPTY_ARRAY;
  } catch {
    return EMPTY_ARRAY;
  }
}

function persistColumnSelection(next: string[]): void {
  try {
    localStorage.setItem(GRID_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage quota exceeded -- the selection just won't
    // survive a reload, which is a reasonable degradation.
  }
}

export interface RsDataGridProps {
  theme?: 'dark' | 'light';
  headerColumnLines?: boolean;
  fetchUrl?: string;
  fetchMethod?: string;
  fetchHeaders?: Record<string, string>;
  authToken?: string;
  headerRowLines?: boolean;
  bodyRowLines?: boolean;
  bodyColumnLines?: boolean;
  columns?: IColumn[];
  tableBorder?: boolean;
  borderRadiusTop?: boolean;
  borderRadiusBottom?: boolean;
  diagonalRow?: boolean;
  dragDropRows?: boolean;
  dragDropColumns?: boolean;
  pagination?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showSearch?: boolean;
  showActions?: boolean;
  showAdd?: boolean;
  showGridSettings?: boolean;
  showIndex?: boolean;
  gridMode?: GridMode;
  exportExcel?: boolean;
  exportPDF?: boolean;
  pagingSizes?: number[];
  currentPagingSize?: number;
  dataSource?: any[];
  pageListSize?: number;
  entrySection?: string;
  remoteMode?: boolean;
  remoteModeParams?: RemoteModeParams;
  loadingTemplate?: React.ReactNode;
  errorTemplate?: (error: Error) => React.ReactNode;
  emptyTemplate?: React.ReactNode;
  onRowAdd?: (row: any) => void;
  onRowEdit?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  onBatchSave?: (payload: { added: any[]; updated: { original: any; updated: any }[] }) => void;
}

export interface RsDataGridHandle {
  fetchNow: () => void;
}

const titleCase = (value: string): string =>
  value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

export const RsDataGrid = forwardRef<RsDataGridHandle, RsDataGridProps>((props, ref) => {
  const {
    theme = 'light',
    headerColumnLines = true,
    fetchUrl = '',
    fetchMethod = 'GET',
    fetchHeaders = EMPTY_RECORD,
    authToken = '',
    headerRowLines = true,
    bodyRowLines = true,
    bodyColumnLines = true,
    columns = EMPTY_ARRAY,
    tableBorder = true,
    borderRadiusTop = false,
    borderRadiusBottom = false,
    diagonalRow = false,
    dragDropRows = false,
    dragDropColumns = false,
    pagination = false,
    showFilter = false,
    showSort = false,
    showSearch = false,
    showActions = false,
    showAdd = false,
    showGridSettings = true,
    showIndex = false,
    gridMode = 'popup',
    exportExcel = false,
    exportPDF = false,
    pagingSizes = EMPTY_ARRAY,
    currentPagingSize = 10,
    dataSource = EMPTY_ARRAY,
    pageListSize = 5,
    entrySection,
    remoteMode = false,
    remoteModeParams,
    loadingTemplate,
    errorTemplate,
    emptyTemplate,
    onRowAdd,
    onRowEdit,
    onRowDelete,
    onBatchSave,
  } = props;

  const store = useDataGridStore();
  const tableRef = useRef<RsDataGridTableHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [editDialog, setEditDialog] = useState<{ open: boolean; row?: any; columns?: IColumn[] }>({ open: false });
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    resolve?: (value: boolean) => void;
  }>({ open: false, title: '', message: '' });

  const requestConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirmState({ open: true, title, message, resolve });
    });
  }, []);

  const resolveConfirm = (result: boolean) => {
    confirmState.resolve?.(result);
    setConfirmState(s => ({ ...s, open: false }));
  };

  const baseColumns = useMemo<IColumn[]>(() => {
    if (columns.length > 0) {
      return columns;
    }
    const result = Object.keys(Object.assign({}, ...store.rawData));
    return result.map(item => ({ caption: item, dataField: item }));
  }, [columns, store.rawData]);

  // Drag-reordered column order persists across data mutations (which
  // recompute baseColumns from scratch) by keeping only the dataField order,
  // not the columns themselves -- fields no longer present are dropped, new
  // fields land at the end.
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const effectiveColumns = useMemo<IColumn[]>(() => {
    if (columnOrder.length === 0) {
      return baseColumns;
    }
    const byField = new Map(baseColumns.map(column => [column.dataField, column]));
    const ordered: IColumn[] = [];
    for (const field of columnOrder) {
      const column = byField.get(field);
      if (column) {
        ordered.push(column);
        byField.delete(field);
      }
    }
    for (const column of baseColumns) {
      if (byField.has(column.dataField)) {
        ordered.push(column);
      }
    }
    return ordered;
  }, [baseColumns, columnOrder]);

  const onColumnMove = useCallback(
    (fromField: string, toField: string) => {
      const order = effectiveColumns.map(column => column.dataField);
      const fromIndex = order.indexOf(fromField);
      const toIndexOriginal = order.indexOf(toField);
      if (fromIndex === -1 || toIndexOriginal === -1 || fromField === toField) {
        return;
      }
      order.splice(fromIndex, 1);
      let insertAt = order.indexOf(toField);
      if (fromIndex < toIndexOriginal) {
        insertAt += 1;
      }
      order.splice(insertAt, 0, fromField);
      setColumnOrder(order);
    },
    [effectiveColumns]
  );

  const onRowMove = useCallback(
    (fromRow: any, toRow: any) => {
      store.moveRow(fromRow, toRow);
    },
    [store]
  );

  // Column visibility + order picked from the toolbar's Grid Settings dialog.
  // Empty means "show every column" -- this layers on top of the drag-drop
  // columnOrder above rather than replacing it.
  const [gridSettingsOpen, setGridSettingsOpen] = useState(false);
  const [selectedColumnFields, setSelectedColumnFieldsState] = useState<string[]>(readPersistedColumnSelection);
  const setSelectedColumnFields = useCallback((next: string[]) => {
    setSelectedColumnFieldsState(next);
    persistColumnSelection(next);
  }, []);

  const visibleColumns = useMemo<IColumn[]>(() => {
    if (selectedColumnFields.length === 0) {
      return effectiveColumns;
    }
    const byField = new Map(effectiveColumns.map(column => [column.dataField, column]));
    return selectedColumnFields.map(field => byField.get(field)).filter((column): column is IColumn => !!column);
  }, [effectiveColumns, selectedColumnFields]);

  const buildRequestHeaders = useCallback((): Record<string, string> | undefined => {
    const headers: Record<string, string> = { ...(fetchHeaders ?? {}) };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return Object.keys(headers).length > 0 ? headers : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHeaders, authToken]);

  const loadData = useCallback(() => {
    if (remoteMode) {
      const endpoint = new URL(remoteModeParams!.endpoint);
      if (dataSource.length > 0) {
        store.setData(dataSource, true);
      } else {
        store.fetchData(endpoint.href, remoteModeParams!.aliases.data, true, 'size', fetchMethod, buildRequestHeaders());
      }
    } else {
      if (dataSource.length > 0) {
        store.setData(dataSource, false);
      } else if (fetchUrl !== '') {
        store.fetchData(fetchUrl, entrySection, false, undefined, fetchMethod, buildRequestHeaders());
      } else {
        store.setData(dataSource, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteMode, remoteModeParams, dataSource, fetchUrl, entrySection, fetchMethod, buildRequestHeaders]);

  const didMount = useRef(false);
  const isFirstDataSource = useRef(true);
  if (!didMount.current) {
    didMount.current = true;
    loadData();
  }

  const dataSourceRef = useRef(dataSource);
  if (dataSourceRef.current !== dataSource) {
    dataSourceRef.current = dataSource;
    if (isFirstDataSource.current) {
      isFirstDataSource.current = false;
    } else {
      setSelectedColumnFields([]);
      loadData();
    }
  }

  useImperativeHandle(ref, () => ({
    fetchNow: () => {
      setSelectedColumnFields([]);
      loadData();
    },
  }));

  const onFilterChange = (event: { dataField: string; values: string[] }) => store.setFilter(event.dataField, event.values);
  const onSortToggle = (dataField: string) => store.toggleSort(dataField);
  const onGlobalSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => store.setGlobalSearch(event.target.value);

  const onRowEditRequest = (row: any) => setEditDialog({ open: true, row });

  const onAddRowClick = () => {
    if (gridMode === 'row') {
      tableRef.current?.startAddingRow();
      return;
    }
    if (gridMode === 'batch') {
      tableRef.current?.addBatchRow();
      return;
    }
    setEditDialog({ open: true, columns: effectiveColumns });
  };

  const onSaveBatchClick = () => {
    tableRef.current?.saveBatch();
  };

  const onEditDialogSave = (result: Record<string, any>) => {
    if (editDialog.row) {
      store.updateRow(editDialog.row, result);
      onRowEdit?.(result);
    } else {
      store.addRow(result);
      onRowAdd?.(result);
    }
    setEditDialog({ open: false });
  };

  const onEditDialogCancel = () => setEditDialog({ open: false });

  const onRowDeleteRequest = async (row: any) => {
    const confirmed = await requestConfirm('Confirm delete', 'Are you sure you want to delete this row?');
    if (confirmed) {
      store.removeRow(row);
      onRowDelete?.(row);
    }
  };

  const onBatchRowSave = (payload: { original: any; updated: any }) => {
    store.updateRow(payload.original, payload.updated);
    onRowEdit?.(payload.updated);
  };

  const onBatchRowAdd = (row: any) => {
    store.addRow(row);
    onRowAdd?.(row);
  };

  const onBatchCommit = (payload: { added: any[]; updated: { original: any; updated: any }[] }) => {
    for (const { original, updated } of payload.updated) {
      store.updateRow(original, updated);
    }
    for (const row of payload.added) {
      store.addRow(row);
    }
    onBatchSave?.(payload);
  };

  const getDisplayedRows = useCallback((): any[] => {
    const rows = store.data ?? [];
    if (!remoteModeParams && pagination) {
      return rows.slice(store.pageNumber * store.pageSize, (store.pageNumber + 1) * store.pageSize);
    }
    return rows;
  }, [store.data, remoteModeParams, pagination, store.pageNumber, store.pageSize]);

  const getDisplayedCaptions = useCallback((): string[] => visibleColumns.map(column => titleCase(column.caption)), [visibleColumns]);

  const onExportExcelClick = () => {
    const rows = getDisplayedRows();
    const captions = getDisplayedCaptions();
    const mapped = rows.map(row => Object.fromEntries(visibleColumns.map((column, i) => [captions[i], row[column.dataField]])));
    const worksheet = XLSX.utils.json_to_sheet(mapped);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'export.xlsx');
  };

  const onExportPdfClick = () => {
    const rows = getDisplayedRows();
    const doc = new jsPDF({ orientation: 'landscape' });
    autoTable(doc, {
      head: [getDisplayedCaptions()],
      body: rows.map(row => visibleColumns.map(column => String(row[column.dataField] ?? ''))),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [119, 119, 119], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save('export.pdf');
  };

  const data = store.data ?? [];
  const bodyRows = getDisplayedRows();

  return (
    <div ref={rootRef} className={tableBorder ? 'border-area-small' : ''} data-rg-theme={theme}>
      {store.isLoading ? (
        loadingTemplate ?? <div className="grid-state grid-state-loading">Loading...</div>
      ) : store.error ? (
        errorTemplate ? (
          errorTemplate(store.error)
        ) : (
          <div className="grid-state grid-state-error">
            <span className="grid-state-icon">&#9888;</span>
            <span>{store.error?.message || 'Something went wrong while loading data.'}</span>
          </div>
        )
      ) : store.rawData.length === 0 ? (
        emptyTemplate ?? <div className="grid-state grid-state-empty">No data to display.</div>
      ) : (
        <>
          {(showSearch || exportExcel || exportPDF || showAdd || showGridSettings || gridMode === 'batch') && (
            <div className="grid-toolbar">
              {showAdd && (
                <button type="button" className="export-button" title="Add row" aria-label="Add row" onClick={onAddRowClick}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </button>
              )}
              {showGridSettings && (
                <button
                  type="button"
                  className="export-button"
                  title="Grid settings"
                  aria-label="Grid settings"
                  onClick={() => setGridSettingsOpen(true)}
                >
                  <Badge color="primary" variant="dot" invisible={selectedColumnFields.length === 0}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </Badge>
                </button>
              )}
              {gridMode === 'batch' && (
                <button
                  type="button"
                  className="export-button batch-save-button"
                  title="Save batch changes"
                  aria-label="Save batch changes"
                  onClick={onSaveBatchClick}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                </button>
              )}
              {exportExcel && (
                <button type="button" className="export-button" title="Export to Excel" aria-label="Export to Excel" onClick={onExportExcelClick}>
                  <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
                    <rect x="2" y="2" width="32" height="32" rx="5" fill="#1D6F42" />
                    <path d="M10.5 11h3.6l3.4 5.3 3.4-5.3h3.6l-5.1 7 5.1 7h-3.6l-3.4-5.3-3.4 5.3h-3.6l5.1-7z" fill="#ffffff" />
                  </svg>
                </button>
              )}
              {exportPDF && (
                <button type="button" className="export-button" title="Export to PDF" aria-label="Export to PDF" onClick={onExportPdfClick}>
                  <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
                    <rect x="2" y="2" width="32" height="32" rx="5" fill="#e2483d" />
                    <text x="18" y="23" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle">
                      PDF
                    </text>
                  </svg>
                </button>
              )}
              {showSearch && (
                <div className="global-search-wrapper">
                  <span className="global-search-icon">&#128269;</span>
                  <input
                    type="text"
                    className="global-search-input"
                    placeholder="Search..."
                    aria-label="Search all columns"
                    value={store.globalSearch}
                    onChange={onGlobalSearchInput}
                  />
                </div>
              )}
            </div>
          )}
          <div className="grid-scroll-x">
            <RsDataGridHeader
              columns={visibleColumns}
              data={store.rawData}
              headerRowLines={headerRowLines}
              headerColumnLines={headerColumnLines}
              bodyColumnLines={bodyColumnLines}
              tableBorder={tableBorder}
              borderRadiusTop={borderRadiusTop}
              showFilter={showFilter}
              showSort={showSort}
              showActions={showActions}
              showIndex={showIndex}
              dragDropRows={dragDropRows}
              dragDropColumns={dragDropColumns}
              sort={store.sort}
              onFilterChange={onFilterChange}
              onSortToggle={onSortToggle}
              onColumnMove={onColumnMove}
            />
            {data.length === 0 ? (
              <div className="grid-state grid-state-empty grid-state-empty-inline">No matching rows.</div>
            ) : (
              <RsDataGridTable
                ref={tableRef}
                columns={visibleColumns}
                data={bodyRows}
                bodyRowLines={bodyRowLines}
                bodyColumnLines={bodyColumnLines}
                tableBorder={tableBorder}
                borderRadiusBottom={borderRadiusBottom}
                diagonalRow={diagonalRow}
                showActions={showActions}
                showIndex={showIndex}
                dragDropRows={dragDropRows}
                indexOffset={!remoteModeParams && pagination ? store.pageNumber * store.pageSize : 0}
                gridMode={gridMode}
                onRowEdit={onRowEditRequest}
                onRowDelete={onRowDeleteRequest}
                onRowMove={onRowMove}
                onBatchRowSave={onBatchRowSave}
                onBatchRowAdd={onBatchRowAdd}
                onBatchCommit={onBatchCommit}
                onRequestConfirm={requestConfirm}
              />
            )}
          </div>
          <RsDataGridPager pagination={pagination} pagingSizes={pagingSizes} pageListSize={pageListSize} currentPagingSize={currentPagingSize} store={store} />
        </>
      )}
      <EditRowDialog
        open={editDialog.open}
        row={editDialog.row}
        columns={editDialog.columns}
        theme={theme}
        container={rootRef.current}
        onSave={onEditDialogSave}
        onCancel={onEditDialogCancel}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        theme={theme}
        container={rootRef.current}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
      <GridSettingsDialog
        open={gridSettingsOpen}
        columns={effectiveColumns}
        selected={selectedColumnFields}
        theme={theme}
        container={rootRef.current}
        onChange={setSelectedColumnFields}
        onClose={() => setGridSettingsOpen(false)}
      />
    </div>
  );
});
