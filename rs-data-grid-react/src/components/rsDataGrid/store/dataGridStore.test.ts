import { describe, it, expect } from 'vitest';
import {
  AppState,
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
} from './dataGridStore';

const makeState = (overrides: Partial<AppState['pager']> = {}, data: any[] = []): AppState => ({
  data,
  pager: {
    pageSize: 10,
    pageNumber: 0,
    pageList: [1, 2, 3, 4, 5],
    pageListSize: 5,
    pageLimit: 10,
    remotePage: false,
    ...overrides,
  },
});

describe('resolveDataPath', () => {
  it('returns data unchanged when path is undefined', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, undefined)).toBe(data);
  });

  it('returns data unchanged when path is an empty string', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, '')).toBe(data);
  });

  it('returns data unchanged when path is only whitespace', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, '   ')).toBe(data);
  });

  it('resolves a simple dotted path', () => {
    const data = { a: { b: { c: 42 } } };
    expect(resolveDataPath(data, 'a.b.c')).toBe(42);
  });

  it('resolves a path with bracket array indices', () => {
    const data = { a: { b: [{ c: 'first' }, { c: 'second' }] } };
    expect(resolveDataPath(data, 'a.b[1].c')).toBe('second');
  });

  it('resolves a path that starts with a bracket index', () => {
    const data = [{ c: 'zero' }];
    expect(resolveDataPath(data, '[0].c')).toBe('zero');
  });

  it('ignores empty segments produced by leading/duplicate dots', () => {
    const data = { a: { b: 7 } };
    expect(resolveDataPath(data, '.a..b')).toBe(7);
  });

  it('returns undefined when an intermediate value is null', () => {
    const data = { a: null };
    expect(resolveDataPath(data, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined when an intermediate value is undefined', () => {
    const data = { a: undefined };
    expect(resolveDataPath(data, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined when the final property does not exist', () => {
    const data = { a: { b: 1 } };
    expect(resolveDataPath(data, 'a.missing')).toBeUndefined();
  });
});

describe('applyFilters', () => {
  it('returns the same data reference when there are no filters', () => {
    const data = [{ a: 1 }];
    expect(applyFilters(data, {})).toBe(data);
  });

  it('treats filters with empty value arrays as inactive', () => {
    const data = [{ a: 1 }, { a: 2 }];
    expect(applyFilters(data, { a: [] })).toBe(data);
  });

  it('treats non-array filter values as inactive', () => {
    const data = [{ a: 1 }, { a: 2 }];
    expect(applyFilters(data, { a: 'not-an-array' as unknown as string[] })).toBe(data);
  });

  it('filters rows whose field value is included in the active filter values', () => {
    const data = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(applyFilters(data, { a: ['1', '3'] })).toEqual([{ a: 1 }, { a: 3 }]);
  });

  it('treats a missing field as an empty string for matching', () => {
    const data = [{ a: 1 }, { b: 2 }];
    expect(applyFilters(data, { a: [''] })).toEqual([{ b: 2 }]);
  });

  it('requires all active filters to match (AND semantics)', () => {
    const data = [
      { a: 1, b: 'x' },
      { a: 1, b: 'y' },
      { a: 2, b: 'x' },
    ];
    expect(applyFilters(data, { a: ['1'], b: ['x'] })).toEqual([{ a: 1, b: 'x' }]);
  });
});

describe('applyGlobalSearch', () => {
  it('returns the same data reference when the search term is empty', () => {
    const data = [{ a: 1 }];
    expect(applyGlobalSearch(data, '')).toBe(data);
  });

  it('returns the same data reference when the search term is only whitespace', () => {
    const data = [{ a: 1 }];
    expect(applyGlobalSearch(data, '   ')).toBe(data);
  });

  it('matches case-insensitively across any field', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }];
    expect(applyGlobalSearch(data, 'ALI')).toEqual([{ name: 'Alice' }]);
  });

  it('trims the search term before matching', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }];
    expect(applyGlobalSearch(data, '  bob  ')).toEqual([{ name: 'Bob' }]);
  });

  it('handles null rows gracefully', () => {
    const data = [null, { name: 'Bob' }];
    expect(applyGlobalSearch(data, 'bob')).toEqual([{ name: 'Bob' }]);
  });

  it('handles null/undefined field values gracefully', () => {
    const data = [{ name: null }, { name: undefined }, { name: 'target' }];
    expect(applyGlobalSearch(data, 'target')).toEqual([{ name: 'target' }]);
  });
});

