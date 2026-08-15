import { describe, it, expect } from 'vitest';
import {
  initialState,
  setDataWrapper,
  resolveDataPath,
  applyFilters,
  applyGlobalSearch,
  compareValues,
  applySort,
  moveItem,
  returnPageList,
  returnPageStateRelatedPageNum,
  returnLastPageList,
} from '../../src/rsDataGrid/store/dataGridStore.js';

describe('initialState', () => {
  it('has the expected default shape', () => {
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
  it('computes local pagination from data length when remote is false', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const data = Array.from({ length: 23 }, (_, i) => ({ id: i }));
    const next = setDataWrapper(state, data, false, undefined);
    expect(next.data).toBe(data);
    expect(next.pager.remotePage).toBe(false);
    expect(next.pager.pageLimit).toBe(3); // ceil(23/10)
    expect(next.pager.pageList).toEqual([1, 2, 3]);
  });

  it('computes remote pagination from remoteDatasize when remote is true and size given', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const next = setDataWrapper(state, [{ id: 1 }], true, 42);
    expect(next.pager.remotePage).toBe(true);
    expect(next.pager.remoteDataSize).toBe(42);
    expect(next.pager.pageLimit).toBe(5); // ceil(42/10)
  });

  it('falls back to a zero pageLimit when remote is true but remoteDatasize is falsy', () => {
    const state = { ...initialState, pager: { ...initialState.pager, pageSize: 10, pageListSize: 5 } };
    const next = setDataWrapper(state, [], true, undefined);
    expect(next.pager.remotePage).toBe(true);
    expect(next.pager.remoteDataSize).toBeUndefined();
    expect(next.pager.pageLimit).toBe(0);
    expect(next.pager.pageList).toEqual([]);
  });

  it('preserves other state and pager fields via spread', () => {
    const state = { ...initialState, someExtra: 'kept', pager: { ...initialState.pager, someExtraPager: 'kept-pager' } };
    const next = setDataWrapper(state, [], false, undefined);
    expect(next.someExtra).toBe('kept');
    expect(next.pager.someExtraPager).toBe('kept-pager');
  });
});

describe('resolveDataPath', () => {
  it('returns data unchanged when path is undefined', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, undefined)).toBe(data);
  });

  it('returns data unchanged when path is empty/whitespace', () => {
    const data = { a: 1 };
    expect(resolveDataPath(data, '')).toBe(data);
    expect(resolveDataPath(data, '   ')).toBe(data);
  });

  it('resolves a simple dotted path', () => {
    expect(resolveDataPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('resolves bracket-array-index segments', () => {
    expect(resolveDataPath({ a: [10, 20, 30] }, 'a[1]')).toBe(20);
  });

  it('resolves a mixed dotted + bracket path', () => {
    expect(resolveDataPath({ a: { list: [{ v: 'x' }, { v: 'y' }] } }, 'a.list[1].v')).toBe('y');
  });

  it('trims surrounding whitespace on the path', () => {
    expect(resolveDataPath({ a: 1 }, '  a  ')).toBe(1);
  });

  it('returns undefined when traversal hits null/undefined mid-path', () => {
    expect(resolveDataPath({ a: null }, 'a.b.c')).toBeUndefined();
    expect(resolveDataPath({}, 'a.b')).toBeUndefined();
  });
});

describe('applyFilters', () => {
  const data = [
    { country: 'US', city: 'NYC' },
    { country: 'US', city: 'LA' },
    { country: 'FR', city: 'Paris' },
  ];

  it('returns data unchanged when there are no active filters', () => {
    expect(applyFilters(data, {})).toBe(data);
  });

  it('ignores filter entries whose values array is empty', () => {
    expect(applyFilters(data, { country: [] })).toBe(data);
  });

  it('ignores filter entries whose value is not an array', () => {
    expect(applyFilters(data, { country: 'US' })).toBe(data);
  });

  it('filters rows matching a single active filter', () => {
    expect(applyFilters(data, { country: ['US'] })).toEqual([
      { country: 'US', city: 'NYC' },
      { country: 'US', city: 'LA' },
    ]);
  });

  it('applies multiple active filters with AND semantics', () => {
    expect(applyFilters(data, { country: ['US'], city: ['LA'] })).toEqual([{ country: 'US', city: 'LA' }]);
  });

  it('coerces row values to string for comparison, and treats nullish as empty string', () => {
    const rows = [{ n: 5 }, { n: null }, { n: undefined }];
    expect(applyFilters(rows, { n: ['5'] })).toEqual([{ n: 5 }]);
    expect(applyFilters(rows, { n: [''] })).toEqual([{ n: null }, { n: undefined }]);
  });
});

describe('applyGlobalSearch', () => {
  const data = [
    { first: 'Ada', last: 'Lovelace' },
    { first: 'Bob', last: 'Marley' },
  ];

  it('returns data unchanged for an empty/whitespace search term', () => {
    expect(applyGlobalSearch(data, '')).toBe(data);
    expect(applyGlobalSearch(data, '   ')).toBe(data);
  });

  it('matches case-insensitively across any field', () => {
    expect(applyGlobalSearch(data, 'lovelace')).toEqual([{ first: 'Ada', last: 'Lovelace' }]);
    expect(applyGlobalSearch(data, 'BOB')).toEqual([{ first: 'Bob', last: 'Marley' }]);
  });

  it('trims the search term before matching', () => {
    expect(applyGlobalSearch(data, '  ada  ')).toEqual([{ first: 'Ada', last: 'Lovelace' }]);
  });

  it('handles null/undefined rows and nullish field values gracefully', () => {
    const rows = [null, undefined, { a: null, b: undefined, c: 'findme' }];
    expect(applyGlobalSearch(rows, 'findme')).toEqual([{ a: null, b: undefined, c: 'findme' }]);
  });

  it('returns no matches when nothing contains the term', () => {
    expect(applyGlobalSearch(data, 'zzz')).toEqual([]);
  });
});

describe('compareValues', () => {
  it('compares two numeric-looking values numerically', () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues('10', '2')).toBeGreaterThan(0);
  });

  it('falls back to locale string comparison for non-numeric values', () => {
    expect(compareValues('banana', 'apple')).toBeGreaterThan(0);
    expect(compareValues('apple', 'banana')).toBeLessThan(0);
  });

  it('treats empty string as non-numeric (string compare path)', () => {
    expect(compareValues('', 'a')).toBeLessThan(0);
  });

  it('treats null/undefined as non-numeric (string compare path)', () => {
    expect(compareValues(null, 'a')).not.toBeNaN();
    expect(compareValues(undefined, undefined)).toBe(0);
  });

  it('treats NaN-producing strings as non-numeric', () => {
    expect(compareValues('abc', '5')).toBeGreaterThan(0); // 'abc' > '5' lexically... just assert it is a finite number
    expect(Number.isNaN(compareValues('abc', '5'))).toBe(false);
  });

  it('coerces nullish values to empty string in the string-compare path', () => {
    expect(compareValues(null, null)).toBe(0);
  });
});

