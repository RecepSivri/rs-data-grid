import { describe, it, expect } from 'vitest';
import * as icons from '../src/rsDataGrid/icons.js';

describe('icons', () => {
  it('exports non-empty svg markup strings for every icon', () => {
    const names = [
      'SAVE_ICON',
      'CANCEL_ICON',
      'EDIT_ICON',
      'DELETE_ICON',
      'ADD_ICON',
      'BATCH_SAVE_ICON',
      'EXPORT_EXCEL_ICON',
      'EXPORT_PDF_ICON',
    ];
    for (const name of names) {
      expect(icons[name]).toBeTypeOf('string');
      expect(icons[name]).toContain('<svg');
    }
  });
});
