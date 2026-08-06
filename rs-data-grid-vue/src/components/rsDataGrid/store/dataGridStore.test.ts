import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  applyGlobalSearch,
  applySort,
  compareValues,
  initialState,
  resolveDataPath,
  returnLastPageList,
  returnPageList,
  returnPageStateRelatedPageNum,
  setDataWrapper,
  type AppState,
} from './dataGridStore';

const baseState = (overrides: Partial<AppState['pager']> = {}): AppState => ({
  data: [],
  pager: { ...initialState.pager, ...overrides },
});

describe('initialState', () => {
  it('has an empty data array and a default pager', () => {
    expect(initialState.data).toEqual([]);
    expect(initialState.pager).toEqual({
      pageSize: 10,
      pageNumber: 0,
      pageList: [1, 2, 3, 4, 5],
      pageListSize: 5,
      pageLimit: 10,
      remotePage: false,
    });
  });
});

describe('setDataWrapper', () => {
  it('computes local-mode pager fields from data length', () => {
    const state = baseState({ pageSize: 2, pageListSize: 5 });
    const data = [1, 2, 3, 4, 5];
    const result = setDataWrapper(state, data, false, undefined);
    expect(result.data).toBe(data);
    expect(result.pager.remotePage).toBe(false);
    expect(result.pager.pageLimit).toBe(3);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('computes remote-mode pager fields when remoteDatasize is provided', () => {
    const state = baseState({ pageSize: 10, pageListSize: 5 });
    const result = setDataWrapper(state, [1, 2, 3], true, 42);
    expect(result.pager.remotePage).toBe(true);
    expect(result.pager.remoteDataSize).toBe(42);
    expect(result.pager.pageLimit).toBe(5);
  });

  it('falls back to a zero page limit in remote mode when remoteDatasize is undefined', () => {
    const state = baseState({ pageSize: 10, pageListSize: 5 });
    const result = setDataWrapper(state, [], true, undefined);
    expect(result.pager.remotePage).toBe(true);
    expect(result.pager.remoteDataSize).toBeUndefined();
    expect(result.pager.pageLimit).toBe(0);
    expect(result.pager.pageList).toEqual([]);
  });
});

describe('resolveDataPath', () => {
  it('returns the data unchanged when path is undefined', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, undefined)).toBe(data);
  });

  it('returns the data unchanged when path is an empty/whitespace string', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, '   ')).toBe(data);
  });

  it('resolves a simple dotted path', () => {
    const data = { a: { b: { c: 'value' } } };
    expect(resolveDataPath(data, 'a.b.c')).toBe('value');
  });

  it('resolves array bracket notation by converting to dot segments', () => {
    const data = { items: [{ name: 'first' }, { name: 'second' }] };
    expect(resolveDataPath(data, 'items[1].name')).toBe('second');
  });

  it('returns undefined when an intermediate segment is null or undefined', () => {
    const data = { a: null };
    expect(resolveDataPath(data, 'a.b.c')).toBeUndefined();
  });

  it('ignores empty segments produced by leading/trailing/double dots', () => {
    const data = { a: { b: 'x' } };
    expect(resolveDataPath(data, '.a..b.')).toBe('x');
  });
});

describe('applyFilters', () => {
  const data = [
    { id: 1, category: 'a' },
    { id: 2, category: 'b' },
    { id: 3, category: 'a' },
  ];

  it('returns data unchanged when there are no active filters', () => {
    expect(applyFilters(data, {})).toBe(data);
  });

  it('ignores filter entries that are not non-empty arrays', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters = { category: null as any, id: [] };
    expect(applyFilters(data, filters)).toBe(data);
  });

  it('filters rows whose field value is included in the selected values', () => {
    const result = applyFilters(data, { category: ['a'] });
    expect(result).toEqual([
      { id: 1, category: 'a' },
      { id: 3, category: 'a' },
    ]);
  });

  it('applies multiple active filters with AND semantics', () => {
    const result = applyFilters(data, { category: ['a'], id: ['1'] });
    expect(result).toEqual([{ id: 1, category: 'a' }]);
  });

  it('stringifies missing field values before comparing', () => {
    const rows = [{ id: 1 }, { id: 2, category: undefined }];
    const result = applyFilters(rows, { category: [''] });
    expect(result).toEqual(rows);
  });
});

