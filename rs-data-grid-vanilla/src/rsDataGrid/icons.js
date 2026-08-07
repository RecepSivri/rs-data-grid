// Raw SVG markup, ported 1:1 (same paths/colors) from rsDataGridTable.tsx's
// icon components and rsDataGrid.tsx's inline toolbar SVGs.

export const SAVE_ICON = `
<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
  <path d="M17 21v-8H7v8"/>
  <path d="M7 3v5h8"/>
</svg>`;

export const CANCEL_ICON = `
<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 6 6 18"/>
  <path d="M6 6l12 12"/>
</svg>`;

export const EDIT_ICON = `
<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
</svg>`;

export const DELETE_ICON = `
<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 6h18"/>
  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6"/>
  <path d="M14 11v6"/>
</svg>`;

export const ADD_ICON = `
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
  <path d="M12 5v14"/>
  <path d="M5 12h14"/>
</svg>`;

export const BATCH_SAVE_ICON = `
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
  <path d="M17 21v-8H7v8"/>
  <path d="M7 3v5h8"/>
</svg>`;

export const EXPORT_EXCEL_ICON = `
<svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
  <rect x="2" y="2" width="32" height="32" rx="5" fill="#1D6F42"/>
  <path d="M10.5 11h3.6l3.4 5.3 3.4-5.3h3.6l-5.1 7 5.1 7h-3.6l-3.4-5.3-3.4 5.3h-3.6l5.1-7z" fill="#ffffff"/>
</svg>`;

export const EXPORT_PDF_ICON = `
<svg viewBox="0 0 36 36" width="20" height="20" aria-hidden="true">
  <rect x="2" y="2" width="32" height="32" rx="5" fill="#e2483d"/>
  <text x="18" y="23" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">PDF</text>
</svg>`;
