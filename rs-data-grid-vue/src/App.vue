<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RsDataGrid } from 'rs-data-grid-vue';

// single-spa hands this component more than the props we declare below (its
// own internal props like `singleSpa`/`mountParcel`). Without this, Vue's
// fallthrough-attrs behavior tries to setAttribute() those onto the root
// <div>, which crashes on non-primitive values.
defineOptions({ inheritAttrs: false });

// Used only when this app is run standalone (`npm run dev`), outside the
// single-spa root-config that would normally supply gridConfig via props.
const defaultGridConfig: Record<string, any> = {
  theme: 'light',
  fetchUrl: 'https://gist.githubusercontent.com/Strift/1524ab5e2015e50bbcb215fb4d950a38/raw/movies-lite.json',
  apiMethod: 'GET',
  apiHeaders: {},
  authToken: '',
  entrySection: '',
  remoteMode: false,
  dataSource: [],
  headerRowLines: true,
  headerColumnLines: true,
  bodyRowLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusTop: true,
  borderRadiusBottom: false,
  diagonalRow: true,
  dragDropColumns: false,
  dragDropRows: false,
  pagination: true,
  pagingSizes: [10, 20, 50, 70, 100],
  showFilter: true,
  showSort: true,
  showSearch: true,
  showActions: true,
  showAdd: true,
  showGridSettings: true,
  showIndex: false,
  exportExcel: true,
  exportPDF: true,
  currentPagingSize: 10,
  pageListSize: 5,
  gridMode: 'popup',
};

const props = defineProps<{
  gridConfig?: Record<string, any>;
  fetchNonce?: number;
  onRowAdd?: (row: any) => void;
  onRowEdit?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  onBatchSave?: (payload: { added: any[]; updated: { original: any; updated: any }[] }) => void;
}>();

const gridRef = ref<InstanceType<typeof RsDataGrid> | null>(null);
const config = computed(() => props.gridConfig ?? defaultGridConfig);

// watch() without { immediate: true } never fires for the prop's initial
// value -- only for genuine subsequent changes -- so no separate "skip the
// first call" flag is needed here (one used to exist and incorrectly ate
// the very first real Fetch click after every page load).
watch(
  () => props.fetchNonce,
  nonce => {
    if (nonce === undefined) return;
    gridRef.value?.fetchNow();
  }
);
</script>

<template>
  <div style="width: 100%; min-height: 100vh; margin: 0" :style="{ background: config.theme === 'light' ? '#ffffff' : '#1c1e21' }">
    <RsDataGrid
      ref="gridRef"
      :theme="config.theme"
      :fetch-url="config.fetchUrl"
      :fetch-method="config.apiMethod"
      :fetch-headers="config.apiHeaders"
      :auth-token="config.authToken"
      :entry-section="config.entrySection"
      :remote-mode="config.remoteMode"
      :data-source="config.dataSource"
      :header-row-lines="config.headerRowLines"
      :header-column-lines="config.headerColumnLines"
      :show-filter="config.showFilter"
      :show-sort="config.showSort"
      :show-search="config.showSearch"
      :show-actions="config.showActions"
      :show-add="config.showAdd"
      :show-grid-settings="config.showGridSettings"
      :show-index="config.showIndex"
      :grid-mode="config.gridMode"
      :export-excel="config.exportExcel"
      :exportPDF="config.exportPDF"
      :body-row-lines="config.bodyRowLines"
      :body-column-lines="config.bodyColumnLines"
      :table-border="config.tableBorder"
      :border-radius-top="config.borderRadiusTop"
      :border-radius-bottom="config.borderRadiusBottom"
      :diagonal-row="config.diagonalRow"
      :drag-drop-columns="config.dragDropColumns"
      :drag-drop-rows="config.dragDropRows"
      :pagination="config.pagination"
      :paging-sizes="config.pagingSizes"
      :current-paging-size="config.currentPagingSize"
      :page-list-size="config.pageListSize"
      @row-add="props.onRowAdd"
      @row-edit="props.onRowEdit"
      @row-delete="props.onRowDelete"
      @batch-save="props.onBatchSave"
    />
  </div>
</template>

<style scoped src="./App.scss"></style>
