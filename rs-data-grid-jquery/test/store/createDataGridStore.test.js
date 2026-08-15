import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDataGridStore } from '../../src/rsDataGrid/store/createDataGridStore.js';

function flushMicrotasks() {
  return Promise.resolve().then(() => Promise.resolve());
}

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('createDataGridStore', () => {
  let store;

  beforeEach(() => {
    store = createDataGridStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('initial snapshot', () => {
    it('starts empty with the initialState pager defaults', () => {
      const snapshot = store.getSnapshot();
      expect(snapshot.data).toEqual([]);
      expect(snapshot.rawData).toEqual([]);
      expect(snapshot.pageNumber).toBe(0);
      expect(snapshot.pageSize).toBe(10);
      expect(snapshot.pageList).toEqual([1, 2, 3, 4, 5]);
      expect(snapshot.pageLimit).toBe(10);
      expect(snapshot.filters).toEqual({});
      expect(snapshot.sort).toEqual({ field: null, direction: null });
      expect(snapshot.globalSearch).toBe('');
      expect(snapshot.isLoading).toBe(false);
      expect(snapshot.error).toBeUndefined();
    });
  });

  describe('subscribe/notify', () => {
    it('calls subscribed listeners on state changes', () => {
      const listener = vi.fn();
      store.subscribe(listener);
      store.setData([{ id: 1 }], false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('supports multiple listeners', () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      store.subscribe(l1);
      store.subscribe(l2);
      store.setData([{ id: 1 }], false);
      expect(l1).toHaveBeenCalledTimes(1);
      expect(l2).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe function that stops future notifications', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      store.setData([{ id: 1 }], false);
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      store.setData([{ id: 2 }], false);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('setData', () => {
    it('sets local (non-remote) data and computes pageLimit/pageList', () => {
      const data = Array.from({ length: 12 }, (_, i) => ({ id: i }));
      store.setData(data, false);
      const snapshot = store.getSnapshot();
      expect(snapshot.rawData).toBe(data);
      expect(snapshot.pageLimit).toBe(2);
      expect(snapshot.pageList).toEqual([1, 2]);
    });

    it('sets remote data with a remoteDatasize', () => {
      store.setData([{ id: 1 }], true, 25);
      const snapshot = store.getSnapshot();
      expect(snapshot.pageLimit).toBe(3);
    });
  });

  describe('addRow / removeRow / updateRow (row-identity)', () => {
    it('addRow prepends the row by reference', () => {
      const existing = { id: 1 };
      store.setData([existing], false);
      const newRow = { id: 2 };
      store.addRow(newRow);
      const snapshot = store.getSnapshot();
      expect(snapshot.rawData[0]).toBe(newRow);
      expect(snapshot.rawData[1]).toBe(existing);
      expect(snapshot.rawData.length).toBe(2);
    });

    it('removeRow removes only the row matching by === reference, not by value equality', () => {
      const rowA = { id: 1, name: 'dup' };
      const rowB = { id: 1, name: 'dup' }; // value-identical but different reference
      store.setData([rowA, rowB], false);
      store.removeRow(rowA);
      const snapshot = store.getSnapshot();
      expect(snapshot.rawData).toEqual([rowB]);
      expect(snapshot.rawData[0]).toBe(rowB);
    });

    it('updateRow replaces only the row matching by reference with the new row', () => {
      const rowA = { id: 1, name: 'A' };
      const rowB = { id: 2, name: 'B' };
      store.setData([rowA, rowB], false);
      const updatedA = { id: 1, name: 'A-updated' };
      store.updateRow(rowA, updatedA);
      const snapshot = store.getSnapshot();
      expect(snapshot.rawData[0]).toBe(updatedA);
      expect(snapshot.rawData[1]).toBe(rowB);
    });

    it('preserves remote pager mode/size across addRow/removeRow/updateRow', () => {
      store.setData([{ id: 1 }], true, 50);
      const row = { id: 2 };
      store.addRow(row);
      expect(store.getSnapshot().pageLimit).toBe(5); // ceil(50/10)
    });

    it('moveRow reorders rows via moveItem', () => {
      store.setData(['a', 'b', 'c'], false);
      store.moveRow('a', 'c');
      expect(store.getSnapshot().rawData).toEqual(['b', 'c', 'a']);
    });
  });

  describe('getSnapshot: filters, search, sort composition', () => {
    it('applies filters, then global search, then sort to produce data, while rawData stays unfiltered', () => {
      store.setData(
        [
          { id: 3, color: 'red' },
          { id: 1, color: 'red' },
          { id: 2, color: 'blue' },
        ],
        false
      );
      store.setFilter('color', ['red']);
      const snapshot = store.getSnapshot();
      expect(snapshot.data).toEqual([
        { id: 3, color: 'red' },
        { id: 1, color: 'red' },
      ]);
      expect(snapshot.rawData.length).toBe(3);
    });
  });

  describe('changePageSize', () => {
    it('recomputes pageLimit/pageList from filtered+searched length for local data', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      store.setData(data, false);
      store.changePageSize(5);
      const snapshot = store.getSnapshot();
      expect(snapshot.pageSize).toBe(5);
      expect(snapshot.pageLimit).toBe(5);
      expect(snapshot.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('uses rawData length (not filtered) for remote mode', () => {
      store.setData(Array.from({ length: 3 }, (_, i) => ({ id: i })), true, 30);
      store.changePageSize(10);
      expect(store.getSnapshot().pageLimit).toBe(1); // ceil(3/10) — uses rawData.length while remote per implementation
    });

    it('schedules a coalesced remote refetch only when fetchData was called with remote config', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', true, undefined, 'GET');
      await flushMicrotasks();
      fetchMock.mockClear();
      store.changePageSize(20);
      store.changePageSize(30); // coalesced: only one refetch should fire
      await flushMicrotasks();
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not schedule a refetch when no fetchData/remote config exists yet', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      store.setData([{ id: 1 }], false);
      store.changePageSize(5);
      await flushMicrotasks();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('setFilter', () => {
    it('resets pageNumber to 0 and recomputes pageLimit for local data', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({ id: i, color: i % 2 === 0 ? 'red' : 'blue' }));
      store.setData(data, false);
      store.changePageNumber(1);
      store.setFilter('color', ['red']);
      const snapshot = store.getSnapshot();
      expect(snapshot.pageNumber).toBe(0);
      expect(snapshot.pageLimit).toBe(1); // 10 red rows / pageSize 10
    });

    it('resets pageNumber to 0 without recomputing pageLimit for remote data', () => {
      store.setData([{ id: 1 }], true, 42);
      store.setFilter('color', ['red']);
      const snapshot = store.getSnapshot();
      expect(snapshot.pageNumber).toBe(0);
      expect(snapshot.pageLimit).toBe(5); // unchanged: ceil(42/10)
    });

    it('schedules a coalesced remote refetch when remote config is present', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', true, undefined, 'GET');
      await flushMicrotasks();
      fetchMock.mockClear();
      store.setFilter('color', ['red']);
      await flushMicrotasks();
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('filter=');
    });
  });

  describe('setGlobalSearch', () => {
    it('resets pageNumber to 0 and recomputes pageLimit for local data', () => {
      const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Alan' }];
      store.setData(data, false);
      store.setGlobalSearch('al');
      const snapshot = store.getSnapshot();
      expect(snapshot.pageNumber).toBe(0);
      expect(snapshot.globalSearch).toBe('al');
      expect(snapshot.data).toEqual([{ name: 'Alice' }, { name: 'Alan' }]);
    });

    it('resets pageNumber to 0 for remote data without touching pageLimit', () => {
      store.setData([{ id: 1 }], true, 42);
      store.setGlobalSearch('x');
      expect(store.getSnapshot().pageNumber).toBe(0);
      expect(store.getSnapshot().pageLimit).toBe(5);
    });

    it('schedules a coalesced remote refetch that includes the trimmed search term', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', true, undefined, 'GET');
      await flushMicrotasks();
      fetchMock.mockClear();
      store.setGlobalSearch('  hello  ');
      await flushMicrotasks();
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('search=hello');
    });
  });

  describe('toggleSort', () => {
    it('starts a new field at desc direction', () => {
      store.toggleSort('name');
      expect(store.getSnapshot().sort).toEqual({ field: 'name', direction: 'desc' });
    });

    it('toggles desc -> asc on the same field', () => {
      store.toggleSort('name');
      store.toggleSort('name');
      expect(store.getSnapshot().sort).toEqual({ field: 'name', direction: 'asc' });
    });

    it('toggles asc -> desc on the same field', () => {
      store.toggleSort('name');
      store.toggleSort('name');
      store.toggleSort('name');
      expect(store.getSnapshot().sort).toEqual({ field: 'name', direction: 'desc' });
    });

    it('switching to a different field resets direction to desc', () => {
      store.toggleSort('name');
      store.toggleSort('name');
      store.toggleSort('age');
      expect(store.getSnapshot().sort).toEqual({ field: 'age', direction: 'desc' });
    });

    it('resets pageNumber to 0', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({ id: i }));
      store.setData(data, false);
      store.changePageNumber(1);
      store.toggleSort('id');
      expect(store.getSnapshot().pageNumber).toBe(0);
    });

    it('applies to getSnapshot().data ordering', () => {
      store.setData([{ n: 3 }, { n: 1 }, { n: 2 }], false);
      store.toggleSort('n');
      expect(store.getSnapshot().data).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }]);
    });
  });

  describe('changePageNumber / increasePageNum / decreasePageNum / lastPageNum', () => {
    it('changePageNumber updates the pager via returnPageStateRelatedPageNum', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      store.setData(data, false);
      store.changePageNumber(3);
      expect(store.getSnapshot().pageNumber).toBe(3);
    });

    it('increasePageNum moves forward one page and clamps at the last page', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      store.setData(data, false); // pageLimit 2
      store.increasePageNum();
      expect(store.getSnapshot().pageNumber).toBe(1);
      store.increasePageNum(); // already at last page (pageLimit-1 = 1): stays clamped
      expect(store.getSnapshot().pageNumber).toBe(1);
    });

    it('decreasePageNum moves back one page and clamps at 0', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({ id: i })); // pageLimit 3
      store.setData(data, false);
      store.changePageNumber(2);
      store.decreasePageNum();
      expect(store.getSnapshot().pageNumber).toBe(1);
      store.decreasePageNum();
      expect(store.getSnapshot().pageNumber).toBe(0);
      store.decreasePageNum(); // already 0: clamps
      expect(store.getSnapshot().pageNumber).toBe(0);
    });

    it('lastPageNum jumps to pageLimit - 1', () => {
      const data = Array.from({ length: 55 }, (_, i) => ({ id: i })); // pageLimit 6
      store.setData(data, false);
      store.lastPageNum();
      expect(store.getSnapshot().pageNumber).toBe(5);
    });

    it('each of these schedules a coalesced remote refetch', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', true, undefined, 'GET');
      await flushMicrotasks();
      fetchMock.mockClear();
      store.changePageNumber(1);
      store.increasePageNum();
      store.decreasePageNum();
      store.lastPageNum();
      await flushMicrotasks();
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('changePageListSize', () => {
    it('updates pageListSize and recomputes pageList, without scheduling a refetch', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i })); // pageLimit 10
      store.setData(data, false);
      store.changePageListSize(3);
      const snapshot = store.getSnapshot();
      expect(snapshot.pageList).toEqual([1, 2, 3]);
      await flushMicrotasks();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('fetchData / performFetch', () => {
    it('performs a GET fetch with the resolved section, sets isLoading during the request, then populates data', async () => {
      let resolveJson;
      const jsonPromise = new Promise(resolve => {
        resolveJson = resolve;
      });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => jsonPromise });
      vi.stubGlobal('fetch', fetchMock);

      const listener = vi.fn();
      store.subscribe(listener);
      store.fetchData('http://example.com/api', 'items', false, undefined, undefined, undefined);

      expect(store.getSnapshot().isLoading).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('http://example.com/api', { method: 'GET', headers: undefined });

      resolveJson({ items: [{ id: 1 }, { id: 2 }] });
      await flushMicrotasks();
      await flushMicrotasks();

      const snapshot = store.getSnapshot();
      expect(snapshot.isLoading).toBe(false);
      expect(snapshot.rawData).toEqual([{ id: 1 }, { id: 2 }]);
      expect(snapshot.error).toBeUndefined();
    });

    it('resolves totalSection into remoteDatasize when remote', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ data: [{ id: 1 }], size: 37 })
      );
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', true, 'size', 'GET');
      await flushMicrotasks();
      await flushMicrotasks();
      const snapshot = store.getSnapshot();
      expect(snapshot.pageLimit).toBe(4); // ceil(37/10)
    });

    it('defaults to an empty array when resolveDataPath yields a falsy value', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'missing.path', false);
      await flushMicrotasks();
      await flushMicrotasks();
      expect(store.getSnapshot().rawData).toEqual([]);
    });

    it('sets error and isLoading:false when the response is not ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', false);
      await flushMicrotasks();
      await flushMicrotasks();
      const snapshot = store.getSnapshot();
      expect(snapshot.isLoading).toBe(false);
      expect(snapshot.error).toBeInstanceOf(Error);
      expect(snapshot.error.message).toBe('Request failed with status 500');
    });

    it('wraps a non-Error rejection (e.g. thrown string) into an Error', async () => {
      const fetchMock = vi.fn().mockRejectedValue('network down');
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', false);
      await flushMicrotasks();
      await flushMicrotasks();
      const snapshot = store.getSnapshot();
      expect(snapshot.error).toBeInstanceOf(Error);
      expect(snapshot.error.message).toBe('network down');
    });

    it('passes an Error rejection through unchanged', async () => {
      const originalError = new Error('boom');
      const fetchMock = vi.fn().mockRejectedValue(originalError);
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', false);
      await flushMicrotasks();
      await flushMicrotasks();
      expect(store.getSnapshot().error).toBe(originalError);
    });

    it('builds a remote URL with page/size/filter/sort/search query params', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.setFilter('color', ['red', 'blue']);
      store.toggleSort('name');
      store.setGlobalSearch('term');
      fetchMock.mockClear();
      store.fetchData('http://example.com/api', 'data', true, 'size', 'POST', { 'X-Test': '1' });
      const [url, opts] = fetchMock.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('page')).toBe('0');
      expect(parsed.searchParams.get('size')).toBe('10');
      expect(JSON.parse(parsed.searchParams.get('filter'))).toEqual({ color: ['red', 'blue'] });
      expect(JSON.parse(parsed.searchParams.get('sort'))).toEqual({ field: 'name', direction: 'desc' });
      expect(parsed.searchParams.get('search')).toBe('term');
      expect(opts.method).toBe('POST');
      expect(opts.headers).toEqual({ 'X-Test': '1' });
    });

    it('omits filter/sort/search params when none are active', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api', 'data', true, undefined, 'GET');
      const [url] = fetchMock.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.has('filter')).toBe(false);
      expect(parsed.searchParams.has('sort')).toBe(false);
      expect(parsed.searchParams.has('search')).toBe(false);
    });

    it('excludes filters whose values array is empty from the URL filter param', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.setFilter('color', ['red']);
      store.setFilter('size', []);
      fetchMock.mockClear();
      store.fetchData('http://example.com/api', 'data', true, undefined, 'GET');
      const [url] = fetchMock.mock.calls[0];
      const parsed = new URL(url);
      expect(JSON.parse(parsed.searchParams.get('filter'))).toEqual({ color: ['red'] });
    });

    it('non-remote requests use the plain baseUrl with no query params appended', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://example.com/api?already=there', 'data', false, undefined, 'GET');
      expect(fetchMock).toHaveBeenCalledWith('http://example.com/api?already=there', { method: 'GET', headers: undefined });
    });
  });

  describe('toSameOriginIfInsecure (mixed-content proxy)', () => {
    it('routes an insecure http:// baseUrl through the same-origin proxy when the page itself is https', async () => {
      vi.stubGlobal('location', { protocol: 'https:' });
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://insecure.example.com/data', undefined, false);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledWith('/api/http-proxy/insecure.example.com/data', expect.anything());
    });

    it('leaves an http:// baseUrl untouched when the page itself is not https', async () => {
      vi.stubGlobal('location', { protocol: 'http:' });
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('http://plain.example.com/data', undefined, false);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledWith('http://plain.example.com/data', expect.anything());
    });

    it('leaves an already-https baseUrl untouched regardless of page protocol', async () => {
      vi.stubGlobal('location', { protocol: 'https:' });
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal('fetch', fetchMock);
      store.fetchData('https://secure.example.com/data', undefined, false);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledWith('https://secure.example.com/data', expect.anything());
    });
  });
});
