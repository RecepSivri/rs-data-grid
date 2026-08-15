import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataGridStore } from './createDataGridStore';

const flushMicrotasks = async (times = 10) => {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
};

const okJsonResponse = body => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('subscribe/getSnapshot', () => {
  it('has an empty-data, non-loading, no-error initial snapshot', () => {
    const store = createDataGridStore();
    const snapshot = store.getSnapshot();
    expect(snapshot.data).toEqual([]);
    expect(snapshot.rawData).toEqual([]);
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.error).toBeUndefined();
    expect(snapshot.filters).toEqual({});
    expect(snapshot.sort).toEqual({ field: null, direction: null });
    expect(snapshot.globalSearch).toBe('');
  });

  it('notifies subscribed listeners on state changes, and stops after unsubscribe', () => {
    const store = createDataGridStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setData([1, 2, 3], false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setData([4, 5], false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('derives the snapshot data by applying filters, search, then sort', () => {
    const store = createDataGridStore();
    store.setData(
      [
        { id: 1, name: 'Banana' },
        { id: 2, name: 'Apple' },
        { id: 3, name: 'Cherry' },
      ],
      false
    );
    store.setGlobalSearch('an');
    const snapshot = store.getSnapshot();
    expect(snapshot.data).toEqual([{ id: 1, name: 'Banana' }]);
    expect(snapshot.rawData.length).toBe(3);
  });
});

describe('setData/addRow/removeRow/updateRow/moveRow', () => {
  it('setData replaces the data set', () => {
    const store = createDataGridStore();
    store.setData([1, 2], false);
    expect(store.getSnapshot().rawData).toEqual([1, 2]);
  });

  it('addRow prepends a row', () => {
    const store = createDataGridStore();
    store.setData([{ id: 2 }], false);
    store.addRow({ id: 1 });
    expect(store.getSnapshot().rawData).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('removeRow removes a row by reference', () => {
    const store = createDataGridStore();
    const row = { id: 1 };
    store.setData([row, { id: 2 }], false);
    store.removeRow(row);
    expect(store.getSnapshot().rawData).toEqual([{ id: 2 }]);
  });

  it('updateRow replaces the matching row by reference and leaves others untouched', () => {
    const store = createDataGridStore();
    const row = { id: 1, name: 'old' };
    const other = { id: 2, name: 'unchanged' };
    store.setData([row, other], false);
    store.updateRow(row, { id: 1, name: 'new' });
    expect(store.getSnapshot().rawData).toEqual([{ id: 1, name: 'new' }, { id: 2, name: 'unchanged' }]);
  });

  it('moveRow reorders rows using moveItem', () => {
    const store = createDataGridStore();
    store.setData(['a', 'b', 'c'], false);
    store.moveRow('a', 'c');
    expect(store.getSnapshot().rawData).toEqual(['b', 'c', 'a']);
  });
});

describe('fetchData', () => {
  it('fetches, resolves the section path, and populates local-mode data', async () => {
    global.fetch.mockResolvedValueOnce(okJsonResponse({ results: [{ id: 1 }, { id: 2 }] }));
    const store = createDataGridStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.fetchData('https://api.example.com/movies', 'results', false, undefined, 'GET', {});
    expect(store.getSnapshot().isLoading).toBe(true);
    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', { method: 'GET', headers: {} });
    const snapshot = store.getSnapshot();
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.rawData).toEqual([{ id: 1 }, { id: 2 }]);
    expect(snapshot.error).toBeUndefined();
  });

  it('falls back to an empty array when the section path resolves to a falsy value', async () => {
    global.fetch.mockResolvedValueOnce(okJsonResponse({ other: [] }));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', 'missing', false);
    await flushMicrotasks();
    expect(store.getSnapshot().rawData).toEqual([]);
  });

  it('defaults to GET with no headers when method/headers are omitted', async () => {
    global.fetch.mockResolvedValueOnce(okJsonResponse([]));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', undefined, false);
    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/movies', { method: 'GET', headers: undefined });
  });

  it('computes remoteDataSize from totalSection in remote mode', async () => {
    global.fetch.mockResolvedValueOnce(okJsonResponse({ items: [{ id: 1 }], total: 37 }));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', 'items', true, 'total', 'GET', {});
    await flushMicrotasks();
    const snapshot = store.getSnapshot();
    expect(snapshot.pageLimit).toBe(4);
  });

  it('sets an error and clears isLoading when the response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', undefined, false);
    await flushMicrotasks();
    const snapshot = store.getSnapshot();
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.error).toBeInstanceOf(Error);
    expect(snapshot.error.message).toBe('Request failed with status 500');
  });

  it('wraps a rejected fetch promise as an Error when it already is one', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', undefined, false);
    await flushMicrotasks();
    const snapshot = store.getSnapshot();
    expect(snapshot.error).toBeInstanceOf(Error);
    expect(snapshot.error.message).toBe('network down');
  });

  it('wraps a rejected fetch promise that is not an Error instance', async () => {
    global.fetch.mockRejectedValueOnce('boom');
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', undefined, false);
    await flushMicrotasks();
    const snapshot = store.getSnapshot();
    expect(snapshot.error).toBeInstanceOf(Error);
    expect(snapshot.error.message).toBe('boom');
  });

  it('routes an insecure http:// baseUrl through the same-origin proxy when the page itself is https', async () => {
    vi.stubGlobal('location', { protocol: 'https:' });
    global.fetch.mockResolvedValueOnce(okJsonResponse([]));
    const store = createDataGridStore();
    store.fetchData('http://insecure.example.com/data', undefined, false);
    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledWith('/api/http-proxy/insecure.example.com/data', expect.anything());
  });

  it('leaves an http:// baseUrl untouched when the page itself is not https', async () => {
    vi.stubGlobal('location', { protocol: 'http:' });
    global.fetch.mockResolvedValueOnce(okJsonResponse([]));
    const store = createDataGridStore();
    store.fetchData('http://plain.example.com/data', undefined, false);
    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledWith('http://plain.example.com/data', expect.anything());
  });

  it('leaves an already-https baseUrl untouched regardless of page protocol', async () => {
    vi.stubGlobal('location', { protocol: 'https:' });
    global.fetch.mockResolvedValueOnce(okJsonResponse([]));
    const store = createDataGridStore();
    store.fetchData('https://secure.example.com/data', undefined, false);
    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledWith('https://secure.example.com/data', expect.anything());
  });

  it('builds a remote-mode URL with page/size and, once set, filter/sort/search params', async () => {
    global.fetch.mockResolvedValue(okJsonResponse({ items: [], total: 0 }));
    const store = createDataGridStore();
    store.setFilter('category', ['a']);
    store.setGlobalSearch('term');
    store.toggleSort('name');
    global.fetch.mockClear();
    store.fetchData('https://api.example.com/movies', 'items', true, 'total', 'GET', {});
    await flushMicrotasks();
    const calledUrl = new URL(global.fetch.mock.calls[0][0], 'https://api.example.com');
    expect(calledUrl.searchParams.get('page')).toBe('0');
    expect(calledUrl.searchParams.get('size')).toBe('10');
    expect(calledUrl.searchParams.get('filter')).toBe(JSON.stringify({ category: ['a'] }));
    expect(calledUrl.searchParams.get('sort')).toBe(JSON.stringify({ field: 'name', direction: 'desc' }));
    expect(calledUrl.searchParams.get('search')).toBe('term');
  });

  it('omits filter/sort/search params from the remote URL when none are active', async () => {
    global.fetch.mockResolvedValueOnce(okJsonResponse({ items: [], total: 0 }));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', 'items', true, 'total', 'GET', {});
    await flushMicrotasks();
    const calledUrl = new URL(global.fetch.mock.calls[0][0], 'https://api.example.com');
    expect(calledUrl.searchParams.has('filter')).toBe(false);
    expect(calledUrl.searchParams.has('sort')).toBe(false);
    expect(calledUrl.searchParams.has('search')).toBe(false);
  });
});

