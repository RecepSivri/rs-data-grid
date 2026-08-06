import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { useDataGridStore } from './useDataGridStore';

// Lets pending fetch .then()/.catch() chains resolve before we assert.
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useDataGridStore', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with the default initial state', () => {
    const store = useDataGridStore();
    expect(store.data).toEqual([]);
    expect(store.rawData).toEqual([]);
    expect(store.pageNumber).toBe(0);
    expect(store.pageSize).toBe(10);
    expect(store.pageList).toEqual([1, 2, 3, 4, 5]);
    expect(store.pageLimit).toBe(10);
    expect(store.filters).toEqual({});
    expect(store.sort).toEqual({ field: null, direction: null });
    expect(store.globalSearch).toBe('');
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeUndefined();
  });

  describe('row mutations', () => {
    it('setData replaces rows and recomputes the pager', () => {
      const store = useDataGridStore();
      store.setData([{ id: 1 }, { id: 2 }], false);
      expect(store.rawData).toEqual([{ id: 1 }, { id: 2 }]);
      expect(store.pageLimit).toBe(1);
    });

    it('addRow prepends a row and recomputes the pager using current remote state', () => {
      const store = useDataGridStore();
      store.setData([{ id: 1 }], true, 1);
      store.addRow({ id: 2 });
      expect(store.rawData[0]).toEqual({ id: 2 });
      expect(store.rawData.length).toBe(2);
    });

    it('updateRow replaces the matching row by reference', () => {
      const store = useDataGridStore();
      const original = { id: 1 };
      store.setData([original, { id: 2 }], false);
      store.updateRow(original, { id: 99 });
      expect(store.rawData).toEqual([{ id: 99 }, { id: 2 }]);
    });

    it('removeRow drops the matching row by reference', () => {
      const store = useDataGridStore();
      const doomed = { id: 1 };
      store.setData([doomed, { id: 2 }], false);
      store.removeRow(doomed);
      expect(store.rawData).toEqual([{ id: 2 }]);
    });
  });

  it('exposes filtered/searched/sorted data through the data getter', () => {
    const store = useDataGridStore();
    store.setData(
      [
        { n: 'beta', v: 2 },
        { n: 'alpha', v: 1 },
      ],
      false
    );
    store.sort.value = { field: 'n', direction: 'asc' };
    expect(store.data.map((r: any) => r.n)).toEqual(['alpha', 'beta']);

    store.filters.value = { n: ['alpha'] };
    expect(store.data.length).toBe(1);

    store.globalSearch.value = 'nomatch';
    expect(store.data.length).toBe(0);
  });

  describe('changePageSize', () => {
    it('recalculates pageLimit from searched data length in local mode', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 25 }, (_, i) => ({ id: i })),
        false
      );
      store.changePageSize(5);
      expect(store.pageSize).toBe(5);
      expect(store.pageLimit).toBe(5);
    });

    it('recalculates pageLimit from raw data length in remote mode', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 3 }, (_, i) => ({ id: i })),
        true,
        30
      );
      store.changePageSize(10);
      expect(store.pageLimit).toBe(1);
    });
  });

  describe('setFilter', () => {
    it('resets the page number and recalculates pageLimit in local mode', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 10 }, (_, i) => ({ cat: i % 2 === 0 ? 'a' : 'b' })),
        false
      );
      store.changePageSize(5);
      store.changePageNumber(1);
      store.setFilter('cat', ['a']);
      expect(store.pageNumber).toBe(0);
      expect(store.pageLimit).toBe(1);
      expect(store.filters).toEqual({ cat: ['a'] });
    });

    it('only resets the page number in remote mode', () => {
      const store = useDataGridStore();
      store.setData([], true, 100);
      store.changePageNumber(2);
      store.setFilter('x', ['y']);
      expect(store.pageNumber).toBe(0);
      expect(store.filters).toEqual({ x: ['y'] });
    });
  });

  describe('setGlobalSearch', () => {
    it('resets the page number and recalculates pageLimit in local mode', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 10 }, (_, i) => ({ n: i % 2 === 0 ? 'match' : 'skip' })),
        false
      );
      store.changePageSize(5);
      store.changePageNumber(1);
      store.setGlobalSearch('match');
      expect(store.pageNumber).toBe(0);
      expect(store.pageLimit).toBe(1);
      expect(store.globalSearch).toBe('match');
    });

    it('only resets the page number in remote mode', () => {
      const store = useDataGridStore();
      store.setData([], true, 100);
      store.changePageNumber(2);
      store.setGlobalSearch('term');
      expect(store.pageNumber).toBe(0);
      expect(store.globalSearch).toBe('term');
    });
  });

  describe('toggleSort', () => {
    it('defaults a newly sorted field to desc, then flips asc/desc, and resets on field change', () => {
      const store = useDataGridStore();
      store.toggleSort('name');
      expect(store.sort).toEqual({ field: 'name', direction: 'desc' });
      store.toggleSort('name');
      expect(store.sort).toEqual({ field: 'name', direction: 'asc' });
      store.toggleSort('name');
      expect(store.sort).toEqual({ field: 'name', direction: 'desc' });
      store.toggleSort('other');
      expect(store.sort).toEqual({ field: 'other', direction: 'desc' });
    });

    it('resets the page number', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 50 }, (_, i) => ({ id: i })),
        false
      );
      store.changePageNumber(2);
      store.toggleSort('id');
      expect(store.pageNumber).toBe(0);
    });
  });

  describe('pager navigation', () => {
    it('changePageNumber / increasePageNum / decreasePageNum / lastPageNum move the page window', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 50 }, (_, i) => ({ id: i })),
        false
      );
      store.changePageNumber(2);
      expect(store.pageNumber).toBe(2);

      store.increasePageNum();
      expect(store.pageNumber).toBe(3);

      store.decreasePageNum();
      expect(store.pageNumber).toBe(2);

      store.lastPageNum();
      expect(store.pageNumber).toBe(store.pageLimit - 1);

      store.increasePageNum();
      expect(store.pageNumber).toBe(store.pageLimit - 1);
    });

    it('decreasePageNum stays clamped at the first page', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 50 }, (_, i) => ({ id: i })),
        false
      );
      store.decreasePageNum();
      expect(store.pageNumber).toBe(0);
    });

    it('changePageListSize resizes the visible page window', () => {
      const store = useDataGridStore();
      store.setData(
        Array.from({ length: 50 }, (_, i) => ({ id: i })),
        false
      );
      store.changePageListSize(3);
      expect(store.pageList.length).toBe(3);
    });
  });

  describe('fetchData / performFetch', () => {
    it('fetches locally, resolves the configured data path, and stops loading', async () => {
      const json = vi.fn().mockResolvedValue({ items: [{ id: 1 }] });
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', 'items', false);
      await nextTick();
      expect(store.isLoading).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://x/api', { method: 'GET', headers: undefined });

      await flushPromises();
      await nextTick();
      expect(store.isLoading).toBe(false);
      expect(store.rawData).toEqual([{ id: 1 }]);
      expect(store.error).toBeUndefined();
    });

    it('falls back to an empty array when the resolved data path is empty', async () => {
      const json = vi.fn().mockResolvedValue({ items: undefined });
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', 'items', false);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect(store.rawData).toEqual([]);
    });

    it('uses a custom method and headers when provided', async () => {
      const json = vi.fn().mockResolvedValue([]);
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', undefined, false, undefined, 'POST', { 'X-Test': '1' });
      await nextTick();
      expect(fetch).toHaveBeenCalledWith('http://x/api', { method: 'POST', headers: { 'X-Test': '1' } });
      await flushPromises();
      await nextTick();
    });

    it('sets an error when the response is not ok', async () => {
      const json = vi.fn();
      (fetch as any).mockResolvedValue({ ok: false, status: 500, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', undefined, false);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect(store.isLoading).toBe(false);
      expect(store.error?.message).toBe('Request failed with status 500');
    });

    it('sets an error directly when fetch rejects with an Error', async () => {
      (fetch as any).mockRejectedValue(new Error('network down'));
      const store = useDataGridStore();

      store.fetchData('http://x/api', undefined, false);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect(store.error?.message).toBe('network down');
      expect(store.isLoading).toBe(false);
    });

    it('wraps a non-Error rejection in a new Error', async () => {
      (fetch as any).mockRejectedValue('boom');
      const store = useDataGridStore();

      store.fetchData('http://x/api', undefined, false);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect(store.error).toBeInstanceOf(Error);
      expect(store.error?.message).toBe('boom');
    });

    it('builds a remote URL with page/size params and reads the total from totalSection', async () => {
      const json = vi.fn().mockResolvedValue({ rows: [{ id: 1 }], size: 42 });
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', 'rows', true, 'size');
      await nextTick();
      const calledUrl = (fetch as any).mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=0');
      expect(calledUrl).toContain('size=10');

      await flushPromises();
      await nextTick();
      expect(store.rawData).toEqual([{ id: 1 }]);
      expect(store.pageLimit).toBe(5);
    });

    it('includes active filters, sort, and search terms in the remote URL', async () => {
      const json = vi.fn().mockResolvedValue({ rows: [] });
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.filters.value = { cat: ['a'], empty: [] };
      store.sort.value = { field: 'name', direction: 'asc' };
      store.globalSearch.value = '  term  ';

      store.fetchData('http://x/api', 'rows', true);
      await nextTick();
      const calledUrl = (fetch as any).mock.calls[0][0] as string;
      const parsed = new URL(calledUrl);
      expect(JSON.parse(parsed.searchParams.get('filter')!)).toEqual({ cat: ['a'] });
      expect(JSON.parse(parsed.searchParams.get('sort')!)).toEqual({ field: 'name', direction: 'asc' });
      expect(parsed.searchParams.get('search')).toBe('term');

      await flushPromises();
      await nextTick();
    });

    it('refetches on page/size/filter/sort/search changes in remote mode', async () => {
      const json = vi.fn().mockResolvedValue({ rows: [] });
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', 'rows', true);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect((fetch as any).mock.calls.length).toBe(1);

      store.changePageNumber(1);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect((fetch as any).mock.calls.length).toBe(2);
    });

    it('does not refetch on page changes when there is no fetch config yet', async () => {
      const store = useDataGridStore();
      store.changePageNumber(0);
      await nextTick();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('does not refetch on page/filter changes in local mode', async () => {
      const json = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });
      (fetch as any).mockResolvedValue({ ok: true, json });
      const store = useDataGridStore();

      store.fetchData('http://x/api', 'rows', false);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect((fetch as any).mock.calls.length).toBe(1);

      store.setFilter('a', ['b']);
      await nextTick();
      await flushPromises();
      await nextTick();
      expect((fetch as any).mock.calls.length).toBe(1);
    });
  });
});
