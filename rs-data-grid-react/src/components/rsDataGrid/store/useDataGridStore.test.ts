import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDataGridStore } from './useDataGridStore';

const jsonResponse = (body: any, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useDataGridStore - direct data mutation', () => {
  it('starts with the initial empty state', () => {
    const { result } = renderHook(() => useDataGridStore());
    expect(result.current.data).toEqual([]);
    expect(result.current.rawData).toEqual([]);
    expect(result.current.pageNumber).toBe(0);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('setData populates data and recomputes local pagination', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 25 }, (_, i) => ({ id: i })),
        false
      );
    });
    expect(result.current.rawData).toHaveLength(25);
    expect(result.current.data).toHaveLength(25);
    expect(result.current.pageLimit).toBe(3);
    expect(result.current.pageList).toEqual([1, 2, 3]);
  });

  it('setData with remote true stores the remote data size and derived pagination', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([{ id: 1 }], true, 25);
    });
    expect(result.current.pageLimit).toBe(3);
    expect(result.current.pageList).toEqual([1]);
  });

  it('addRow prepends a row and keeps the remote paging flag', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([{ id: 1 }], true, 25);
    });
    act(() => {
      result.current.addRow({ id: 'new' });
    });
    expect(result.current.rawData[0]).toEqual({ id: 'new' });
    expect(result.current.rawData).toHaveLength(2);
  });

  it('removeRow removes the matching row by reference', () => {
    const rowA = { id: 1 };
    const rowB = { id: 2 };
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([rowA, rowB], false);
    });
    act(() => {
      result.current.removeRow(rowA);
    });
    expect(result.current.rawData).toEqual([rowB]);
  });

  it('updateRow replaces the matching row by reference', () => {
    const rowA = { id: 1 };
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([rowA], false);
    });
    act(() => {
      result.current.updateRow(rowA, { id: 99 });
    });
    expect(result.current.rawData).toEqual([{ id: 99 }]);
  });
});

describe('useDataGridStore - derived data (filters/search/sort)', () => {
  it('exposes filtered, searched and sorted data through `data`', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        [
          { id: 1, name: 'Charlie' },
          { id: 2, name: 'Alice' },
          { id: 3, name: 'Bob' },
        ],
        false
      );
    });
    act(() => {
      result.current.toggleSort('name');
    });
    expect(result.current.sort).toEqual({ field: 'name', direction: 'desc' });
    expect(result.current.data.map(r => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);

    act(() => {
      result.current.toggleSort('name');
    });
    expect(result.current.sort).toEqual({ field: 'name', direction: 'asc' });
    expect(result.current.data.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);

    act(() => {
      result.current.toggleSort('name');
    });
    expect(result.current.sort).toEqual({ field: 'name', direction: 'desc' });
  });

  it('toggleSort resets the page number back to 0', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 50 }, (_, i) => ({ id: i })),
        false
      );
    });
    act(() => {
      result.current.increasePageNum();
    });
    expect(result.current.pageNumber).toBe(1);
    act(() => {
      result.current.toggleSort('id');
    });
    expect(result.current.pageNumber).toBe(0);
  });
});

