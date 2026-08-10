// Public entry point for the npm package build (vite.lib.config.ts). Only
// re-exports what a consumer actually needs to render the grid -- internal
// sub-components (header/table/pager/dialogs/store) stay unexported.
export { default as RsDataGrid } from './components/rsDataGrid/RsDataGrid.vue';
export type { IColumn, FilterChangeEvent, GridMode, RemoteModeParams } from './components/rsDataGrid/models/rsDataGrid.models';