describe('changePageSize', () => {
  it('recomputes pageLimit from the filtered+searched length in local mode', () => {
    const store = createDataGridStore();
    store.setData([{ n: 1 }, { n: 2 }, { n: 3 }], false);
    store.changePageSize(2);
    expect(store.getSnapshot().pageLimit).toBe(2);
  });

  it('recomputes pageLimit from the raw data length in remote mode', () => {
    const store = createDataGridStore();
    store.setData(new Array(5).fill(0), true, 5);
    store.changePageSize(2);
    expect(store.getSnapshot().pageLimit).toBe(3);
  });

  it('schedules exactly one coalesced remote refetch even with multiple synchronous calls', async () => {
    global.fetch.mockResolvedValue(okJsonResponse({ items: [], total: 0 }));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', 'items', true, 'total', 'GET', {});
    await flushMicrotasks();
    global.fetch.mockClear();
    store.changePageSize(20);
    store.changePageSize(30);
    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when no fetchData call has established a fetchConfig yet', async () => {
    const store = createDataGridStore();
    store.setData([1, 2, 3], false);
    store.changePageSize(2);
    await flushMicrotasks();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not schedule a refetch in local mode', async () => {
    global.fetch.mockResolvedValueOnce(okJsonResponse([1, 2, 3]));
    const store = createDataGridStore();
    store.fetchData('https://api.example.com/movies', undefined, false);
    await flushMicrotasks();
    global.fetch.mockClear();
    store.changePageSize(2);
    await flushMicrotasks();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('setFilter', () => {
  it('resets pageNumber to 0 and recomputes pageLimit in local mode', () => {
    const store = createDataGridStore();
    store.setData([{ cat: 'a' }, { cat: 'b' }, { cat: 'a' }], false);
    store.changePageSize(1);
    store.changePageNumber(2);
    store.setFilter('cat', ['a']);
    const snapshot = store.getSnapshot();
    expect(snapshot.pageNumber).toBe(0);
    expect(snapshot.pageLimit).toBe(2);
    expect(snapshot.filters).toEqual({ cat: ['a'] });
  });

  it('resets pageNumber to 0 without recomputing pageLimit in remote mode', () => {
    const store = createDataGridStore();
    store.setData([1, 2, 3], true, 30);
    store.changePageNumber(2);
    store.setFilter('cat', ['a']);
    expect(store.getSnapshot().pageNumber).toBe(0);
  });
});

describe('setGlobalSearch', () => {
  it('resets pageNumber to 0 and recomputes pageLimit in local mode', () => {
    const store = createDataGridStore();
    store.setData([{ n: 'Alpha' }, { n: 'Beta' }], false);
    store.changePageNumber(0);
    store.setGlobalSearch('Alpha');
    const snapshot = store.getSnapshot();
    expect(snapshot.pageNumber).toBe(0);
    expect(snapshot.globalSearch).toBe('Alpha');
    expect(snapshot.data).toEqual([{ n: 'Alpha' }]);
  });

  it('resets pageNumber to 0 without recomputing pageLimit in remote mode', () => {
    const store = createDataGridStore();
    store.setData([1, 2, 3], true, 30);
    store.setGlobalSearch('x');
    expect(store.getSnapshot().pageNumber).toBe(0);
  });
});

describe('toggleSort', () => {
  it('sorts a new field descending first', () => {
    const store = createDataGridStore();
    store.toggleSort('name');
    expect(store.getSnapshot().sort).toEqual({ field: 'name', direction: 'desc' });
  });

  it('toggles direction on repeated clicks of the same field', () => {
    const store = createDataGridStore();
    store.toggleSort('name');
    store.toggleSort('name');
    expect(store.getSnapshot().sort).toEqual({ field: 'name', direction: 'asc' });
    store.toggleSort('name');
    expect(store.getSnapshot().sort).toEqual({ field: 'name', direction: 'desc' });
  });

  it('resets pageNumber to 0', () => {
    const store = createDataGridStore();
    store.setData([1, 2, 3], false);
    store.changePageSize(1);
    store.changePageNumber(2);
    store.toggleSort('name');
    expect(store.getSnapshot().pageNumber).toBe(0);
  });
});

describe('changePageNumber', () => {
  it('delegates to returnPageStateRelatedPageNum', () => {
    const store = createDataGridStore();
    store.setData(new Array(30).fill(0), false);
    store.changePageSize(1);
    store.changePageNumber(5);
    expect(store.getSnapshot().pageNumber).toBe(5);
  });
});

describe('changePageListSize', () => {
  it('rebuilds pageList for the new pageListSize', () => {
    const store = createDataGridStore();
    store.setData(new Array(30).fill(0), false);
    store.changePageSize(1);
    store.changePageListSize(3);
    expect(store.getSnapshot().pageList).toEqual([1, 2, 3]);
  });
});

describe('increasePageNum/decreasePageNum/lastPageNum', () => {
  it('increasePageNum advances the page number', () => {
    const store = createDataGridStore();
    store.setData(new Array(30).fill(0), false);
    store.changePageSize(1);
    store.increasePageNum();
    expect(store.getSnapshot().pageNumber).toBe(1);
  });

  it('increasePageNum stays put once already on the last page', () => {
    const store = createDataGridStore();
    store.setData(new Array(3).fill(0), false);
    store.changePageSize(1);
    store.lastPageNum();
    store.increasePageNum();
    expect(store.getSnapshot().pageNumber).toBe(2);
  });

  it('decreasePageNum moves back a page', () => {
    const store = createDataGridStore();
    store.setData(new Array(30).fill(0), false);
    store.changePageSize(1);
    store.changePageNumber(5);
    store.decreasePageNum();
    expect(store.getSnapshot().pageNumber).toBe(4);
  });

  it('decreasePageNum stays put once already on the first page', () => {
    const store = createDataGridStore();
    store.setData(new Array(30).fill(0), false);
    store.changePageSize(1);
    store.decreasePageNum();
    expect(store.getSnapshot().pageNumber).toBe(0);
  });

  it('lastPageNum jumps straight to the last page', () => {
    const store = createDataGridStore();
    store.setData(new Array(30).fill(0), false);
    store.changePageSize(1);
    store.lastPageNum();
    expect(store.getSnapshot().pageNumber).toBe(29);
  });
});