describe('useDataGridStore - pagination controls', () => {
  it('changePageSize recomputes pageLimit from filtered+searched local data', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 20 }, (_, i) => ({ id: i, tag: i < 10 ? 'a' : 'b' })),
        false
      );
    });
    act(() => {
      result.current.setFilter('tag', ['a']);
    });
    act(() => {
      result.current.changePageSize(4);
    });
    expect(result.current.pageSize).toBe(4);
    expect(result.current.pageLimit).toBe(3);
  });

  it('changePageSize uses raw data length (not filtered) in remote mode', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([{ id: 1 }, { id: 2 }, { id: 3 }], true, 3);
    });
    act(() => {
      result.current.changePageSize(2);
    });
    expect(result.current.pageLimit).toBe(2);
  });

  it('setFilter recomputes pageLimit/pageList in local mode and resets pageNumber', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 20 }, (_, i) => ({ id: i, tag: i < 5 ? 'a' : 'b' })),
        false
      );
    });
    act(() => {
      result.current.increasePageNum();
    });
    expect(result.current.pageNumber).toBe(1);
    act(() => {
      result.current.setFilter('tag', ['a']);
    });
    expect(result.current.pageNumber).toBe(0);
    expect(result.current.pageLimit).toBe(1);
    expect(result.current.filters).toEqual({ tag: ['a'] });
  });

  it('setFilter only resets pageNumber in remote mode (no client-side recompute)', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([{ id: 1 }], true, 1);
    });
    const limitBefore = result.current.pageLimit;
    act(() => {
      result.current.setFilter('a', ['x']);
    });
    expect(result.current.pageNumber).toBe(0);
    expect(result.current.pageLimit).toBe(limitBefore);
  });

  it('setGlobalSearch recomputes pageLimit/pageList in local mode and resets pageNumber', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        [
          { id: 1, name: 'apple' },
          { id: 2, name: 'banana' },
          { id: 3, name: 'apricot' },
        ],
        false
      );
    });
    act(() => {
      result.current.changePageSize(1);
    });
    act(() => {
      result.current.increasePageNum();
    });
    expect(result.current.pageNumber).toBe(1);
    act(() => {
      result.current.setGlobalSearch('ap');
    });
    expect(result.current.pageNumber).toBe(0);
    expect(result.current.pageLimit).toBe(2);
    expect(result.current.globalSearch).toBe('ap');
  });

  it('setGlobalSearch only resets pageNumber in remote mode', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData([{ id: 1 }], true, 1);
    });
    const limitBefore = result.current.pageLimit;
    act(() => {
      result.current.setGlobalSearch('term');
    });
    expect(result.current.pageNumber).toBe(0);
    expect(result.current.pageLimit).toBe(limitBefore);
  });

  it('changePageListSize recomputes the visible page list', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 100 }, (_, i) => ({ id: i })),
        false
      );
    });
    expect(result.current.pageList).toEqual([1, 2, 3, 4, 5]);
    act(() => {
      result.current.changePageListSize(3);
    });
    expect(result.current.pageList).toEqual([1, 2, 3]);
  });

  it('changePageNumber jumps directly to a given page', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 100 }, (_, i) => ({ id: i })),
        false
      );
    });
    act(() => {
      result.current.changePageNumber(9);
    });
    expect(result.current.pageNumber).toBe(9);
  });

  it('increasePageNum stays on the last page once reached', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 30 }, (_, i) => ({ id: i })),
        false
      );
    });
    expect(result.current.pageLimit).toBe(3);
    act(() => {
      result.current.increasePageNum();
    });
    act(() => {
      result.current.increasePageNum();
    });
    expect(result.current.pageNumber).toBe(2);
    act(() => {
      result.current.increasePageNum();
    });
    expect(result.current.pageNumber).toBe(2);
  });

  it('decreasePageNum stays on the first page once reached', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 30 }, (_, i) => ({ id: i })),
        false
      );
    });
    act(() => {
      result.current.decreasePageNum();
    });
    expect(result.current.pageNumber).toBe(0);
    act(() => {
      result.current.increasePageNum();
    });
    expect(result.current.pageNumber).toBe(1);
    act(() => {
      result.current.decreasePageNum();
    });
    expect(result.current.pageNumber).toBe(0);
  });

  it('lastPageNum jumps to the final page and slides the page list to the end', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setData(
        Array.from({ length: 100 }, (_, i) => ({ id: i })),
        false
      );
    });
    expect(result.current.pageLimit).toBe(10);
    act(() => {
      result.current.lastPageNum();
    });
    expect(result.current.pageNumber).toBe(9);
    expect(result.current.pageList).toEqual([6, 7, 8, 9, 10]);
  });
});

