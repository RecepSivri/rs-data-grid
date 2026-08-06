import { describe, it, expect } from 'vitest';
import {
  initialState,
  setDataWrapper,
  resolveDataPath,
  applyFilters,
  applyGlobalSearch,
  compareValues,
  applySort,
  returnPageList,
  returnPageStateRelatedPageNum,
  returnLastPageList,
} from '../../src/rsDataGrid/store/dataGridStore.js';

describe('initialState', () => {
  it('has the expected shape', () => {
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

describe('setDataWrapper', () => {
  it('computes local pageLimit/pageList from data length when not remote', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const data = Array.from({ length: 23 }, (_, i) => ({ id: i }));
    const result = setDataWrapper(state, data, false, undefined);
    expect(result.data).toBe(data);
    expect(result.pager.remotePage).toBe(false);
    expect(result.pager.pageLimit).toBe(3);
    expect(result.pager.pageList).toEqual([1, 2, 3]);
  });

  it('computes remote pageLimit/pageList/remoteDataSize when remote with a truthy size', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const result = setDataWrapper(state, [{ id: 1 }], true, 42);
    expect(result.pager.remotePage).toBe(true);
    expect(result.pager.remoteDataSize).toBe(42);
    // pageLimit = ceil(42/10) = 5
    expect(result.pager.pageLimit).toBe(5);
  });

  it('treats a falsy remoteDatasize as an empty remote page (pageLimit 0)', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const result = setDataWrapper(state, [], true, undefined);
    expect(result.pager.remotePage).toBe(true);
    expect(result.pager.remoteDataSize).toBeUndefined();
    expect(result.pager.pageLimit).toBe(0);
    expect(result.pager.pageList).toEqual([]);
  });

  it('treats remoteDatasize of 0 as falsy too', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const result = setDataWrapper(state, [], true, 0);
    expect(result.pager.pageLimit).toBe(0);
  });
});

describe('resolveDataPath', () => {
  it('returns data unchanged when path is undefined', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, undefined)).toBe(data);
  });

  it('returns data unchanged when path is an empty/whitespace string', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, '')).toBe(data);
    expect(resolveDataPath(data, '   ')).toBe(data);
  });

  it('resolves a simple dotted path', () => {
    expect(resolveDataPath({ a: { b: 5 } }, 'a.b')).toBe(5);
  });

  it('resolves array-index bracket syntax', () => {
    expect(resolveDataPath({ a: [10, 20, 30] }, 'a[1]')).toBe(20);
  });

  it('resolves a mixed dotted + bracket path with surrounding whitespace', () => {
    expect(resolveDataPath({ a: { list: [{ b: 'x' }] } }, '  a.list[0].b  ')).toBe('x');
  });

  it('returns undefined when an intermediate segment is null', () => {
    expect(resolveDataPath({ a: null }, 'a.b')).toBeUndefined();
  });

  it('returns undefined when an intermediate segment is undefined', () => {
    expect(resolveDataPath({}, 'a.b')).toBeUndefined();
  });
});

describe('applyFilters', () => {
  const data = [
    { id: 1, color: 'red' },
    { id: 2, color: 'blue' },
    { id: 3, color: 'red' },
    { id: 4, color: undefined },
  ];

  it('returns the same data reference when there are no active filters (empty object)', () => {
    expect(applyFilters(data, {})).toBe(data);
  });

  it('ignores filter entries whose values are not a non-empty array', () => {
    expect(applyFilters(data, { color: [], size: 'not-an-array' })).toBe(data);
  });

  it('filters rows by a single active filter', () => {
    const result = applyFilters(data, { color: ['red'] });
    expect(result).toEqual([
      { id: 1, color: 'red' },
      { id: 3, color: 'red' },
    ]);
  });

  it('requires all active filters to match (AND semantics)', () => {
    const result = applyFilters(data, { color: ['red'], id: [String(3)] });
    expect(result).toEqual([{ id: 3, color: 'red' }]);
  });

  it('matches missing/undefined field values against an empty-string filter value', () => {
    const result = applyFilters(data, { color: [''] });
    expect(result).toEqual([{ id: 4, color: undefined }]);
  });
});

