<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IColumn, GridMode, RemoteModeParams } from './models/rsDataGrid.models';
import { useDataGridStore } from './store/useDataGridStore';
import RsDataGridHeader from './rsDataGridHeader/RsDataGridHeader.vue';
import RsDataGridTable from './rsDataGridTable/RsDataGridTable.vue';
import RsDataGridPager from './rsDataGridPager/RsDataGridPager.vue';
import ConfirmDialog from './dialogs/ConfirmDialog.vue';
import EditRowDialog from './dialogs/EditRowDialog.vue';

const props = withDefaults(
  defineProps<{
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
    pagination?: boolean;
    showFilter?: boolean;
    showSort?: boolean;
    showSearch?: boolean;
    showActions?: boolean;
    showAdd?: boolean;
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
  }>(),
  {
    headerColumnLines: true,
    fetchUrl: '',
    fetchMethod: 'GET',
    fetchHeaders: () => ({}),
    authToken: '',
    headerRowLines: true,
    bodyRowLines: true,
    bodyColumnLines: true,
    columns: () => [],
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
    gridMode: 'popup',
    exportExcel: false,
    exportPDF: false,
    pagingSizes: () => [],
    currentPagingSize: 10,
    dataSource: () => [],
    pageListSize: 5,
    entrySection: undefined,
    remoteMode: false,
    remoteModeParams: undefined,
  }
);

const emit = defineEmits<{
  rowAdd: [row: any];
  rowEdit: [row: any];
  rowDelete: [row: any];
}>();

const titleCase = (value: string): string => value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const store = useDataGridStore();
const tableRef = ref<InstanceType<typeof RsDataGridTable> | null>(null);

const editDialog = reactive<{ open: boolean; row?: any; columns?: IColumn[] }>({ open: false });
const confirmState = reactive<{
  open: boolean;
  title: string;
  message: string;
  resolve?: (value: boolean) => void;
}>({ open: false, title: '', message: '' });

const requestConfirm = (title: string, message: string): Promise<boolean> => {
  return new Promise<boolean>(resolve => {
    confirmState.open = true;
    confirmState.title = title;
    confirmState.message = message;
    confirmState.resolve = resolve;
  });
};

const resolveConfirm = (result: boolean) => {
  confirmState.resolve?.(result);
  confirmState.open = false;
};

const effectiveColumns = computed<IColumn[]>(() => {
  if (props.columns.length > 0) {
    return props.columns;
  }
  const result = Object.keys(Object.assign({}, ...store.rawData));
  return result.map(item => ({ caption: item, dataField: item }));
});

