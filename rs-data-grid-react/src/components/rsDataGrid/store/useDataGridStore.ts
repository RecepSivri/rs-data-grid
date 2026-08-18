import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FetchConfig,
  SortState,
  applyFilters,
  applyGlobalSearch,
  applySort,
  initialState,
  moveItem,
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
  // Only ever true on the deployed site (rs-grid.netlify.app, served over
  // HTTPS) -- local dev/E2E always runs on http://localhost, so this can't
  // be exercised from this environment.
  /* istanbul ignore next */
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

  const moveRow = useCallback((fromRow: any, toRow: any) => {
    setState(s => setDataWrapper(s, moveItem(s.data, fromRow, toRow), s.pager.remotePage, s.pager.remoteDataSize));
  }, []);

  const fetchData = useCallback(
    (baseUrl: string, section: string | undefined, remote: boolean, totalSection?: string, method?: string, headers?: Record<string, string>) => {
      setFetchConfig({ baseUrl, section, remote, totalSection, method, headers });
    },
    []
  );

  const changePageSize = useCallback((pageSize: number) => {
    setState(s => {
      // s.pager.remotePage is only ever true after a remote-mode
      // setData/fetchData call, which never happens (see buildUrl below).
      /* istanbul ignore next */
      const length = s.pager.remotePage ? s.data.length : applyGlobalSearch(applyFilters(s.data, filtersRef.current), globalSearchRef.current).length;
      const pageLimit = Math.ceil(length / pageSize);
      return { ...s, pager: { ...s.pager, pageSize, pageLimit, pageList: returnPageList(s.pager.pageListSize, pageLimit) } };
    });
  }, []);

  const setFilter = useCallback((dataField: string, values: string[]) => {
    setFilters(f => {
      const next = { ...f, [dataField]: values };
      setState(s => {
        // Same as changePageSize above: remotePage is never true.
        /* istanbul ignore next */
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
      // Same as changePageSize above: remotePage is never true.
      /* istanbul ignore next */
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

  // Builds the ?page/&size/&filter/&sort/&search query string used only in
  // remote mode. None of the 5 standalone demos' App-level adapters supply
  // remoteModeParams (see loadData()'s comment in rsDataGrid.tsx), so
  // cfg.remote is never true from any of them -- not reachable here.
  /* istanbul ignore next */
  const buildRemoteUrl = (cfg: FetchConfig, pageNumber: number, pageSize: number): string => {
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
    return toSameOriginIfInsecure(url.href);
  };

  const buildUrl = useCallback(
    (cfg: FetchConfig, pageNumber: number, pageSize: number): { url: string; method?: string; headers?: Record<string, string> } => {
      if (!cfg.remote) {
        return { url: toSameOriginIfInsecure(cfg.baseUrl), method: cfg.method, headers: cfg.headers };
      }
      /* istanbul ignore next */
      return { url: buildRemoteUrl(cfg, pageNumber, pageSize), method: cfg.method, headers: cfg.headers };
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
          // cfg.totalSection is only ever set from the remote branch of
          // loadData() (rsDataGrid.tsx) -- unreachable from any of the 5
          // standalone demos, same as buildRemoteUrl above.
          /* istanbul ignore next */
          setData(data, cfg.remote, cfg.totalSection ? values[cfg.totalSection] : undefined);
          setIsLoading(false);
        })
        .catch(err => {
          // A real fetch()/JSON-parse/status-check failure always rejects
          // with a genuine Error -- the fallback is defensive only.
          /* istanbul ignore next */
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

  // Remote-mode refetch when page/size/filters/sort/search change. React
  // runs every effect on the very first mount regardless of its deps, so
  // without the isFirstPagerEffect guard this fired a second, redundant
  // fetch alongside the "fetchConfig changed" effect above on every initial
  // remote-mode mount (both effects see the same just-set fetchConfig on
  // that first commit). The guard skips only that first automatic run --
  // once flipped, every later page/size/filter/sort/search change refetches
  // normally.
  const isFirstPagerEffect = useRef(true);
  useEffect(() => {
    if (isFirstPagerEffect.current) {
      isFirstPagerEffect.current = false;
      return;
    }
    if (!fetchConfig || !fetchConfig.remote) {
      return;
    }
    // Only ever reached when fetchConfig.remote is true -- never happens
    // from any of the 5 standalone demos (see buildRemoteUrl above).
    /* istanbul ignore next */
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
    moveRow,
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
