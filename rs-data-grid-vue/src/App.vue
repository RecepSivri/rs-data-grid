<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import RsDataGrid from './components/rsDataGrid/RsDataGrid.vue';

// single-spa hands this component more than the props we declare below (its
// own internal props like `singleSpa`/`mountParcel`). Without this, Vue's
// fallthrough-attrs behavior tries to setAttribute() those onto the root
// <div>, which crashes on non-primitive values.
defineOptions({ inheritAttrs: false });

// Used only when this app is run standalone (`npm run dev`), outside the
// single-spa root-config that would normally supply gridConfig via props.
const defaultGridConfig: Record<string, any> = {
  fetchUrl: 'http://universities.hipolabs.com/search?country=United+States',
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
  pagination: true,
  pagingSizes: [10, 20, 50, 70, 100],
  showFilter: true,
  showSort: true,
  showSearch: true,
  showActions: true,
  showAdd: true,
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

let isFirstFetchNonce = true;
watch(
  () => props.fetchNonce,
  nonce => {
    if (nonce === undefined) return;
    if (isFirstFetchNonce) {
      isFirstFetchNonce = false;
      return;
    }
    gridRef.value?.fetchNow();
  }
);
</script>

<template>
  <div style="width: 100%; min-height: 100vh; margin: 0">
    <RsDataGrid
      ref="gridRef"
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
