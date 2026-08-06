import { describe, it, expect } from 'vitest';
import {
  SAVE_ICON,
  CANCEL_ICON,
  EDIT_ICON,
  DELETE_ICON,
  ADD_ICON,
  BATCH_SAVE_ICON,
  EXPORT_EXCEL_ICON,
  EXPORT_PDF_ICON,
} from '../src/rsDataGrid/icons.js';

describe('icons', () => {
  it('exports non-empty SVG markup strings for every icon', () => {
    const icons = { SAVE_ICON, CANCEL_ICON, EDIT_ICON, DELETE_ICON, ADD_ICON, BATCH_SAVE_ICON, EXPORT_EXCEL_ICON, EXPORT_PDF_ICON };
    for (const [name, markup] of Object.entries(icons)) {
      expect(typeof markup, `${name} should be a string`).toBe('string');
      expect(markup, `${name} should contain <svg`).toContain('<svg');
      expect(markup, `${name} should be well-formed`).toContain('</svg>');
    }
  });
});