const buildRequestHeaders = (): Record<string, string> | undefined => {
  const headers: Record<string, string> = { ...(props.fetchHeaders ?? {}) };
  if (props.authToken) {
    headers['Authorization'] = `Bearer ${props.authToken}`;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
};

const loadData = () => {
  if (props.remoteMode) {
    const endpoint = new URL(props.remoteModeParams!.endpoint);
    if (props.dataSource.length > 0) {
      store.setData(props.dataSource, true);
    } else {
      store.fetchData(endpoint.href, props.remoteModeParams!.aliases.data, true, 'size', props.fetchMethod, buildRequestHeaders());
    }
  } else {
    if (props.dataSource.length > 0) {
      store.setData(props.dataSource, false);
    } else if (props.fetchUrl !== '') {
      store.fetchData(props.fetchUrl, props.entrySection, false, undefined, props.fetchMethod, buildRequestHeaders());
    } else {
      store.setData(props.dataSource, false);
    }
  }
};

onMounted(() => loadData());

watch(
  () => props.dataSource,
  () => loadData()
);

defineExpose({ fetchNow: loadData });

const onFilterChange = (event: { dataField: string; values: string[] }) => store.setFilter(event.dataField, event.values);
const onSortToggle = (dataField: string) => store.toggleSort(dataField);
const onGlobalSearchInput = (event: Event) => store.setGlobalSearch((event.target as HTMLInputElement).value);

const onRowEditRequest = (row: any) => {
  editDialog.open = true;
  editDialog.row = row;
  editDialog.columns = undefined;
};

const onAddRowClick = () => {
  if (props.gridMode === 'batch') {
    tableRef.value?.startAddingRow();
    return;
  }
  editDialog.open = true;
  editDialog.row = undefined;
  editDialog.columns = effectiveColumns.value;
};

const onEditDialogSave = (result: Record<string, any>) => {
  if (editDialog.row) {
    store.updateRow(editDialog.row, result);
    emit('rowEdit', result);
  } else {
    store.addRow(result);
    emit('rowAdd', result);
  }
  editDialog.open = false;
};

const onEditDialogCancel = () => {
  editDialog.open = false;
};

const onRowDeleteRequest = async (row: any) => {
  const confirmed = await requestConfirm('Confirm delete', 'Are you sure you want to delete this row?');
  if (confirmed) {
    store.removeRow(row);
    emit('rowDelete', row);
  }
};

const onBatchRowSave = (payload: { original: any; updated: any }) => {
  store.updateRow(payload.original, payload.updated);
  emit('rowEdit', payload.updated);
};

const onBatchRowAdd = (row: any) => {
  store.addRow(row);
  emit('rowAdd', row);
};

const getDisplayedRows = (): any[] => {
  const rows = store.data ?? [];
  if (!props.remoteModeParams && props.pagination) {
    return rows.slice(store.pageNumber * store.pageSize, (store.pageNumber + 1) * store.pageSize);
  }
  return rows;
};

const getDisplayedCaptions = (): string[] => effectiveColumns.value.map(column => titleCase(column.caption));

const onExportExcelClick = () => {
  const rows = getDisplayedRows();
  const captions = getDisplayedCaptions();
  const mapped = rows.map(row => Object.fromEntries(effectiveColumns.value.map((column, i) => [captions[i], row[column.dataField]])));
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
    body: rows.map(row => effectiveColumns.value.map(column => String(row[column.dataField] ?? ''))),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [119, 119, 119], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  doc.save('export.pdf');
};

const data = computed(() => store.data ?? []);
const bodyRows = computed(() => getDisplayedRows());
</script>

<template>
  <div :class="{ 'border-area-small': tableBorder }">
    <template v-if="store.isLoading">
      <slot name="loading"><div class="grid-state grid-state-loading">Loading...</div></slot>
    </template>
    <template v-else-if="store.error">
      <slot name="error" :error="store.error">
        <div class="grid-state grid-state-error">
          <span class="grid-state-icon">&#9888;</span>
          <span>{{ store.error?.message || 'Something went wrong while loading data.' }}</span>
        </div>
      </slot>
    </template>
    <template v-else-if="data.length === 0">
      <slot name="empty"><div class="grid-state grid-state-empty">No data to display.</div></slot>
    </template>
    <template v-else>
      <div v-if="showSearch || exportExcel || exportPDF || showAdd" class="grid-toolbar">
        <button v-if="showAdd" type="button" class="export-button" title="Add row" aria-label="Add row" @click="onAddRowClick">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#333333" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
        <button v-if="exportExcel" type="button" class="export-button" title="Export to Excel" aria-label="Export to Excel" @click="onExportExcelClick">
          <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
            <rect x="2" y="2" width="32" height="32" rx="5" fill="#1D6F42" />
            <path d="M10.5 11h3.6l3.4 5.3 3.4-5.3h3.6l-5.1 7 5.1 7h-3.6l-3.4-5.3-3.4 5.3h-3.6l5.1-7z" fill="#ffffff" />
          </svg>
        </button>
        <button v-if="exportPDF" type="button" class="export-button" title="Export to PDF" aria-label="Export to PDF" @click="onExportPdfClick">
          <svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
            <rect x="2" y="2" width="32" height="32" rx="5" fill="#e2483d" />
            <text x="18" y="23" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">PDF</text>
          </svg>
        </button>
        <div v-if="showSearch" class="global-search-wrapper">
          <span class="global-search-icon">&#128269;</span>
          <input
            type="text"
            class="global-search-input"
            placeholder="Search..."
            aria-label="Search all columns"
            :value="store.globalSearch"
            @input="onGlobalSearchInput"
          />
        </div>
      </div>
      <RsDataGridHeader
        :columns="effectiveColumns"
        :data="store.rawData"
        :header-row-lines="headerRowLines"
        :header-column-lines="headerColumnLines"
        :body-column-lines="bodyColumnLines"
        :table-border="tableBorder"
        :border-radius-top="borderRadiusTop"
        :show-filter="showFilter"
        :show-sort="showSort"
        :show-actions="showActions"
        :sort="store.sort"
        @filter-change="onFilterChange"
        @sort-toggle="onSortToggle"
      />
      <RsDataGridTable
        ref="tableRef"
        :columns="effectiveColumns"
        :data="bodyRows"
        :body-row-lines="bodyRowLines"
        :body-column-lines="bodyColumnLines"
        :table-border="tableBorder"
        :border-radius-bottom="borderRadiusBottom"
        :diagonal-row="diagonalRow"
        :show-actions="showActions"
        :grid-mode="gridMode"
        :on-request-confirm="requestConfirm"
        @row-edit="onRowEditRequest"
        @row-delete="onRowDeleteRequest"
        @batch-row-save="onBatchRowSave"
        @batch-row-add="onBatchRowAdd"
      />
      <RsDataGridPager :pagination="pagination" :paging-sizes="pagingSizes" :page-list-size="pageListSize" :current-paging-size="currentPagingSize" :store="store" />
    </template>
    <EditRowDialog :open="editDialog.open" :row="editDialog.row" :columns="editDialog.columns" @save="onEditDialogSave" @cancel="onEditDialogCancel" />
    <ConfirmDialog
      :open="confirmState.open"
      :title="confirmState.title"
      :message="confirmState.message"
      @confirm="resolveConfirm(true)"
      @cancel="resolveConfirm(false)"
    />
  </div>
</template>

<style scoped src="./RsDataGrid.scss"></style>
