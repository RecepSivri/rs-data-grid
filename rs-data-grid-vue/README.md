# rs-data-grid-vue

A configurable data grid component for Vue — filtering, sorting, pagination,
inline/popup/batch editing, drag-and-drop rows/columns, and Excel/PDF export.

## Install

```bash
npm install rs-data-grid-vue
```

`vue` (^3.5.40) and `vuetify` (^4.1.7) are peer dependencies — install them in
your app if you haven't already. Vuetify must be registered as an app-level
plugin; the grid renders its dialogs/inputs through your app's own Vuetify
instance rather than bundling one of its own.

```ts
// main.ts
import { createApp } from 'vue';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import App from './App.vue';

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
});

createApp(App).use(vuetify).mount('#app');
```

## Usage

```vue
<script setup lang="ts">
import { RsDataGrid } from 'rs-data-grid-vue';
</script>

<template>
  <RsDataGrid
    theme="light"
    fetch-url="https://api.example.com/items"
    :pagination="true"
    :show-filter="true"
    :show-sort="true"
    :show-search="true"
    grid-mode="popup"
  />
</template>
```

No separate CSS import is needed — styles are bundled with the component.

## Data

Provide data either by URL (`fetch-url`, fetched with `fetch-method`/`fetch-headers`/`auth-token`)
or directly via `data-source`. Columns are inferred from the data's own keys
unless you pass an explicit `columns` array (`{ dataField, caption }[]`).

## Key props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `fetch-url` / `data-source` | `string` / `any[]` | — | Where the grid gets its rows |
| `columns` | `IColumn[]` | inferred | Explicit column list |
| `grid-mode` | `'popup' \| 'row' \| 'batch'` | `'popup'` | Add/edit interaction style |
| `pagination` | `boolean` | `false` | Enable paging |
| `show-filter` / `show-sort` / `show-search` | `boolean` | `false` | Toolbar/header features |
| `drag-drop-rows` / `drag-drop-columns` | `boolean` | `false` | Enable drag-to-reorder |
| `export-excel` / `exportPDF` | `boolean` | `false` | Toolbar export buttons — bind `exportPDF` in camelCase, not kebab-case |
| `@row-add` / `@row-edit` / `@row-delete` / `@batch-save` | `(row) => void` | — | CRUD events |

See `RsDataGridProps` in the shipped type declarations for the full list.

## License

MIT