describe('compareValues', () => {
  it('compares two numeric-looking values numerically', () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues('2', '10')).toBeLessThan(0);
  });

  it('compares equal numeric values as zero', () => {
    expect(compareValues(5, 5)).toBe(0);
  });

  it('falls back to string compare when a is an empty string', () => {
    expect(compareValues('', 'b')).toBe(''.localeCompare('b'));
  });

  it('falls back to string compare when b is an empty string', () => {
    expect(compareValues('a', '')).toBe('a'.localeCompare(''));
  });

  it('falls back to string compare when a is null', () => {
    expect(compareValues(null, 5)).toBe(String(null ?? '').localeCompare('5'));
  });

  it('falls back to string compare when a is undefined', () => {
    expect(compareValues(undefined, 5)).toBe(''.localeCompare('5'));
  });

  it('falls back to string compare when b is null', () => {
    expect(compareValues(5, null)).toBe('5'.localeCompare(''));
  });

  it('falls back to string compare when b is undefined', () => {
    expect(compareValues(5, undefined)).toBe('5'.localeCompare(''));
  });

  it('falls back to string compare when a is non-numeric text', () => {
    expect(compareValues('abc', 5)).toBe('abc'.localeCompare('5'));
  });

  it('falls back to string compare when b is non-numeric text', () => {
    expect(compareValues(5, 'abc')).toBe('5'.localeCompare('abc'));
  });

  it('compares two non-numeric strings lexicographically', () => {
    expect(compareValues('banana', 'apple')).toBe('banana'.localeCompare('apple'));
  });
});

describe('applySort', () => {
  const data = [{ v: 3 }, { v: 1 }, { v: 2 }];

  it('returns data unchanged when field is null', () => {
    expect(applySort(data, { field: null, direction: 'asc' })).toBe(data);
  });

  it('returns data unchanged when direction is null', () => {
    expect(applySort(data, { field: 'v', direction: null })).toBe(data);
  });

  it('sorts ascending', () => {
    expect(applySort(data, { field: 'v', direction: 'asc' })).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }]);
  });

  it('sorts descending', () => {
    expect(applySort(data, { field: 'v', direction: 'desc' })).toEqual([{ v: 3 }, { v: 2 }, { v: 1 }]);
  });

  it('does not mutate the original array', () => {
    const original = [{ v: 3 }, { v: 1 }];
    const copy = [...original];
    applySort(original, { field: 'v', direction: 'asc' });
    expect(original).toEqual(copy);
  });

  it('handles null rows via optional chaining', () => {
    const withNull = [{ v: 2 }, null, { v: 1 }];
    expect(applySort(withNull, { field: 'v', direction: 'asc' })).toEqual([null, { v: 1 }, { v: 2 }]);
  });
});