describe('applyGlobalSearch', () => {
  const data = [
    { name: 'Alpha', city: 'Springfield' },
    { name: 'Beta', city: 'Shelbyville' },
  ];

  it('returns data unchanged when the search term is empty or whitespace', () => {
    expect(applyGlobalSearch(data, '   ')).toBe(data);
  });

  it('matches case-insensitively against any field', () => {
    expect(applyGlobalSearch(data, 'shelby')).toEqual([{ name: 'Beta', city: 'Shelbyville' }]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(applyGlobalSearch(data, 'nomatch')).toEqual([]);
  });

  it('handles null/undefined rows and values gracefully', () => {
    const rows = [null, { name: null, city: undefined }, { name: 'Gamma' }];
    expect(applyGlobalSearch(rows, 'gamma')).toEqual([{ name: 'Gamma' }]);
  });
});

describe('compareValues', () => {
  it('compares two numeric-looking values numerically', () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues('10', '2')).toBeGreaterThan(0);
  });

  it('falls back to string comparison when either value is an empty string', () => {
    expect(compareValues('', 5)).toBe(String('').localeCompare(String(5)));
  });

  it('falls back to string comparison when either value is null', () => {
    expect(compareValues(null, 5)).toBe(String(null ?? '').localeCompare(String(5)));
  });

  it('falls back to string comparison when either value is undefined', () => {
    expect(compareValues(undefined, 5)).toBe(''.localeCompare('5'));
    expect(compareValues(5, undefined)).toBe('5'.localeCompare(''));
  });

  it('falls back to string comparison when either value is non-numeric text', () => {
    expect(compareValues('apple', 'banana')).toBe('apple'.localeCompare('banana'));
  });

  it('treats null/undefined operands as empty strings when string-comparing', () => {
    expect(compareValues(null, undefined)).toBe(0);
  });
});

describe('applySort', () => {
  const data = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it('returns data unchanged when there is no sort field', () => {
    expect(applySort(data, { field: null, direction: 'asc' })).toBe(data);
  });

  it('returns data unchanged when there is no sort direction', () => {
    expect(applySort(data, { field: 'n', direction: null })).toBe(data);
  });

  it('sorts ascending', () => {
    expect(applySort(data, { field: 'n', direction: 'asc' })).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('sorts descending', () => {
    expect(applySort(data, { field: 'n', direction: 'desc' })).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }]);
  });

  it('does not mutate the original array', () => {
    const original = [...data];
    applySort(data, { field: 'n', direction: 'asc' });
    expect(data).toEqual(original);
  });
});

describe('returnPageList', () => {
  it('caps the list length to pageLimit when pageListSize exceeds it', () => {
    expect(returnPageList(5, 2)).toEqual([1, 2]);
  });

  it('uses pageListSize when it is smaller than pageLimit', () => {
    expect(returnPageList(3, 10)).toEqual([1, 2, 3]);
  });

  it('returns an empty list when pageLimit is 0', () => {
    expect(returnPageList(5, 0)).toEqual([]);
  });
});

describe('returnPageStateRelatedPageNum', () => {
  it('sets pageNumber directly when navigating to the first page', () => {
    const state = baseState({ pageList: [1, 2, 3], pageListSize: 3, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 0, 'none');
    expect(result.pager.pageNumber).toBe(0);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('sets pageNumber directly when navigating to the last page', () => {
    const state = baseState({ pageList: [1, 2, 3], pageListSize: 3, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 9, 'none');
    expect(result.pager.pageNumber).toBe(9);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('keeps the existing pageList when the target page is already visible (fallback branch)', () => {
    const state = baseState({ pageList: [1, 2, 3], pageListSize: 3, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 1, 'none');
    expect(result.pager.pageNumber).toBe(1);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('slides the window forward when increasing past the end of the visible page list', () => {
    const state = baseState({ pageList: [1, 2, 3], pageListSize: 3, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 3, 'increase');
    expect(result.pager.pageNumber).toBe(3);
    expect(result.pager.pageList).toEqual([4, 5, 6]);
  });

  it('clamps the forward-sliding window to pageLimit', () => {
    const state = baseState({ pageList: [2, 3, 4], pageListSize: 3, pageLimit: 6 });
    const result = returnPageStateRelatedPageNum(state, 4, 'increase');
    expect(result.pager.pageNumber).toBe(4);
    expect(result.pager.pageList).toEqual([5, 6]);
  });

  it('slides the window backward when decreasing past the start of the visible page list, clamped to 0', () => {
    const state = baseState({ pageList: [4, 5, 6], pageListSize: 3, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 2, 'decrease');
    expect(result.pager.pageNumber).toBe(2);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('slides the window backward without clamping when the offset stays positive', () => {
    const state = baseState({ pageList: [7, 8, 9], pageListSize: 3, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 5, 'decrease');
    expect(result.pager.pageNumber).toBe(5);
    expect(result.pager.pageList).toEqual([4, 5, 6]);
  });
});

describe('returnLastPageList', () => {
  it('builds a page list ending at the last page', () => {
    const state = baseState({ pageList: [1, 2, 3], pageListSize: 3, pageLimit: 10 });
    const result = returnLastPageList(state, 9);
    expect(result.pager.pageNumber).toBe(9);
    expect(result.pager.pageList).toEqual([8, 9, 10]);
  });
});
