export interface Pager {
  pageNumber: number;
  pageSize: number;
  pageList: number[];
  pageListSize: number;
  pageLimit: number;
  remotePage: boolean;
  remoteDataSize?: number;
}

export interface AppState {
  data: any[];
  pager: Pager;
}

export const initialState: AppState = {
  pager: {
    pageSize: 10,
    pageNumber: 0,
    pageList: [1, 2, 3, 4, 5],
    pageListSize: 5,
    pageLimit: 10,
    remotePage: false,
  },
  data: [],
};

export const setDataWrapper = (state: AppState, data: any[], remote: boolean, remoteDatasize: number | undefined): AppState => {
  return {
    ...state,
    data,
    pager: remote
      ? {
          ...state.pager,
          remoteDataSize: remoteDatasize,
          remotePage: remote,
          pageLimit: remoteDatasize ? Math.ceil(remoteDatasize / state.pager.pageSize) : 0,
          pageList: returnPageList(
            state.pager.pageListSize,
            Math.ceil((remoteDatasize ? Math.ceil(remoteDatasize / state.pager.pageSize) : 0) / state.pager.pageSize)
          ),
        }
      : {
          ...state.pager,
          pageLimit: Math.ceil(data.length / state.pager.pageSize),
          pageList: returnPageList(state.pager.pageListSize, Math.ceil(data.length / state.pager.pageSize)),
          remotePage: remote,
        },
  };
};

export const resolveDataPath = (data: any, path: string | undefined): any => {
  if (!path || path.trim() === '') {
    return data;
  }
  const segments = path
    .trim()
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(segment => segment !== '');
  let current = data;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

export const applyFilters = (data: any[], filters: Record<string, string[]>): any[] => {
  const activeFilters = Object.entries(filters).filter(([, values]) => Array.isArray(values) && values.length > 0);
  if (activeFilters.length === 0) {
    return data;
  }
  return data.filter(row => activeFilters.every(([field, values]) => values.includes(String(row[field] ?? ''))));
};

export const applyGlobalSearch = (data: any[], search: string): any[] => {
  const term = search.trim().toLowerCase();
  if (term === '') {
    return data;
  }
  return data.filter(row => Object.values(row ?? {}).some(value => String(value ?? '').toLowerCase().includes(term)));
};

export interface SortState {
  field: string | null;
  direction: 'asc' | 'desc' | null;
}

export const compareValues = (a: any, b: any): number => {
  const numA = Number(a);
  const numB = Number(b);
  const bothNumeric =
    a !== '' && b !== '' && a !== null && a !== undefined && b !== null && b !== undefined && !Number.isNaN(numA) && !Number.isNaN(numB);
  if (bothNumeric) {
    return numA - numB;
  }
  return String(a ?? '').localeCompare(String(b ?? ''));
};

export const applySort = (data: any[], sort: SortState): any[] => {
  if (!sort.field || !sort.direction) {
    return data;
  }
  const field = sort.field;
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => compareValues(a?.[field], b?.[field]) * factor);
};

export const moveItem = (data: any[], fromItem: any, toItem: any): any[] => {
  const fromIndex = data.indexOf(fromItem);
  const toIndexOriginal = data.indexOf(toItem);
  if (fromIndex === -1 || toIndexOriginal === -1 || fromItem === toItem) {
    return data;
  }
  const next = data.slice();
  next.splice(fromIndex, 1);
  let insertAt = next.indexOf(toItem);
  // Dragging forward (fromIndex < toIndexOriginal): land AFTER the target,
  // not before it -- "insert before" is a no-op when the dragged item is
  // already the target's immediate predecessor, since removing it shifts
  // the target left into the exact slot being inserted into.
  if (fromIndex < toIndexOriginal) {
    insertAt += 1;
  }
  next.splice(insertAt, 0, fromItem);
  return next;
};

export const returnPageList = (pageListSize: number, pageLimit: number): number[] => {
  const arr: number[] = [];
  for (let i = 0; i < (pageListSize > pageLimit ? pageLimit : pageListSize); i++) {
    arr.push(i + 1);
  }
  return arr;
};

const returnConditionDecrease = (flag: string, pageVal: number) => (flag === 'decrease' ? pageVal + 1 : pageVal);
const returnConditionIncrease = (flag: string, pageVal: number) => (flag === 'increase' ? pageVal - 1 : pageVal);

const returnPageListWithPageNumber = (pageNumber: number, pageLimit: number, pageListSize: number): number[] => {
  const arr: number[] = [];
  for (let i = pageNumber; i < (pageNumber + pageListSize > pageLimit ? pageLimit : pageNumber + pageListSize); i++) {
    arr.push(i + 1);
  }
  return arr;
};

export const returnPageStateRelatedPageNum = (state: AppState, pageNumber: number, flag: string): AppState => {
  const pageVal = pageNumber;
  if (pageVal === 0 || pageVal === state.pager.pageLimit - 1) {
    return { ...state, pager: { ...state.pager, pageNumber: pageVal } };
  } else if (
    state.pager.pageList.findIndex(val => val === returnConditionIncrease(flag, pageVal + 1)) === state.pager.pageListSize - 1
  ) {
    return {
      ...state,
      pager: { ...state.pager, pageNumber: pageVal, pageList: returnPageListWithPageNumber(pageVal, state.pager.pageLimit, state.pager.pageListSize) },
    };
  } else if (state.pager.pageList.findIndex(val => val === returnConditionDecrease(flag, pageVal + 1)) === 0) {
    return {
      ...state,
      pager: {
        ...state.pager,
        pageNumber: pageVal,
        pageList: returnPageListWithPageNumber(
          pageVal - state.pager.pageListSize + 1 > 0 ? pageVal - state.pager.pageListSize + 1 : 0,
          state.pager.pageLimit,
          state.pager.pageListSize
        ),
      },
    };
  }
  return { ...state, pager: { ...state.pager, pageNumber: pageVal } };
};

export const returnLastPageList = (state: AppState, pageNumber: number): AppState => {
  return {
    ...state,
    pager: {
      ...state.pager,
      pageNumber,
      pageList: returnPageListWithPageNumber(pageNumber - state.pager.pageListSize + 1, state.pager.pageLimit, state.pager.pageListSize),
    },
  };
};

export interface FetchConfig {
  baseUrl: string;
  section?: string;
  remote: boolean;
  totalSection?: string;
  method?: string;
  headers?: Record<string, string>;
}