describe('returnPageList', () => {
  it('returns an empty list when pageLimit is 0', () => {
    expect(returnPageList(5, 0)).toEqual([]);
  });

  it('caps the list at pageLimit when pageListSize is larger', () => {
    expect(returnPageList(5, 3)).toEqual([1, 2, 3]);
  });

  it('caps the list at pageListSize when they are equal', () => {
    expect(returnPageList(5, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('caps the list at pageListSize when pageLimit is larger', () => {
    expect(returnPageList(5, 10)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('returnPageStateRelatedPageNum', () => {
  it('returns early (pageList untouched) when pageVal is 0', () => {
    const state = makeState({ pageNumber: 5, pageList: [3, 4, 5, 6, 7], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 0, 'none');
    expect(result.pager.pageNumber).toBe(0);
    expect(result.pager.pageList).toEqual([3, 4, 5, 6, 7]);
  });

  it('returns early (pageList untouched) when pageVal is the last page', () => {
    const state = makeState({ pageNumber: 5, pageList: [3, 4, 5, 6, 7], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 19, 'none');
    expect(result.pager.pageNumber).toBe(19);
    expect(result.pager.pageList).toEqual([3, 4, 5, 6, 7]);
  });

  it('slides the page window forward when landing on the last visible slot (flag none)', () => {
    const state = makeState({ pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 4, 'none');
    expect(result.pager.pageNumber).toBe(4);
    expect(result.pager.pageList).toEqual([5, 6, 7, 8, 9]);
  });

  it('clamps the forward-sliding window when it would overshoot pageLimit', () => {
    const state = makeState({ pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 8 });
    const result = returnPageStateRelatedPageNum(state, 4, 'none');
    expect(result.pager.pageNumber).toBe(4);
    expect(result.pager.pageList).toEqual([5, 6, 7, 8]);
  });

  it('slides the page window forward when landing on the last visible slot (flag increase)', () => {
    const state = makeState({ pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 5, 'increase');
    expect(result.pager.pageNumber).toBe(5);
    expect(result.pager.pageList).toEqual([6, 7, 8, 9, 10]);
  });

  it('slides the page window backward when landing on the first visible slot (flag none)', () => {
    const state = makeState({ pageNumber: 9, pageList: [6, 7, 8, 9, 10], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 5, 'none');
    expect(result.pager.pageNumber).toBe(5);
    expect(result.pager.pageList).toEqual([2, 3, 4, 5, 6]);
  });

  it('slides the page window backward and clamps the start at 0 (flag decrease)', () => {
    const state = makeState({ pageNumber: 8, pageList: [6, 7, 8, 9, 10], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 4, 'decrease');
    expect(result.pager.pageNumber).toBe(4);
    expect(result.pager.pageList).toEqual([1, 2, 3, 4, 5]);
  });

  it('updates only pageNumber when the target is already fully within the visible window', () => {
    const state = makeState({ pageNumber: 2, pageList: [3, 4, 5, 6, 7], pageListSize: 5, pageLimit: 20 });
    const result = returnPageStateRelatedPageNum(state, 4, 'none');
    expect(result.pager.pageNumber).toBe(4);
    expect(result.pager.pageList).toEqual([3, 4, 5, 6, 7]);
  });
});

describe('returnLastPageList', () => {
  it('builds a page list ending exactly at pageLimit', () => {
    const state = makeState({ pageListSize: 5, pageLimit: 23 });
    const result = returnLastPageList(state, 22);
    expect(result.pager.pageNumber).toBe(22);
    expect(result.pager.pageList).toEqual([19, 20, 21, 22, 23]);
  });

  it('does not clamp a negative starting index when the total is smaller than pageListSize', () => {
    // returnLastPageList has no lower-bound clamp (unlike the decrease branch of
    // returnPageStateRelatedPageNum), so a small pageLimit produces leading values below 1.
    const state = makeState({ pageListSize: 5, pageLimit: 3 });
    const result = returnLastPageList(state, 2);
    expect(result.pager.pageList).toEqual([-1, 0, 1, 2, 3]);
  });
});

describe('setDataWrapper', () => {
  it('computes local pagination fields when remote is false', () => {
    const state = makeState({ pageSize: 10, pageListSize: 5 });
    const data = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    const result = setDataWrapper(state, data, false, undefined);
    expect(result.data).toBe(data);
    expect(result.pager.remotePage).toBe(false);
    expect(result.pager.pageLimit).toBe(3);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('computes remote pagination fields when remote is true and remoteDatasize is provided', () => {
    const state = makeState({ pageSize: 10, pageListSize: 5 });
    const result = setDataWrapper(state, [{ id: 1 }], true, 25);
    expect(result.pager.remotePage).toBe(true);
    expect(result.pager.remoteDataSize).toBe(25);
    expect(result.pager.pageLimit).toBe(3);
    expect(result.pager.pageList).toEqual([1]);
  });

  it('treats a missing remoteDatasize as zero when remote is true', () => {
    const state = makeState({ pageSize: 10, pageListSize: 5 });
    const result = setDataWrapper(state, [], true, undefined);
    expect(result.pager.remotePage).toBe(true);
    expect(result.pager.remoteDataSize).toBeUndefined();
    expect(result.pager.pageLimit).toBe(0);
    expect(result.pager.pageList).toEqual([]);
  });
});

describe('initialState', () => {
  it('exposes the expected default shape', () => {
    expect(initialState).toEqual({
      pager: {
        pageSize: 10,
        pageNumber: 0,
        pageList: [1, 2, 3, 4, 5],
        pageListSize: 5,
        pageLimit: 10,
        remotePage: false,
      },
      data: [],
    });
  });
});