describe('applyGlobalSearch', () => {
  const data = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
    null,
  ];

  it('returns data unchanged when search is blank', () => {
    expect(applyGlobalSearch(data, '')).toBe(data);
    expect(applyGlobalSearch(data, '   ')).toBe(data);
  });

  it('matches case-insensitively across all fields, trims term, and tolerates null rows', () => {
    const result = applyGlobalSearch(data, '  ALICE  ');
    expect(result).toEqual([{ name: 'Alice', age: 30 }]);
  });

  it('matches numeric field values by their string form', () => {
    const result = applyGlobalSearch(data, '25');
    expect(result).toEqual([{ name: 'Bob', age: 25 }]);
  });

  it('returns empty array when nothing matches', () => {
    expect(applyGlobalSearch(data, 'zzz')).toEqual([]);
  });

  it('tolerates a null/undefined field value within a row (String(value ?? "") fallback)', () => {
    const withNullField = [{ name: 'Carl', nickname: null }, { name: 'Dana', nickname: undefined }];
    expect(applyGlobalSearch(withNullField, 'carl')).toEqual([{ name: 'Carl', nickname: null }]);
    // A row whose only unmatched field is null/undefined must not throw and must correctly not-match.
    expect(applyGlobalSearch(withNullField, 'zzz')).toEqual([]);
  });
});

describe('compareValues', () => {
  it('compares numeric values numerically', () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues('9', '10')).toBeLessThan(0);
  });

  it('falls back to locale string compare when either value is an empty string', () => {
    expect(compareValues('', 'a')).toBeLessThan(0);
    expect(compareValues('a', '')).toBeGreaterThan(0);
  });

  it('falls back to locale string compare when either value is null/undefined', () => {
    // a/b nullish-coalesce to '' before the string compare (not String(null)/String(undefined))
    expect(compareValues(null, 'a')).toBe(''.localeCompare('a'));
    expect(compareValues('a', undefined)).toBe('a'.localeCompare(''));
  });

  it('falls back to locale string compare when either value is non-numeric text', () => {
    expect(compareValues('banana', 'apple')).toBeGreaterThan(0);
  });

  it('treats null/undefined as empty string via nullish coalescing in the fallback branch', () => {
    expect(compareValues(null, undefined)).toBe(0);
  });
});

describe('applySort', () => {
  const data = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it('returns data unchanged when field is null', () => {
    const sort = { field: null, direction: 'asc' };
    expect(applySort(data, sort)).toBe(data);
  });

  it('returns data unchanged when direction is null', () => {
    const sort = { field: 'n', direction: null };
    expect(applySort(data, sort)).toBe(data);
  });

  it('sorts ascending without mutating the original array', () => {
    const sort = { field: 'n', direction: 'asc' };
    const result = applySort(data, sort);
    expect(result).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(result).not.toBe(data);
    expect(data).toEqual([{ n: 3 }, { n: 1 }, { n: 2 }]);
  });

  it('sorts descending', () => {
    const sort = { field: 'n', direction: 'desc' };
    expect(applySort(data, sort)).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }]);
  });

  it('tolerates null/undefined elements via optional chaining', () => {
    const withNulls = [{ n: 2 }, null, { n: 1 }];
    const result = applySort(withNulls, { field: 'n', direction: 'asc' });
    expect(result[result.length - 1]).toEqual({ n: 2 });
    expect(result).toContain(null);
  });
});

describe('returnPageList', () => {
  it('caps the list length at pageLimit when pageListSize exceeds it', () => {
    expect(returnPageList(5, 2)).toEqual([1, 2]);
  });

  it('uses pageListSize when it is smaller than pageLimit', () => {
    expect(returnPageList(3, 10)).toEqual([1, 2, 3]);
  });

  it('returns an empty array when pageLimit is 0', () => {
    expect(returnPageList(5, 0)).toEqual([]);
  });
});

