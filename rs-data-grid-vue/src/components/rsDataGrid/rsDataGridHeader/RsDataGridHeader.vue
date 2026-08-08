<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import type { IColumn, FilterChangeEvent } from '../models/rsDataGrid.models';
import type { SortState } from '../store/dataGridStore';
import { applyFilters } from '../store/dataGridStore';

const props = defineProps<{
  columns: IColumn[];
  data: any[];
  headerRowLines: boolean;
  headerColumnLines: boolean;
  bodyColumnLines: boolean;
  tableBorder: boolean;
  borderRadiusTop: boolean;
  showFilter: boolean;
  showSort: boolean;
  showActions: boolean;
  showIndex: boolean;
  dragDropRows: boolean;
  dragDropColumns: boolean;
  sort: SortState;
}>();

const emit = defineEmits<{
  filterChange: [event: FilterChangeEvent];
  sortToggle: [dataField: string];
  columnMove: [fromField: string, toField: string];
}>();

const titleCase = (value: string): string => value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const openDataField = ref<string | null>(null);
const selectedValues = reactive<Record<string, string[]>>({});
const draggedField = ref<string | null>(null);
const dragOverField = ref<string | null>(null);

const onColumnDragStart = (dataField: string, event: DragEvent) => {
  draggedField.value = dataField;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const onColumnDragEnd = () => {
  draggedField.value = null;
  dragOverField.value = null;
};

const onColumnDragOver = (dataField: string, event: DragEvent) => {
  event.preventDefault();
  dragOverField.value = dataField;
};

const onColumnDrop = (dataField: string, event: DragEvent) => {
  event.preventDefault();
  if (draggedField.value) {
    emit('columnMove', draggedField.value, dataField);
  }
  dragOverField.value = null;
  draggedField.value = null;
};

const closeDropdown = () => {
  openDataField.value = null;
};

onMounted(() => document.addEventListener('click', closeDropdown));
onUnmounted(() => document.removeEventListener('click', closeDropdown));

const openDropdownOptions = computed<string[]>(() => {
  const dataField = openDataField.value;
  if (!dataField) {
    return [];
  }
  const otherFilters = { ...selectedValues };
  delete otherFilters[dataField];
  const rows = applyFilters(props.data, otherFilters);
  const values = new Set<string>();
  for (const row of rows) {
    const value = row?.[dataField];
    if (value !== undefined && value !== null && value !== '') {
      values.add(String(value));
    }
  }
  return Array.from(values).sort();
});

const getOptions = (dataField: string): string[] => (openDataField.value === dataField ? openDropdownOptions.value : []);

const sortDirection = (dataField: string): 'asc' | 'desc' | null => (props.sort.field === dataField ? props.sort.direction : null);

const onSortClick = (dataField: string, event: MouseEvent) => {
  event.stopPropagation();
  emit('sortToggle', dataField);
};

const isOpen = (dataField: string): boolean => openDataField.value === dataField;

const toggleDropdown = (dataField: string, event: MouseEvent) => {
  event.stopPropagation();
  openDataField.value = isOpen(dataField) ? null : dataField;
};

const isSelected = (dataField: string, value: string): boolean => (selectedValues[dataField] ?? []).includes(value);

const selectedCount = (dataField: string): number => (selectedValues[dataField] ?? []).length;

const toggleValue = (dataField: string, value: string, event: Event) => {
  event.stopPropagation();
  const current = selectedValues[dataField] ?? [];
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  selectedValues[dataField] = next;
  emit('filterChange', { dataField, values: next });
};

const clearFilter = (dataField: string, event: MouseEvent) => {
  event.stopPropagation();
  selectedValues[dataField] = [];
  emit('filterChange', { dataField, values: [] });
};
</script>

<template>
  <div>
    <div
      class="full-row row-layout-space-between-center"
      :class="{ 'border-header': tableBorder, 'border-area-small': borderRadiusTop }"
    >
      <div
        v-if="dragDropRows"
        class="drag-header-cell content-style row-layout-center-center"
        :class="{ 'border-right': headerColumnLines }"
      ></div>
      <div
        v-if="showIndex"
        class="index-header-cell content-style row-layout-center-center"
        :class="{ 'border-right': headerColumnLines }"
      >#</div>
      <div
        v-for="(column, i) in columns"
        :key="column.dataField"
        class="full-row content-style row-layout-center-center"
        :class="{ 'border-right': headerColumnLines && (i < columns.length - 1 || showActions), 'column-drag-over': dragDropColumns && dragOverField === column.dataField }"
        @dragover="dragDropColumns ? onColumnDragOver(column.dataField, $event) : undefined"
        @dragleave="dragDropColumns ? (dragOverField = dragOverField === column.dataField ? null : dragOverField) : undefined"
        @drop="dragDropColumns ? onColumnDrop(column.dataField, $event) : undefined"
      >
        <span
          v-if="dragDropColumns"
          class="drag-handle"
          draggable="true"
          :aria-label="'Reorder ' + column.caption"
          @dragstart="onColumnDragStart(column.dataField, $event)"
          @dragend="onColumnDragEnd"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="7" r="1.8" /><circle cx="16" cy="7" r="1.8" /><circle cx="8" cy="17" r="1.8" /><circle cx="16" cy="17" r="1.8" />
          </svg>
        </span>
        <span class="header-caption">{{ titleCase(column.caption) }}</span>
        <button
          v-if="showSort"
          type="button"
          class="sort-toggle"
          :class="{ 'sort-toggle-active': sortDirection(column.dataField) !== null }"
          :aria-label="'Sort ' + column.caption"
          @click="onSortClick(column.dataField, $event)"
        >
          <span v-if="sortDirection(column.dataField) === 'desc'" class="sort-icon sort-icon-active">&#9660;</span>
          <span v-else-if="sortDirection(column.dataField) === 'asc'" class="sort-icon sort-icon-active">&#9650;</span>
          <span v-else class="sort-icon">&#8645;</span>
        </button>
      </div>
      <div v-if="showActions" class="actions-header-cell content-style row-layout-center-center">Actions</div>
    </div>
    <div
      v-if="showFilter && columns.length > 0"
      class="full-row filter-row row-layout-space-between-center"
      :class="{ 'filter-row-border': tableBorder }"
    >
      <div
        v-if="dragDropRows"
        class="drag-header-cell filter-cell row-layout-center-center"
        :class="{ 'border-right': bodyColumnLines }"
      ></div>
      <div
        v-if="showIndex"
        class="index-header-cell filter-cell row-layout-center-center"
        :class="{ 'border-right': bodyColumnLines }"
      ></div>
      <div
        v-for="(column, i) in columns"
        :key="column.dataField"
        class="full-row filter-cell row-layout-center-center"
        :class="{ 'border-right': bodyColumnLines && (i < columns.length - 1 || showActions) }"
      >
        <div class="filter-dropdown" @click.stop>
          <button
            type="button"
            class="filter-toggle"
            :class="{ 'filter-toggle-active': selectedCount(column.dataField) > 0, 'filter-toggle-open': isOpen(column.dataField) }"
            :aria-label="'Filter ' + column.caption"
            @click="toggleDropdown(column.dataField, $event)"
          >
            <span class="filter-toggle-label">{{ titleCase(column.caption) }}</span>
            <span
              v-if="selectedCount(column.dataField) > 0"
              class="filter-count"
              title="Clear filter"
              :aria-label="'Clear filter for ' + column.caption"
              @click="clearFilter(column.dataField, $event)"
            >{{ selectedCount(column.dataField) }}</span>
            <span class="filter-caret" :class="{ 'filter-caret-open': isOpen(column.dataField) }">&#9662;</span>
          </button>
          <div v-if="isOpen(column.dataField)" class="filter-panel">
            <div v-if="getOptions(column.dataField).length === 0" class="filter-empty">No values</div>
            <label
              v-for="option in getOptions(column.dataField)"
              :key="option"
              class="filter-option"
              :class="{ 'filter-option-selected': isSelected(column.dataField, option) }"
            >
              <input
                type="checkbox"
                :checked="isSelected(column.dataField, option)"
                @change="toggleValue(column.dataField, option, $event)"
              />
              <span>{{ option }}</span>
            </label>
            <template v-if="selectedCount(column.dataField) > 0">
              <div class="filter-panel-divider"></div>
              <button type="button" class="filter-clear" @click="clearFilter(column.dataField, $event)">Clear selection</button>
            </template>
          </div>
        </div>
      </div>
      <div v-if="showActions" class="actions-header-cell filter-cell row-layout-center-center"></div>
    </div>
  </div>
</template>

<style scoped src="./RsDataGridHeader.scss"></style>
