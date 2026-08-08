<script setup lang="ts">
import { ref } from 'vue';
import type { IColumn } from '../models/rsDataGrid.models';

const props = defineProps<{
  open: boolean;
  columns: IColumn[];
  selected: string[];
  theme?: 'dark' | 'light';
}>();

const emit = defineEmits<{
  'update:selected': [next: string[]];
  close: [];
}>();

const draggedField = ref<string | null>(null);
const dragOverField = ref<string | null>(null);

const captionFor = (field: string): string => props.columns.find(column => column.dataField === field)?.caption ?? field;

const onSelectChange = (value: string[]) => {
  emit('update:selected', value);
};

const removeColumn = (dataField: string) => {
  emit('update:selected', props.selected.filter(field => field !== dataField));
};

const moveSelected = (fromField: string, toField: string) => {
  if (fromField === toField) {
    return;
  }
  const fromIndex = props.selected.indexOf(fromField);
  const toIndexOriginal = props.selected.indexOf(toField);
  if (fromIndex === -1 || toIndexOriginal === -1) {
    return;
  }
  const next = props.selected.slice();
  next.splice(fromIndex, 1);
  let insertAt = next.indexOf(toField);
  if (fromIndex < toIndexOriginal) {
    insertAt += 1;
  }
  next.splice(insertAt, 0, fromField);
  emit('update:selected', next);
};
</script>

<template>
  <v-dialog :model-value="open" max-width="480" @update:model-value="value => !value && emit('close')">
    <v-card :data-rg-theme="theme ?? 'light'">
      <v-card-title>Grid Settings</v-card-title>
      <v-card-text>
        <div class="grid-settings-section">
          <div class="grid-settings-hint">Pick which columns to show. Nothing selected shows every column.</div>
          <v-select
            :model-value="selected"
            @update:model-value="onSelectChange"
            :items="columns"
            item-title="caption"
            item-value="dataField"
            label="Columns"
            variant="outlined"
            density="compact"
            multiple
            chips
            closable-chips
          ></v-select>
        </div>
        <div v-if="selected.length > 0" class="grid-settings-section">
          <div class="grid-settings-heading">Visible order</div>
          <div class="grid-settings-hint">Drag to reorder.</div>
          <div class="grid-settings-chip-row">
            <v-chip
              v-for="field in selected"
              :key="field"
              color="primary"
              variant="flat"
              closable
              class="grid-settings-drag-chip"
              :class="{ 'grid-settings-drag-chip-over': dragOverField === field }"
              draggable="true"
              @click:close="removeColumn(field)"
              @dragstart="draggedField = field"
              @dragend="() => { draggedField = null; dragOverField = null; }"
              @dragover.prevent="dragOverField = field"
              @dragleave="dragOverField = dragOverField === field ? null : dragOverField"
              @drop.prevent="() => { if (draggedField) moveSelected(draggedField, field); dragOverField = null; draggedField = null; }"
            >
              {{ captionFor(field) }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn v-if="selected.length > 0" variant="text" @click="emit('update:selected', [])">Clear</v-btn>
        <v-btn variant="flat" color="primary" @click="emit('close')">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped src="./dialogs.scss"></style>