describe('returnPageStateRelatedPageNum', () => {
  function makeState({ pageNumber = 0, pageList = [1, 2, 3, 4, 5], pageListSize = 5, pageLimit = 10 } = {}) {
    return { data: [], pager: { pageNumber, pageList, pageListSize, pageLimit, pageSize: 10, remotePage: false } };
  }

  it('returns pageNumber unchanged (branch 1) when pageVal is 0', () => {
    const state = makeState();
    const result = returnPageStateRelatedPageNum(state, 0, 'none');
    expect(result.pager.pageNumber).toBe(0);
    expect(result.pager.pageList).toBe(state.pager.pageList);
  });

  it('returns pageNumber unchanged (branch 1) when pageVal is pageLimit - 1 (last page)', () => {
    const state = makeState({ pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 9, 'none');
    expect(result.pager.pageNumber).toBe(9);
  });

  it('advances the window (branch 2) when moving past the end of the current pageList, flag=none', () => {
    // pageList [1,2,3,4,5], pageListSize 5, pageLimit 10; pageVal=4 (page 5) triggers branch2:
    // findIndex(val === pageVal+1=5) === pageListSize-1(4) -> true
    const state = makeState({ pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 4, 'none');
    expect(result.pager.pageNumber).toBe(4);
    expect(result.pager.pageList).toEqual([5, 6, 7, 8, 9, 10].slice(0, 5));
  });

  it('advances the window (branch 2) with flag=increase using returnConditionIncrease', () => {
    // increase flag: findIndex(val === pageVal+1-1 = pageVal). Choose pageVal=5 so pageVal===5 is last of [1..5]... need pageList index 4 value 5
    const state = makeState({ pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 4, 'increase');
    expect(result.pager.pageNumber).toBe(4);
  });

  it('retreats the window (branch 3) when moving before the start of the current pageList, flag=none', () => {
    // pageList [6,7,8,9,10], pageVal=5 (0-indexed page 5 => page number 6) triggers: findIndex(val===pageVal+1=6)===0
    const state = makeState({ pageList: [6, 7, 8, 9, 10], pageListSize: 5, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 5, 'none');
    expect(result.pager.pageNumber).toBe(5);
    expect(result.pager.pageList).toEqual([2, 3, 4, 5, 6]);
  });

  it('retreats the window (branch 3) with flag=decrease using returnConditionDecrease', () => {
    const state = makeState({ pageList: [6, 7, 8, 9, 10], pageListSize: 5, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 5, 'decrease');
    expect(result.pager.pageNumber).toBe(5);
  });

  it('clamps the retreat window at 0 when pageVal - pageListSize + 1 would go negative', () => {
    const state = makeState({ pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 10 });
    // Force branch3 entry point directly with a small pageVal boundary via a custom pageList shape.
    const customState = { data: [], pager: { pageNumber: 0, pageList: [2, 3, 4, 5, 6], pageListSize: 5, pageLimit: 10, pageSize: 10, remotePage: false } };
    const result = returnPageStateRelatedPageNum(customState, 1, 'none');
    expect(result.pager.pageNumber).toBe(1);
    expect(result.pager.pageList).toEqual([1, 2, 3, 4, 5]);
  });

  it('falls through to the default branch (final return) when none of the special conditions apply', () => {
    const state = makeState({ pageList: [3, 4, 5, 6, 7], pageListSize: 5, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 5, 'none');
    expect(result.pager.pageNumber).toBe(5);
    expect(result.pager.pageList).toBe(state.pager.pageList);
  });

  it('caps the advancing window at pageLimit when pageVal + pageListSize would exceed it (branch2, window-clamp true branch)', () => {
    // pageVal=7, pageListSize=5 -> 7+5=12 > pageLimit(10), so the window
    // must stop at 10 instead of listing a full 5-wide window past it.
    const state = makeState({ pageList: [4, 5, 6, 7, 8], pageListSize: 5, pageLimit: 10 });
    const result = returnPageStateRelatedPageNum(state, 7, 'none');
    expect(result.pager.pageNumber).toBe(7);
    expect(result.pager.pageList).toEqual([8, 9, 10]);
  });
});

describe('returnLastPageList', () => {
  it('builds a page list ending at pageLimit and sets pageNumber', () => {
    const state = { data: [], pager: { pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 12, pageSize: 10, remotePage: false } };
    const result = returnLastPageList(state, 11);
    expect(result.pager.pageNumber).toBe(11);
    expect(result.pager.pageList).toEqual([8, 9, 10, 11, 12]);
  });

  it('handles pageNumber smaller than pageListSize (negative start index)', () => {
    const state = { data: [], pager: { pageNumber: 0, pageList: [1, 2], pageListSize: 5, pageLimit: 2, pageSize: 10, remotePage: false } };
    const result = returnLastPageList(state, 1);
    expect(result.pager.pageNumber).toBe(1);
    expect(result.pager.pageList).toEqual([-2, -1, 0, 1, 2]);
  });
});
