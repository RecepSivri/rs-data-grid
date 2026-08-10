// Public entry point for the npm package build (vite.lib.config.ts). Only
// re-exports the grid's public factory -- internal sub-modules (header/
// table/pager/dialogs/store) stay unexported.
export { createGrid } from './rsDataGrid/rsDataGrid.js';
