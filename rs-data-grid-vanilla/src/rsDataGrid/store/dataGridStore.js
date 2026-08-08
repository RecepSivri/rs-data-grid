// Literal port of rs-data-grid-react's dataGridStore.ts (types stripped).
// Pure, framework-agnostic functions -- no DOM, no imports from anywhere
// else in this app. Keep this file diffable against the React source.

/**
 * @typedef {Object} Pager
 * @property {number} pageNumber
 * @property {number} pageSize
 * @property {number[]} pageList
 * @property {number} pageListSize
 * @property {number} pageLimit
 * @property {boolean} remotePage
 * @property {number} [remoteDataSize]
 */

/**
 * @typedef {Object} AppState
 * @property {any[]} data
 * @property {Pager} pager
 */

/** @type {AppState} */
export const initialState = {
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

/**
 * @param {AppState} state
 * @param {any[]} data
 * @param {boolean} remote
 * @param {number|undefined} remoteDatasize
 * @returns {AppState}
 */
export const setDataWrapper = (state, data, remote, remoteDatasize) => {
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

/**
 * @param {any} data
 * @param {string|undefined} path
 * @returns {any}
 */
export const resolveDataPath = (data, path) => {
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

/**
 * @param {any[]} data
 * @param {Record<string, string[]>} filters
 * @returns {any[]}
 */
export const applyFilters = (data, filters) => {
  const activeFilters = Object.entries(filters).filter(([, values]) => Array.isArray(values) && values.length > 0);
  if (activeFilters.length === 0) {
    return data;
  }
  return data.filter(row => activeFilters.every(([field, values]) => values.includes(String(row[field] ?? ''))));
};

/**
 * @param {any[]} data
 * @param {string} search
 * @returns {any[]}
 */
export const applyGlobalSearch = (data, search) => {
  const term = search.trim().toLowerCase();
  if (term === '') {
    return data;
  }
  return data.filter(row => Object.values(row ?? {}).some(value => String(value ?? '').toLowerCase().includes(term)));
};

/**
 * @typedef {Object} SortState
 * @property {string|null} field
 * @property {'asc'|'desc'|null} direction
 */

/**
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
export const compareValues = (a, b) => {
  const numA = Number(a);
  const numB = Number(b);
  const bothNumeric =
    a !== '' && b !== '' && a !== null && a !== undefined && b !== null && b !== undefined && !Number.isNaN(numA) && !Number.isNaN(numB);
  if (bothNumeric) {
    return numA - numB;
  }
  return String(a ?? '').localeCompare(String(b ?? ''));
};

/**
 * @param {any[]} data
 * @param {SortState} sort
 * @returns {any[]}
 */
export const applySort = (data, sort) => {
  if (!sort.field || !sort.direction) {
    return data;
  }
  const field = sort.field;
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => compareValues(a?.[field], b?.[field]) * factor);
};

/**
 * @param {any[]} data
 * @param {any} fromItem
 * @param {any} toItem
 * @returns {any[]}
 */
export const moveItem = (data, fromItem, toItem) => {
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

/**
 * @param {number} pageListSize
 * @param {number} pageLimit
 * @returns {number[]}
 */
export const returnPageList = (pageListSize, pageLimit) => {
  const arr = [];
  for (let i = 0; i < (pageListSize > pageLimit ? pageLimit : pageListSize); i++) {
    arr.push(i + 1);
  }
  return arr;
};

const returnConditionDecrease = (flag, pageVal) => (flag === 'decrease' ? pageVal + 1 : pageVal);
const returnConditionIncrease = (flag, pageVal) => (flag === 'increase' ? pageVal - 1 : pageVal);

const returnPageListWithPageNumber = (pageNumber, pageLimit, pageListSize) => {
  const arr = [];
  for (let i = pageNumber; i < (pageNumber + pageListSize > pageLimit ? pageLimit : pageNumber + pageListSize); i++) {
    arr.push(i + 1);
  }
  return arr;
};

/**
 * @param {AppState} state
 * @param {number} pageNumber
 * @param {string} flag
 * @returns {AppState}
 */
export const returnPageStateRelatedPageNum = (state, pageNumber, flag) => {
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

/**
 * @param {AppState} state
 * @param {number} pageNumber
 * @returns {AppState}
 */
export const returnLastPageList = (state, pageNumber) => {
  return {
    ...state,
    pager: {
      ...state.pager,
      pageNumber,
      pageList: returnPageListWithPageNumber(pageNumber - state.pager.pageListSize + 1, state.pager.pageLimit, state.pager.pageListSize),
    },
  };
};

/**
 * @typedef {Object} FetchConfig
 * @property {string} baseUrl
 * @property {string} [section]
 * @property {boolean} remote
 * @property {string} [totalSection]
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 */
