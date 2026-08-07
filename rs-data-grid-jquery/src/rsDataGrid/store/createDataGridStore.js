// Dependency-free pub-sub port of rs-data-grid-react's useDataGridStore.ts.
// Same behavior, expressed without React hooks: a plain mutable closure plus
// a listener Set that gets notified after every state change. Consumers call
// `subscribe(fn)` to be told "something changed, re-read getSnapshot()".
//
// The two React effects that drove fetching ("fetchConfig changed" and
// "remote-mode refetch when page/size/filters/sort/search change") are
// ported as: fetchData() performs the request immediately (equivalent to the
// first effect), and every action that can affect page/size/filters/sort/
// search schedules a microtask-coalesced refetch when in remote mode
// (equivalent to the second effect, minus React's automatic batching --
// coalescing multiple synchronous calls into one fetch is the closest
// faithful equivalent in a non-React environment).
import {
  initialState,
  setDataWrapper,
  resolveDataPath,
  applyFilters,
  applyGlobalSearch,
  applySort,
  returnPageList,
  returnPageStateRelatedPageNum,
  returnLastPageList,
} from './dataGridStore.js';

// Any http:// fetchUrl (the demo default or a custom one typed into the
// sidebar) gets blocked as mixed content when this page itself is loaded
// over HTTPS. Routing it through a same-origin proxy (see netlify.toml)
// keeps the browser's connection on HTTPS regardless of the target.
function toSameOriginIfInsecure(url) {
  if (typeof location !== 'undefined' && location.protocol === 'https:' && /^http:\/\//i.test(url)) {
    return `/api/http-proxy/${url.slice('http://'.length)}`;
  }
  return url;
}