describe('useDataGridStore - fetching', () => {
  it('never calls fetch before fetchData has been invoked, even as filters/sort/search/page change', () => {
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.setFilter('a', ['1']);
    });
    act(() => {
      result.current.toggleSort('a');
    });
    act(() => {
      result.current.setGlobalSearch('x');
    });
    act(() => {
      result.current.changePageNumber(0);
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('performs a local fetch, resolving the row array through the entry section', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ items: [{ id: 1 }, { id: 2 }] }));
    const { result } = renderHook(() => useDataGridStore());

    act(() => {
      result.current.fetchData('http://api.test/data', 'items', false);
    });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rawData).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetch).toHaveBeenCalledWith('http://api.test/data', { method: 'GET', headers: undefined });
  });

  it('defaults resolved data to an empty array when resolveDataPath yields nothing', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ items: null }));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', 'items', false);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rawData).toEqual([]);
  });

  it('sets an error when the response is not ok', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({}, false, 500));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', undefined, false);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('Request failed with status 500');
  });

  it('preserves a real Error instance from a rejected fetch', async () => {
    (fetch as any).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', undefined, false);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
  });

  it('wraps a non-Error rejection reason into an Error instance', async () => {
    (fetch as any).mockRejectedValue('network down');
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', undefined, false);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network down');
  });

  it('builds a remote URL carrying page/size/filter/sort/search and resolves the total from totalSection', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ items: [{ id: 1 }], count: 42 }));
    const { result } = renderHook(() => useDataGridStore());

    act(() => {
      result.current.setFilter('status', ['active']);
    });
    act(() => {
      result.current.toggleSort('name');
    });
    act(() => {
      result.current.setGlobalSearch('foo');
    });
    act(() => {
      result.current.fetchData('http://api.test/data', 'items', true, 'count', 'POST', { 'X-Test': '1' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = (fetch as any).mock.calls[0];
    expect(calledUrl).toContain('page=0');
    expect(calledUrl).toContain('size=10');
    expect(calledUrl).toContain('filter=');
    expect(decodeURIComponent(calledUrl)).toContain('"status":["active"]');
    expect(calledUrl).toContain('sort=');
    expect(decodeURIComponent(calledUrl)).toContain('"field":"name"');
    expect(calledUrl).toContain('search=foo');
    expect(calledInit).toEqual({ method: 'POST', headers: { 'X-Test': '1' } });

    expect(result.current.pageLimit).toBe(5);
  });

  it('omits filter/sort/search query params when they are inactive', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ items: [] }));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', 'items', true);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const [calledUrl] = (fetch as any).mock.calls[0];
    expect(calledUrl).not.toContain('filter=');
    expect(calledUrl).not.toContain('sort=');
    expect(calledUrl).not.toContain('search=');
  });

  it('does not automatically refetch in local (non-remote) mode when filters/sort/search/page change', async () => {
    (fetch as any).mockResolvedValue(jsonResponse([{ id: 1 }]));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', undefined, false);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setFilter('a', ['x']);
    });
    act(() => {
      result.current.toggleSort('a');
    });
    act(() => {
      result.current.setGlobalSearch('y');
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('automatically refetches in remote mode whenever page/size/filter/sort/search change', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ items: [] }));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', 'items', true);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.changePageSize(20);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setFilter('a', ['x']);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    act(() => {
      result.current.toggleSort('name');
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));

    act(() => {
      result.current.setGlobalSearch('bar');
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));

    act(() => {
      result.current.increasePageNum();
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
  });

  it('calling fetchData again re-triggers the initial-fetch effect with a new config', async () => {
    (fetch as any).mockResolvedValue(jsonResponse([{ id: 1 }]));
    const { result } = renderHook(() => useDataGridStore());
    act(() => {
      result.current.fetchData('http://api.test/data', undefined, false);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.fetchData('http://api.test/data-2', undefined, false);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect((fetch as any).mock.calls[1][0]).toBe('http://api.test/data-2');
  });
});
