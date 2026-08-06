import { describe, it, expect } from 'vitest';
import { defaultGridConfig } from '../src/defaultGridConfig.js';

describe('defaultGridConfig', () => {
  it('provides a fully-formed standalone-mode config object', () => {
    expect(defaultGridConfig.fetchUrl).toBe('http://universities.hipolabs.com/search?country=United+States');
    expect(defaultGridConfig.apiMethod).toBe('GET');
    expect(defaultGridConfig.gridMode).toBe('popup');
    expect(Array.isArray(defaultGridConfig.dataSource)).toBe(true);
    expect(Array.isArray(defaultGridConfig.pagingSizes)).toBe(true);
    expect(defaultGridConfig.pagination).toBe(true);
  });
});
