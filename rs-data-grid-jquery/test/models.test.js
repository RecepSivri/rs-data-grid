import { describe, it, expect } from 'vitest';
import * as models from '../src/rsDataGrid/models/rsDataGrid.models.js';

describe('rsDataGrid.models', () => {
  it('is a JSDoc-only module with no runtime exports', () => {
    expect(Object.keys(models)).toEqual([]);
  });
});
