import { describe, expect, it } from 'vitest';
import { createGrid } from './lib.js';

describe('lib.js public entry point', () => {
  it('re-exports createGrid', () => {
    expect(typeof createGrid).toBe('function');
  });
});
