import { describe, expect, it } from 'vitest';
import * as models from './rsDataGrid.models';

describe('rsDataGrid.models', () => {
  it('is a type-only module with no runtime exports', () => {
    expect(Object.keys(models)).toEqual([]);
  });
});
