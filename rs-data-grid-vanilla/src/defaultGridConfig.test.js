import { describe, expect, it } from 'vitest';
import { defaultGridConfig } from './defaultGridConfig';

describe('defaultGridConfig', () => {
  it('provides a fetchUrl-based, local (non-remote) starting configuration', () => {
    expect(defaultGridConfig.fetchUrl).toMatch(/^https:\/\//);
    expect(defaultGridConfig.dataSource).toEqual([]);
    expect(defaultGridConfig.remoteMode).toBe(false);
  });

  it('defaults to showing the poster/title/genres/release_date columns', () => {
    expect(defaultGridConfig.defaultVisibleColumns).toEqual(['poster', 'title', 'genres', 'release_date']);
  });

  it('defaults to popup grid mode with pagination enabled', () => {
    expect(defaultGridConfig.gridMode).toBe('popup');
    expect(defaultGridConfig.pagination).toBe(true);
    expect(defaultGridConfig.pagingSizes).toEqual([10, 20, 50, 70, 100]);
  });
});
