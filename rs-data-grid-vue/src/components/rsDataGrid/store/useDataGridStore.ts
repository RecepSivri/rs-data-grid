import { computed, reactive, ref, watch } from 'vue';
import type { AppState, FetchConfig, SortState } from './dataGridStore';
import {
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
  if (typeof location !== 'undefined' && location.protocol === 'https:' && /^http:\/\//i.test(url)) {
    return `/api/http-proxy/${url.slice('http://'.length)}`;
  }
  return url;
}

export const useDataGridStore = () => {
  const state = ref<AppState>({ ...initialState, pager: { ...initialState.pager } });
  const filters = ref<Record<string, string[]>>({});
  const sort = ref<SortState>({ field: null, direction: null });
  const globalSearch = ref('');
  const fetchConfig = ref<FetchConfig | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | undefined>(undefined);

  const setData = (data: any[], remote: boolean, remoteDatasize?: number) => {
    state.value = setDataWrapper(state.value, data, remote, remoteDatasize);
  };

  const addRow = (row: any) => {
    state.value = setDataWrapper(state.value, [row, ...state.value.data], state.value.pager.remotePage, state.value.pager.remoteDataSize);
  };

  const removeRow = (row: any) => {
    state.value = setDataWrapper(
      state.value,
      state.value.data.filter(r => r !== row),
      state.value.pager.remotePage,
      state.value.pager.remoteDataSize
    );
  };

  const updateRow = (oldRow: any, newRow: any) => {
    state.value = setDataWrapper(
      state.value,
      state.value.data.map(r => (r === oldRow ? newRow : r)),
      state.value.pager.remotePage,
      state.value.pager.remoteDataSize
    );
  };

  const moveRow = (fromRow: any, toRow: any) => {
    state.value = setDataWrapper(
      state.value,
      moveItem(state.value.data, fromRow, toRow),
      state.value.pager.remotePage,
      state.value.pager.remoteDataSize
    );
  };

  const fetchData = (
    baseUrl: string,
    section: string | undefined,
    remote: boolean,
    totalSection?: string,
    method?: string,
    headers?: Record<string, string>
  ) => {
    fetchConfig.value = { baseUrl, section, remote, totalSection, method, headers };
  };

  const changePageSize = (pageSize: number) => {
    const length = state.value.pager.remotePage ? state.value.data.length : searchedData.value.length;
    const pageLimit = Math.ceil(length / pageSize);
    state.value = { ...state.value, pager: { ...state.value.pager, pageSize, pageLimit, pageList: returnPageList(state.value.pager.pageListSize, pageLimit) } };
  };

  const setFilter = (dataField: string, values: string[]) => {
    filters.value = { ...filters.value, [dataField]: values };
    if (state.value.pager.remotePage) {
      state.value = { ...state.value, pager: { ...state.value.pager, pageNumber: 0 } };
      return;
    }
    const pageLimit = Math.ceil(searchedData.value.length / state.value.pager.pageSize);
    state.value = {
      ...state.value,
      pager: { ...state.value.pager, pageNumber: 0, pageLimit, pageList: returnPageList(state.value.pager.pageListSize, pageLimit) },
    };
  };

  const setGlobalSearch = (search: string) => {
    globalSearch.value = search;
    if (state.value.pager.remotePage) {
      state.value = { ...state.value, pager: { ...state.value.pager, pageNumber: 0 } };
      return;
    }
    const pageLimit = Math.ceil(searchedData.value.length / state.value.pager.pageSize);
    state.value = {
      ...state.value,
      pager: { ...state.value.pager, pageNumber: 0, pageLimit, pageList: returnPageList(state.value.pager.pageListSize, pageLimit) },
    };
  };

  const toggleSort = (dataField: string) => {
    sort.value =
      sort.value.field !== dataField
        ? { field: dataField, direction: 'desc' }
        : { field: dataField, direction: sort.value.direction === 'desc' ? 'asc' : 'desc' };
    state.value = { ...state.value, pager: { ...state.value.pager, pageNumber: 0 } };
  };

  const changePageNumber = (pageNumber: number) => {
    state.value = returnPageStateRelatedPageNum(state.value, pageNumber, 'none');
  };

  const changePageListSize = (pageListSize: number) => {
    state.value = { ...state.value, pager: { ...state.value.pager, pageListSize, pageList: returnPageList(pageListSize, state.value.pager.pageLimit) } };
  };

  const increasePageNum = () => {
    state.value = returnPageStateRelatedPageNum(
      state.value,
      state.value.pager.pageNumber === state.value.pager.pageLimit - 1 ? state.value.pager.pageNumber : state.value.pager.pageNumber + 1,
      'increase'
    );
  };

  const decreasePageNum = () => {
    state.value = returnPageStateRelatedPageNum(state.value, state.value.pager.pageNumber === 0 ? 0 : state.value.pager.pageNumber - 1, 'decrease');
  };

  const lastPageNum = () => {
    state.value = returnLastPageList(state.value, state.value.pager.pageLimit - 1);
  };

  const buildUrl = (cfg: FetchConfig, pageNumber: number, pageSize: number): { url: string; method?: string; headers?: Record<string, string> } => {
    if (!cfg.remote) {
      return { url: toSameOriginIfInsecure(cfg.baseUrl), method: cfg.method, headers: cfg.headers };
    }
    const url = new URL(cfg.baseUrl);
    url.searchParams.set('page', String(pageNumber));
    url.searchParams.set('size', String(pageSize));
    const activeFilters = Object.fromEntries(Object.entries(filters.value).filter(([, values]) => values.length > 0));
    if (Object.keys(activeFilters).length > 0) {
      url.searchParams.set('filter', JSON.stringify(activeFilters));
    }
    if (sort.value.field && sort.value.direction) {
      url.searchParams.set('sort', JSON.stringify(sort.value));
    }
    const search = globalSearch.value.trim();
    if (search !== '') {
      url.searchParams.set('search', search);
    }
    return { url: toSameOriginIfInsecure(url.href), method: cfg.method, headers: cfg.headers };
  };

  const performFetch = (cfg: FetchConfig, pageNumber: number, pageSize: number) => {
    const { url, method, headers } = buildUrl(cfg, pageNumber, pageSize);
    isLoading.value = true;
    error.value = undefined;
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
        isLoading.value = false;
      })
      .catch(err => {
        error.value = err instanceof Error ? err : new Error(String(err));
        isLoading.value = false;
      });
  };

  // Initial / config-change fetch (covers both local one-shot fetch and remote's first page).
  watch(fetchConfig, cfg => {
    if (!cfg) {
      return;
    }
    performFetch(cfg, state.value.pager.pageNumber, state.value.pager.pageSize);
  });

  // Remote-mode refetch when page/size/filters/sort/search change.
  watch(
    [() => state.value.pager.pageNumber, () => state.value.pager.pageSize, filters, sort, globalSearch],
    () => {
      const cfg = fetchConfig.value;
      if (!cfg || !cfg.remote) {
        return;
      }
      performFetch(cfg, state.value.pager.pageNumber, state.value.pager.pageSize);
    },
    { deep: true }
  );

  const filteredData = computed(() => applyFilters(state.value.data, filters.value));
  const searchedData = computed(() => applyGlobalSearch(filteredData.value, globalSearch.value));
  const sortedData = computed(() => applySort(searchedData.value, sort.value));

  return reactive({
    data: sortedData,
    rawData: computed(() => state.value.data),
    pageNumber: computed(() => state.value.pager.pageNumber),
    pageSize: computed(() => state.value.pager.pageSize),
    pageList: computed(() => state.value.pager.pageList),
    pageLimit: computed(() => state.value.pager.pageLimit),
    filters,
    sort,
    globalSearch,
    isLoading,
    error,
    setData,
    addRow,
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
  });
};

export type DataGridStoreApi = ReturnType<typeof useDataGridStore>;
