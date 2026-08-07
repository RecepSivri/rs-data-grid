import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FetchConfig,
  SortState,
  applyFilters,
  applyGlobalSearch,
  applySort,
  initialState,
  resolveDataPath,
  returnLastPageList,
  returnPageList,
  returnPageStateRelatedPageNum,
  setDataWrapper,
} from './dataGridStore';

// Any http:// fetchUrl (the demo default or a custom one typed into the
// sidebar) gets blocked as mixed content when this page itself is loaded
// over HTTPS. Routing it through a same-origin proxy (see netlify.toml)
// keeps the browser's connection on HTTPS regardless of the target.
function toSameOriginIfInsecure(url: string): string {
  if (typeof location !== 'undefined' && location.protocol === 'https:' && /^http:\/\//i.test(url)) {
    return `/api/http-proxy/${url.slice('http://'.length)}`;
  }
  return url;
}

export const useDataGridStore = () => {
  const [state, setState] = useState<AppState>(initialState);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<SortState>({ field: null, direction: null });
  const [globalSearch, setGlobalSearchState] = useState<string>('');
  const [fetchConfig, setFetchConfig] = useState<FetchConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const sortRef = useRef(sort);
  sortRef.current = sort;
  const globalSearchRef = useRef(globalSearch);
  globalSearchRef.current = globalSearch;

  const setData = useCallback((data: any[], remote: boolean, remoteDatasize?: number) => {
    setState(s => setDataWrapper(s, data, remote, remoteDatasize));
  }, []);

  const addRowFn = useCallback((row: any) => {
    setState(s => setDataWrapper(s, [row, ...s.data], s.pager.remotePage, s.pager.remoteDataSize));
  }, []);

  const removeRow = useCallback((row: any) => {
    setState(s => setDataWrapper(s, s.data.filter(r => r !== row), s.pager.remotePage, s.pager.remoteDataSize));
  }, []);

  const updateRow = useCallback((oldRow: any, newRow: any) => {
    setState(s => setDataWrapper(s, s.data.map(r => (r === oldRow ? newRow : r)), s.pager.remotePage, s.pager.remoteDataSize));
  }, []);

  const fetchData = useCallback(
    (baseUrl: string, section: string | undefined, remote: boolean, totalSection?: string, method?: string, headers?: Record<string, string>) => {
      setFetchConfig({ baseUrl, section, remote, totalSection, method, headers });
    },
    []
  );

  const changePageSize = useCallback((pageSize: number) => {
    setState(s => {
      const length = s.pager.remotePage ? s.data.length : applyGlobalSearch(applyFilters(s.data, filtersRef.current), globalSearchRef.current).length;
      const pageLimit = Math.ceil(length / pageSize);
      return { ...s, pager: { ...s.pager, pageSize, pageLimit, pageList: returnPageList(s.pager.pageListSize, pageLimit) } };
    });
  }, []);

  const setFilter = useCallback((dataField: string, values: string[]) => {
    setFilters(f => {
      const next = { ...f, [dataField]: values };
      setState(s => {
        if (s.pager.remotePage) {
          return { ...s, pager: { ...s.pager, pageNumber: 0 } };
        }
        const pageLimit = Math.ceil(applyGlobalSearch(applyFilters(s.data, next), globalSearchRef.current).length / s.pager.pageSize);
        return { ...s, pager: { ...s.pager, pageNumber: 0, pageLimit, pageList: returnPageList(s.pager.pageListSize, pageLimit) } };
      });
      return next;
    });
  }, []);

  const setGlobalSearch = useCallback((search: string) => {
    setGlobalSearchState(search);
    setState(s => {
      if (s.pager.remotePage) {
        return { ...s, pager: { ...s.pager, pageNumber: 0 } };
      }
      const pageLimit = Math.ceil(applyGlobalSearch(applyFilters(s.data, filtersRef.current), search).length / s.pager.pageSize);
      return { ...s, pager: { ...s.pager, pageNumber: 0, pageLimit, pageList: returnPageList(s.pager.pageListSize, pageLimit) } };
    });
  }, []);

  const toggleSort = useCallback((dataField: string) => {
    setSort(s => (s.field !== dataField ? { field: dataField, direction: 'desc' } : { field: dataField, direction: s.direction === 'desc' ? 'asc' : 'desc' }));
    setState(s => ({ ...s, pager: { ...s.pager, pageNumber: 0 } }));
  }, []);

  const changePageNumber = useCallback((pageNumber: number) => {
    setState(s => returnPageStateRelatedPageNum(s, pageNumber, 'none'));
  }, []);

  const changePageListSize = useCallback((pageListSize: number) => {
    setState(s => ({ ...s, pager: { ...s.pager, pageListSize, pageList: returnPageList(pageListSize, s.pager.pageLimit) } }));
  }, []);

  const increasePageNum = useCallback(() => {
    setState(s => returnPageStateRelatedPageNum(s, s.pager.pageNumber === s.pager.pageLimit - 1 ? s.pager.pageNumber : s.pager.pageNumber + 1, 'increase'));
  }, []);

  const decreasePageNum = useCallback(() => {
    setState(s => returnPageStateRelatedPageNum(s, s.pager.pageNumber === 0 ? 0 : s.pager.pageNumber - 1, 'decrease'));
  }, []);

  const lastPageNum = useCallback(() => {
    setState(s => returnLastPageList(s, s.pager.pageLimit - 1));
  }, []);

  const buildUrl = useCallback(
    (cfg: FetchConfig, pageNumber: number, pageSize: number): { url: string; method?: string; headers?: Record<string, string> } => {
      if (!cfg.remote) {
        return { url: toSameOriginIfInsecure(cfg.baseUrl), method: cfg.method, headers: cfg.headers };
      }
      const url = new URL(cfg.baseUrl);
      url.searchParams.set('page', String(pageNumber));
      url.searchParams.set('size', String(pageSize));
      const activeFilters = Object.fromEntries(Object.entries(filtersRef.current).filter(([, values]) => values.length > 0));
      if (Object.keys(activeFilters).length > 0) {
        url.searchParams.set('filter', JSON.stringify(activeFilters));
      }
      if (sortRef.current.field && sortRef.current.direction) {
        url.searchParams.set('sort', JSON.stringify(sortRef.current));
      }
      const search = globalSearchRef.current.trim();
      if (search !== '') {
        url.searchParams.set('search', search);
      }
      return { url: toSameOriginIfInsecure(url.href), method: cfg.method, headers: cfg.headers };
    },
    []
  );

  const performFetch = useCallback(
    (cfg: FetchConfig, pageNumber: number, pageSize: number) => {
      const { url, method, headers } = buildUrl(cfg, pageNumber, pageSize);
      setIsLoading(true);
      setError(undefined);
      fetch(url, { method: method || 'GET', headers })
        .then(async res => {
          if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`);
          }
          return res.json();
        })
        .then(values => {
          const data = resolveDataPath(values, cfg.section) || [];
          setData(data, cfg.remote, cfg.totalSection ? values[cfg.totalSection] : undefined);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        });
    },
    [buildUrl, setData]
  );

  // Initial / config-change fetch (covers both local one-shot fetch and remote's first page).
  useEffect(() => {
    if (!fetchConfig) {
      return;
    }
    performFetch(fetchConfig, state.pager.pageNumber, state.pager.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchConfig]);

  // Remote-mode refetch when page/size/filters/sort/search change.
  useEffect(() => {
    if (!fetchConfig || !fetchConfig.remote) {
      return;
    }
    performFetch(fetchConfig, state.pager.pageNumber, state.pager.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pager.pageNumber, state.pager.pageSize, filters, sort, globalSearch]);

  const filteredData = useMemo(() => applyFilters(state.data, filters), [state.data, filters]);
  const searchedData = useMemo(() => applyGlobalSearch(filteredData, globalSearch), [filteredData, globalSearch]);
  const sortedData = useMemo(() => applySort(searchedData, sort), [searchedData, sort]);

  return {
    data: sortedData,
    rawData: state.data,
    pageNumber: state.pager.pageNumber,
    pageSize: state.pager.pageSize,
    pageList: state.pager.pageList,
    pageLimit: state.pager.pageLimit,
    filters,
    sort,
    globalSearch,
    isLoading,
    error,
    setData,
    addRow: addRowFn,
    removeRow,
    updateRow,
    fetchData,
    changePageSize,
    setFilter,
    setGlobalSearch,
    toggleSort,
    changePageNumber,
    changePageListSize,
    increasePageNum,
    decreasePageNum,
    lastPageNum,
  };
};

export type DataGridStoreApi = ReturnType<typeof useDataGridStore>;