export function createDataGridStore() {
  let state = initialState;
  let filters = {};
  let sort = { field: null, direction: null };
  let globalSearch = '';
  let fetchConfig = null;
  let isLoading = false;
  let error = undefined;

  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn());

  const applyDataWrapper = (data, remote, remoteDatasize) => {
    state = setDataWrapper(state, data, remote, remoteDatasize);
  };

  const setData = (data, remote, remoteDatasize) => {
    applyDataWrapper(data, remote, remoteDatasize);
    notify();
  };

  const addRow = row => {
    applyDataWrapper([row, ...state.data], state.pager.remotePage, state.pager.remoteDataSize);
    notify();
  };

  const removeRow = row => {
    applyDataWrapper(
      state.data.filter(r => r !== row),
      state.pager.remotePage,
      state.pager.remoteDataSize
    );
    notify();
  };

  const updateRow = (oldRow, newRow) => {
    applyDataWrapper(
      state.data.map(r => (r === oldRow ? newRow : r)),
      state.pager.remotePage,
      state.pager.remoteDataSize
    );
    notify();
  };

  const buildUrl = (cfg, pageNumber, pageSize) => {
    if (!cfg.remote) {
      return { url: toSameOriginIfInsecure(cfg.baseUrl), method: cfg.method, headers: cfg.headers };
    }
    const url = new URL(cfg.baseUrl);
    url.searchParams.set('page', String(pageNumber));
    url.searchParams.set('size', String(pageSize));
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, values]) => values.length > 0));
    if (Object.keys(activeFilters).length > 0) {
      url.searchParams.set('filter', JSON.stringify(activeFilters));
    }
    if (sort.field && sort.direction) {
      url.searchParams.set('sort', JSON.stringify(sort));
    }
    const search = globalSearch.trim();
    if (search !== '') {
      url.searchParams.set('search', search);
    }
    return { url: toSameOriginIfInsecure(url.href), method: cfg.method, headers: cfg.headers };
  };

  const performFetch = (cfg, pageNumber, pageSize) => {
    const { url, method, headers } = buildUrl(cfg, pageNumber, pageSize);
    isLoading = true;
    error = undefined;
    notify();
    fetch(url, { method: method || 'GET', headers })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then(values => {
        const data = resolveDataPath(values, cfg.section) || [];
        applyDataWrapper(data, cfg.remote, cfg.totalSection ? values[cfg.totalSection] : undefined);
        isLoading = false;
        notify();
      })
      .catch(err => {
        error = err instanceof Error ? err : new Error(String(err));
        isLoading = false;
        notify();
      });
  };

  const fetchData = (baseUrl, section, remote, totalSection, method, headers) => {
    fetchConfig = { baseUrl, section, remote, totalSection, method, headers };
    performFetch(fetchConfig, state.pager.pageNumber, state.pager.pageSize);
  };

  let refetchScheduled = false;
  const scheduleRemoteRefetch = () => {
    if (!fetchConfig || !fetchConfig.remote) {
      return;
    }
    if (refetchScheduled) {
      return;
    }
    refetchScheduled = true;
    Promise.resolve().then(() => {
      refetchScheduled = false;
      performFetch(fetchConfig, state.pager.pageNumber, state.pager.pageSize);
    });
  };

  const changePageSize = pageSize => {
    const length = state.pager.remotePage ? state.data.length : applyGlobalSearch(applyFilters(state.data, filters), globalSearch).length;
    const pageLimit = Math.ceil(length / pageSize);
    state = { ...state, pager: { ...state.pager, pageSize, pageLimit, pageList: returnPageList(state.pager.pageListSize, pageLimit) } };
    notify();
    scheduleRemoteRefetch();
  };

  const setFilter = (dataField, values) => {
    filters = { ...filters, [dataField]: values };
    if (state.pager.remotePage) {
      state = { ...state, pager: { ...state.pager, pageNumber: 0 } };
    } else {
      const pageLimit = Math.ceil(applyGlobalSearch(applyFilters(state.data, filters), globalSearch).length / state.pager.pageSize);
      state = { ...state, pager: { ...state.pager, pageNumber: 0, pageLimit, pageList: returnPageList(state.pager.pageListSize, pageLimit) } };
    }
    notify();
    scheduleRemoteRefetch();
  };

  const setGlobalSearch = search => {
    globalSearch = search;
    if (state.pager.remotePage) {
      state = { ...state, pager: { ...state.pager, pageNumber: 0 } };
    } else {
      const pageLimit = Math.ceil(applyGlobalSearch(applyFilters(state.data, filters), search).length / state.pager.pageSize);
      state = { ...state, pager: { ...state.pager, pageNumber: 0, pageLimit, pageList: returnPageList(state.pager.pageListSize, pageLimit) } };
    }
    notify();
    scheduleRemoteRefetch();
  };

  const toggleSort = dataField => {
    sort = sort.field !== dataField ? { field: dataField, direction: 'desc' } : { field: dataField, direction: sort.direction === 'desc' ? 'asc' : 'desc' };
    state = { ...state, pager: { ...state.pager, pageNumber: 0 } };
    notify();
    scheduleRemoteRefetch();
  };

  const changePageNumber = pageNumber => {
    state = returnPageStateRelatedPageNum(state, pageNumber, 'none');
    notify();
    scheduleRemoteRefetch();
  };

  const changePageListSize = pageListSize => {
    state = { ...state, pager: { ...state.pager, pageListSize, pageList: returnPageList(pageListSize, state.pager.pageLimit) } };
    notify();
  };

  const increasePageNum = () => {
    state = returnPageStateRelatedPageNum(state, state.pager.pageNumber === state.pager.pageLimit - 1 ? state.pager.pageNumber : state.pager.pageNumber + 1, 'increase');
    notify();
    scheduleRemoteRefetch();
  };

  const decreasePageNum = () => {
    state = returnPageStateRelatedPageNum(state, state.pager.pageNumber === 0 ? 0 : state.pager.pageNumber - 1, 'decrease');
    notify();
    scheduleRemoteRefetch();
  };

  const lastPageNum = () => {
    state = returnLastPageList(state, state.pager.pageLimit - 1);
    notify();
    scheduleRemoteRefetch();
  };

  const getSnapshot = () => {
    const filteredData = applyFilters(state.data, filters);
    const searchedData = applyGlobalSearch(filteredData, globalSearch);
    const sortedData = applySort(searchedData, sort);
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
    };
  };

  const subscribe = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return {
    getSnapshot,
    subscribe,
    setData,
    addRow,
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
}
