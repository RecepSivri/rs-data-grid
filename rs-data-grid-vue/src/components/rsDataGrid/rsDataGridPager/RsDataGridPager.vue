<script setup lang="ts">
import { onMounted, watch } from 'vue';
import type { DataGridStoreApi } from '../store/useDataGridStore';

const props = defineProps<{
  pagination: boolean;
  pagingSizes: number[];
  currentPagingSize: number;
  pageListSize: number;
  store: DataGridStoreApi;
}>();

onMounted(() => {
  props.store.changePageListSize(props.pageListSize);
  props.store.changePageSize(props.currentPagingSize);
});

watch(
  () => props.pageListSize,
  value => props.store.changePageListSize(value)
);

watch(
  () => props.currentPagingSize,
  value => {
    props.store.changePageNumber(0);
    props.store.changePageSize(value);
  }
);

const changeCurrentPaginationSize = (val: number) => {
  props.store.changePageNumber(0);
  props.store.changePageSize(val);
};

const setpage = (index: number) => props.store.changePageNumber(index);
const increasePager = () => props.store.increasePageNum();
const decreasePager = () => props.store.decreasePageNum();
const lastPage = () => props.store.lastPageNum();

const writeAS = (pageFirstItem: any, pageListSize: any, pageLimit: any) => (pageFirstItem + pageListSize > pageLimit ? false : true);
</script>

<template>
  <div v-if="pagination" class="full-row row-layout-space-between-center pager-row">
    <div class="row-layout-start page-number-background">
      <div class="page-numbers" @click="decreasePager">{{ '<' }}</div>
      <div
        v-for="page in store.pageList"
        :key="page"
        class="page-numbers"
        :class="{ 'page-numbers-selected': store.pageNumber === page - 1 }"
        @click="setpage(page - 1)"
      >
        {{ page }}
      </div>
      <div v-if="writeAS(store.pageList?.[0], pageListSize, store.pageLimit)" class="page-numbers" @click="lastPage">
        {{ store.pageLimit }}
      </div>
      <div class="page-numbers" @click="increasePager">{{ '>' }}</div>
    </div>
    <div class="row-layout">
      <button
        v-for="item in pagingSizes"
        :key="item"
        type="button"
        class="pager-size"
        :class="{ 'page-selected': item === store.pageSize }"
        @click="changeCurrentPaginationSize(item)"
      >
        {{ item }}
      </button>
    </div>
  </div>
</template>

<style scoped src="./RsDataGridPager.scss"></style>
