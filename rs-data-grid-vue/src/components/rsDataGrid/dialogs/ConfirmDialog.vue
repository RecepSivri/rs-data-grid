<script setup lang="ts">
defineProps<{
  open: boolean;
  title?: string;
  message: string;
  theme?: 'dark' | 'light';
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <v-dialog :model-value="open" max-width="480" @update:model-value="value => !value && emit('cancel')">
    <v-card :data-rg-theme="theme ?? 'dark'">
      <v-card-title>{{ title || 'Confirm' }}</v-card-title>
      <v-card-text>
        <p class="confirm-message">{{ message }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="emit('cancel')">No</v-btn>
        <v-btn variant="flat" color="error" @click="emit('confirm')">Yes</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped src="./dialogs.scss"></style>
