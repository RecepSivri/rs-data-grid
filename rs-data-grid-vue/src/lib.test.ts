import { describe, expect, it } from 'vitest';
import { RsDataGrid } from './lib.ts';

describe('lib.ts public entry point', () => {
  it('re-exports the RsDataGrid component', () => {
    expect(RsDataGrid).toBeDefined();
  });
});
