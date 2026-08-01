<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { IColumn } from '../models/rsDataGrid.models';

const props = defineProps<{
  open: boolean;
  row?: any;
  columns?: IColumn[];
}>();

const emit = defineEmits<{
  save: [result: Record<string, any>];
  cancel: [];
}>();

interface EditField {
  key: string;
}

const fields = ref<EditField[]>([]);
const editableRow = reactive<Record<string, string>>({});

watch(
  () => [props.open, props.row, props.columns] as const,
  () => {
    if (!props.open) {
      return;
    }
    const nextFields: EditField[] = [];
    Object.keys(editableRow).forEach(key => delete editableRow[key]);
    if (props.row) {
      for (const [key, value] of Object.entries(props.row)) {
        nextFields.push({ key });
        editableRow[key] = value === null || value === undefined ? '' : String(value);
      }
    } else {
      for (const column of props.columns ?? []) {
        nextFields.push({ key: column.dataField });
        editableRow[column.dataField] = '';
      }
    }
    fields.value = nextFields;
  },
  { immediate: true }
);

const handleSave = () => {
  const result: Record<string, any> = { ...props.row };
  for (const field of fields.value) {
    result[field.key] = editableRow[field.key];
  }
  emit('save', result);
};
</script>

<template>
  <v-dialog :model-value="open" max-width="480" @update:model-value="value => !value && emit('cancel')">
    <v-card>
      <v-card-title>{{ row ? 'Edit row' : 'Add row' }}</v-card-title>
      <v-card-text>
        <div class="edit-form">
          <div class="edit-row" v-for="field in fields" :key="field.key">
            <label class="edit-label">{{ field.key }}</label>
            <input type="text" class="edit-input" v-model="editableRow[field.key]" />
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="emit('cancel')">Cancel</v-btn>
        <v-btn variant="flat" color="primary" @click="handleSave">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped src="./dialogs.scss"></style>
