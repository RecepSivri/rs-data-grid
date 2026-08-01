<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { IColumn, GridMode } from '../models/rsDataGrid.models';

const props = defineProps<{
  columns: IColumn[];
  data: any[];
  bodyRowLines: boolean;
  bodyColumnLines: boolean;
  tableBorder: boolean;
  borderRadiusBottom: boolean;
  diagonalRow: boolean;
  showActions: boolean;
  gridMode: GridMode;
  onRequestConfirm: (title: string, message: string) => Promise<boolean>;
}>();

const emit = defineEmits<{
  rowEdit: [row: any];
  rowDelete: [row: any];
  batchRowSave: [payload: { original: any; updated: any }];
  batchRowAdd: [row: any];
}>();

const editingRow = ref<any>(null);
const editDraft = reactive<Record<string, string>>({});
const isAddingRow = ref(false);
const addDraft = reactive<Record<string, string>>({});

const clearDraft = (draft: Record<string, string>) => {
  Object.keys(draft).forEach(key => delete draft[key]);
};

const startAddingRow = () => {
  isAddingRow.value = true;
  clearDraft(addDraft);
  for (const column of props.columns) {
    addDraft[column.dataField] = '';
  }
};

defineExpose({ startAddingRow });

const startEditingRow = (row: any) => {
  editingRow.value = row;
  clearDraft(editDraft);
  for (const column of props.columns) {
    const value = row[column.dataField];
    editDraft[column.dataField] = value === null || value === undefined ? '' : String(value);
  }
};

const onEditClick = (row: any, event: MouseEvent) => {
  event.stopPropagation();
  if (props.gridMode === 'batch') {
    startEditingRow(row);
  } else {
    emit('rowEdit', row);
  }
};

const onSaveEditClick = async () => {
  const confirmed = await props.onRequestConfirm('Confirm save', 'Are you sure you want to save the changes to this row?');
  if (confirmed) {
    const updated = { ...editingRow.value, ...editDraft };
    emit('batchRowSave', { original: editingRow.value, updated });
    editingRow.value = null;
  }
};

const onCancelEditClick = () => {
  editingRow.value = null;
};

const onSaveAddClick = async () => {
  const confirmed = await props.onRequestConfirm('Confirm add', 'Are you sure you want to add this row?');
  if (confirmed) {
    emit('batchRowAdd', { ...addDraft });
    isAddingRow.value = false;
  }
};

const onCancelAddClick = () => {
  isAddingRow.value = false;
};

const cellBorderRight = (j: number) => props.bodyColumnLines && (j < props.columns.length - 1 || props.showActions);

const rowClass = (i: number) => ({
  'row-style': props.tableBorder,
  'row-style-bottom': (props.tableBorder && i === props.data.length - 1) || (props.bodyRowLines && i !== props.data.length - 1),
  'border-area-small': props.borderRadiusBottom && i === props.data.length - 1,
  'row-background': i % 2 === 1 && props.diagonalRow,
});
</script>

<template>
  <div class="column-layout full-row">
    <div v-if="isAddingRow" class="full-row" :class="{ 'row-style': tableBorder, 'row-style-bottom': true }">
      <div class="full-row row-layout">
        <div
          v-for="(column, j) in columns"
          :key="column.dataField"
          class="full-row section-style row-layout-center-center"
          :class="{ 'border-right': cellBorderRight(j) }"
        >
          <input type="text" class="inline-edit-input" v-model="addDraft[column.dataField]" />
        </div>
        <div v-if="showActions" class="actions-cell row-layout-center-center">
          <button type="button" class="row-action-button row-action-save" title="Save row" aria-label="Save row" @click="onSaveAddClick">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#1f7a3d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v5h8" />
            </svg>
          </button>
          <button type="button" class="row-action-button" title="Cancel" aria-label="Cancel" @click="onCancelAddClick">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div v-for="(item, i) in data" :key="i" class="full-row" :class="rowClass(i)">
      <div class="full-row row-layout">
        <template v-if="item === editingRow">
          <div
            v-for="(column, j) in columns"
            :key="column.dataField"
            class="full-row section-style row-layout-center-center"
            :class="{ 'border-right': cellBorderRight(j) }"
          >
            <input type="text" class="inline-edit-input" v-model="editDraft[column.dataField]" />
          </div>
          <div v-if="showActions" class="actions-cell row-layout-center-center">
            <button type="button" class="row-action-button row-action-save" title="Save row" aria-label="Save row" @click="onSaveEditClick">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#1f7a3d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </button>
            <button type="button" class="row-action-button" title="Cancel" aria-label="Cancel" @click="onCancelEditClick">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(column, j) in columns"
            :key="column.dataField"
            class="full-row section-style row-layout-center-center"
            :class="{ 'border-right': cellBorderRight(j) }"
          >
            {{ item[column.dataField] }}
          </div>
          <div v-if="showActions" class="actions-cell row-layout-center-center">
            <button type="button" class="row-action-button" title="Edit row" aria-label="Edit row" @click="onEditClick(item, $event)">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
            <button type="button" class="row-action-button" title="Delete row" aria-label="Delete row" @click="emit('rowDelete', item)">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#b3261e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped src="./RsDataGridTable.scss"></style>
