// Type shapes only (JSDoc, no runtime code) -- mirrors rs-data-grid-react's
// rsDataGrid.models.ts for editor hints.

/**
 * @typedef {Object} IColumn
 * @property {string} caption
 * @property {string} dataField
 */

/**
 * @typedef {Object} FilterChangeEvent
 * @property {string} dataField
 * @property {string[]} values
 */

/** @typedef {'popup'|'row'|'batch'} GridMode */

/**
 * @typedef {Object} RemoteModeParams
 * @property {string} endpoint
 * @property {{ data: string }} aliases
 */

export {};
