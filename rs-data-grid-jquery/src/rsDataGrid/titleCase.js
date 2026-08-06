// Ported verbatim from the regex used across rsDataGrid.tsx / rsDataGridHeader.tsx.
export const titleCase = value =>
  value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