describe('applySort', () => {
  const data = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it('returns data unchanged when field is null', () => {
    expect(applySort(data, { field: null, direction: 'asc' })).toBe(data);
  });

  it('returns data unchanged when direction is null', () => {
    expect(applySort(data, { field: 'n', direction: null })).toBe(data);
  });

  it('sorts ascending', () => {
    expect(applySort(data, { field: 'n', direction: 'asc' })).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('sorts descending', () => {
    expect(applySort(data, { field: 'n', direction: 'desc' })).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }]);
  });

  it('does not mutate the input array', () => {
    const copy = [...data];
    applySort(data, { field: 'n', direction: 'asc' });
    expect(data).toEqual(copy);
  });

  it('handles rows that are null/undefined via optional chaining', () => {
    const rows = [{ n: 2 }, null, { n: 1 }];
    expect(() => applySort(rows, { field: 'n', direction: 'asc' })).not.toThrow();
  });
});

describe('returnPageList', () => {
  it('returns 1..pageLimit when pageLimit is smaller than pageListSize', () => {
    expect(returnPageList(5, 3)).toEqual([1, 2, 3]);
  });

  it('returns 1..pageListSize when pageLimit is larger', () => {
    expect(returnPageList(5, 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns an empty array when pageLimit is 0', () => {
    expect(returnPageList(5, 0)).toEqual([]);
  });

  it('returns 1..pageListSize when they are exactly equal', () => {
    expect(returnPageList(5, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('returnPageStateRelatedPageNum', () => {
  function makeState(overrides = {}) {
    return {
      data: [],
      pager: {
        pageSize: 10,
        pageNumber: 0,
        pageList: [1, 2, 3, 4, 5],
        pageListSize: 5,
        pageLimit: 10,
        remotePage: false,
        ...overrides,
      },
    };
  }

  it('jumps straight through when pageVal is 0', () => {
    const state = makeState({ pageNumber: 3 });
    const next = returnPageStateRelatedPageNum(state, 0, 'none');
    expect(next.pager.pageNumber).toBe(0);
    expect(next.pager.pageList).toBe(state.pager.pageList); // unchanged reference
  });

  it('jumps straight through when pageVal is the last page (pageLimit - 1)', () => {
    const state = makeState({ pageLimit: 10 });
    const next = returnPageStateRelatedPageNum(state, 9, 'none');
    expect(next.pager.pageNumber).toBe(9);
  });

  it('does not touch pageList when the target page is inside the current window (increase flag, no-op case)', () => {
    // pageVal=4 with pageList [1..5]/pageListSize 5 does not land on either sliding-window
    // edge check for the 'increase' flag, so it falls through to the plain-update branch.
    const state = makeState({ pageNumber: 3, pageLimit: 10, pageList: [1, 2, 3, 4, 5] });
    const next = returnPageStateRelatedPageNum(state, 4, 'increase');
    expect(next.pager.pageNumber).toBe(4);
    expect(next.pager.pageList).toBe(state.pager.pageList);
  });

  it('recomputes the sliding window forward when moving one page past the current window (increase)', () => {
    // pageVal(5) equals the last item of the current pageList [1..5] -> triggers the
    // "increase" edge branch, sliding the window to start right after pageVal.
    const state = makeState({ pageNumber: 4, pageLimit: 10, pageList: [1, 2, 3, 4, 5] });
    const next = returnPageStateRelatedPageNum(state, 5, 'increase');
    expect(next.pager.pageNumber).toBe(5);
    expect(next.pager.pageList).toEqual([6, 7, 8, 9, 10]);
  });

  it('clamps the forward-sliding window to pageLimit when it would otherwise overrun', () => {
    // Unlike the equal-length case above, pageLimit(6) here is smaller than
    // pageNumber+pageListSize, so the window must be clamped, not run past it.
    const state = makeState({ pageNumber: 3, pageLimit: 6, pageList: [2, 3, 4], pageListSize: 3 });
    const next = returnPageStateRelatedPageNum(state, 4, 'increase');
    expect(next.pager.pageNumber).toBe(4);
    expect(next.pager.pageList).toEqual([5, 6]);
  });

  it('recomputes the sliding window backward when moving one page before the current window (decrease)', () => {
    // pageVal(4) + 2 equals the first item of the current pageList [6..10] -> triggers the
    // "decrease" edge branch, sliding the window to end right before pageVal, clamped at 0.
    const state = makeState({ pageNumber: 5, pageLimit: 10, pageList: [6, 7, 8, 9, 10] });
    const next = returnPageStateRelatedPageNum(state, 4, 'decrease');
    expect(next.pager.pageNumber).toBe(4);
    expect(next.pager.pageList).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses a positive (non-clamped) window start when far enough from the beginning (decrease)', () => {
    // pageVal(6) + 2 = 8 equals the first item of the current pageList [8..12] -> triggers
    // the "decrease" edge branch; pageVal - pageListSize + 1 = 2, which is > 0, so that
    // (not the 0-clamp) is used as the new window start.
    const state = makeState({ pageNumber: 7, pageLimit: 20, pageList: [8, 9, 10, 11, 12] });
    const next = returnPageStateRelatedPageNum(state, 6, 'decrease');
    expect(next.pager.pageNumber).toBe(6);
    expect(next.pager.pageList).toEqual([3, 4, 5, 6, 7]);
  });

  it('falls through to the plain pageNumber update for a mid-range page not at either boundary', () => {
    const state = makeState({ pageNumber: 4, pageLimit: 20, pageListSize: 5, pageList: [3, 4, 5, 6, 7] });
    const next = returnPageStateRelatedPageNum(state, 5, 'none');
    expect(next.pager.pageNumber).toBe(5);
    expect(next.pager.pageList).toBe(state.pager.pageList);
  });
});

describe('returnLastPageList', () => {
  it('sets pageNumber and recomputes the trailing page window', () => {
    const state = {
      data: [],
      pager: { pageSize: 10, pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 10, remotePage: false },
    };
    const next = returnLastPageList(state, 9);
    expect(next.pager.pageNumber).toBe(9);
    expect(next.pager.pageList).toEqual([6, 7, 8, 9, 10]);
  });

  it('does not clamp the window start when pageNumber is smaller than pageListSize (negative start index)', () => {
    // returnLastPageList has no Math.max(0, ...) clamp (unlike returnPageStateRelatedPageNum),
    // so a small pageNumber relative to pageListSize produces negative leading entries.
    const state = {
      data: [],
      pager: { pageSize: 10, pageNumber: 0, pageList: [1, 2], pageListSize: 5, pageLimit: 2, remotePage: false },
    };
    const next = returnLastPageList(state, 1);
    expect(next.pager.pageNumber).toBe(1);
    expect(next.pager.pageList).toEqual([-2, -1, 0, 1, 2]);
  });
});

describe('moveItem', () => {
  const data = ['a', 'b', 'c', 'd'];

  it('returns the data unchanged when fromItem is not found', () => {
    expect(moveItem(data, 'z', 'b')).toBe(data);
  });

  it('returns the data unchanged when toItem is not found', () => {
    expect(moveItem(data, 'a', 'z')).toBe(data);
  });

  it('returns the data unchanged when fromItem and toItem are the same', () => {
    expect(moveItem(data, 'b', 'b')).toBe(data);
  });

  it('moves an item forward, landing after the target', () => {
    expect(moveItem(data, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward, landing before the target', () => {
    expect(moveItem(data, 'c', 'a')).toEqual(['c', 'a', 'b', 'd']);
  });

  it('does not mutate the original array', () => {
    const original = [...data];
    moveItem(data, 'a', 'c');
    expect(data).toEqual(original);
  });
});
