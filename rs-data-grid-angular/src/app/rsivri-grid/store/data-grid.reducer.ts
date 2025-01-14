import { createReducer, on } from '@ngrx/store';
import {
  changePageListSize,
  changePageNumber,
  changePageSize,
  decreasePageNum,
  increasePageNum,
  lastPageNum,
  setData,
} from './data-grid.actions';
import { AppState } from './data-grid.state';
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

export const dataGridReducer = createReducer(
  initialState,
  on(
    setData,
    (state, { data: data, remote: remote, remoteDatasize: remoteDatasize }) =>
      setDataWrapper(state, data, remote, remoteDatasize),
  ),
  on(changePageSize, (state, { pageSize: pageSize }) => ({
    ...state,
    pager: {
      ...state.pager,
      pageSize: pageSize,
      pageLimit: Math.ceil(state.data.length / pageSize),
      pageList: returnPageList(
        state.pager.pageListSize,
        Math.ceil(state.data.length / pageSize),
      ),
    },
  })),
  on(changePageNumber, (state, { pageNumber: pageNumber }) =>
    returnPageStateRelatedPageNum(state, pageNumber, 'none'),
  ),
  on(changePageListSize, (state, { pageListSize: pageListSize }) => ({
    ...state,
    pager: {
      ...state.pager,
      pageListSize: pageListSize,
      pageList: returnPageList(pageListSize, state.pager.pageLimit),
    },
  })),
  on(increasePageNum, (state) =>
    returnPageStateRelatedPageNum(
      state,
      state.pager.pageNumber === state.pager.pageLimit - 1
        ? state.pager.pageNumber
        : state.pager.pageNumber + 1,
      'increase',
    ),
  ),
  on(decreasePageNum, (state) =>
    returnPageStateRelatedPageNum(
      state,
      state.pager.pageNumber === 0 ? 0 : state.pager.pageNumber - 1,
      'decrease',
    ),
  ),
  on(lastPageNum, (state) =>
    returnLastPageList(state, state.pager.pageLimit - 1),
  ),
);

const setDataWrapper = (
  state: AppState,
  data: any,
  remote: boolean,
  remoteDatasize: number | undefined,
) => {
  console.log('laooo ' + remoteDatasize);
  return {
    ...state,
    data: data,
    pager: remote
      ? {
          ...state.pager,
          remoteDataSize: remoteDatasize,
          remotePage: remote,
          pageLimit: remoteDatasize
            ? Math.ceil(remoteDatasize / state.pager.pageSize)
            : 0,
          pageList: returnPageList(
            state.pager.pageListSize,
            Math.ceil(
              (remoteDatasize
                ? Math.ceil(remoteDatasize / state.pager.pageSize)
                : 0) / state.pager.pageSize,
            ),
          ),
        }
      : {
          ...state.pager,
          pageLimit: Math.ceil(data.length / state.pager.pageSize),
          pageList: returnPageList(
            state.pager.pageListSize,
            Math.ceil(data.length / state.pager.pageSize),
          ),
          remotePage: remote,
        },
  };
};

const returnPageList = (pageListSize: number, pageLimit: number) => {
  let arr = new Array();
  for (
    let i = 0;
    i < (pageListSize > pageLimit ? pageLimit : pageListSize);
    i++
  ) {
    arr.push(i + 1);
  }
  return arr;
};

const returnPageStateRelatedPageNum = (
  state: AppState,
  pageNumber: number,
  flag: string,
) => {
  let pageVal = pageNumber;
  if (pageVal === 0 || pageVal === state.pager.pageLimit - 1) {
    return { ...state, pager: { ...state.pager, pageNumber: pageVal } };
  } else if (
    state.pager.pageList.findIndex((val) => {
      return val === returnConditionIncrease(flag, pageVal + 1);
    }) ===
    state.pager.pageListSize - 1
  ) {
    return {
      ...state,
      pager: {
        ...state.pager,
        pageNumber: pageVal,
        pageList: returnPageListWithPageNumber(
          pageVal,
          state.pager.pageLimit,
          state.pager.pageListSize,
        ),
      },
    };
  } else if (
    state.pager.pageList.findIndex((val) => {
      return val === returnConditionDecrese(flag, pageVal + 1);
    }) === 0
  ) {
    return {
      ...state,
      pager: {
        ...state.pager,
        pageNumber: pageVal,
        pageList: returnPageListWithPageNumber(
          pageVal - state.pager.pageListSize + 1 > 0
            ? pageVal - state.pager.pageListSize + 1
            : 0,
          state.pager.pageLimit,
          state.pager.pageListSize,
        ),
      },
    };
  } else return { ...state, pager: { ...state.pager, pageNumber: pageVal } };
};

const returnConditionDecrese = (flag: string, pageVal: number) => {
  if (flag === 'decrease') {
    return pageVal + 1;
  } else {
    return pageVal;
  }
};

const returnConditionIncrease = (flag: string, pageVal: number) => {
  if (flag === 'increase') {
    return pageVal - 1;
  } else {
    return pageVal;
  }
};

const returnLastPageList = (state: AppState, pageNumber: number) => {
  return {
    ...state,
    pager: {
      ...state.pager,
      pageNumber: pageNumber,
      pageList: returnPageListWithPageNumber(
        pageNumber - state.pager.pageListSize + 1,
        state.pager.pageLimit,
        state.pager.pageListSize,
      ),
    },
  };
};

const returnPageListWithPageNumber = (
  pageNumber: number,
  pageLimit: number,
  pageListSize: number,
) => {
  let arr = new Array();
  for (
    let i = pageNumber;
    i <
    (pageNumber + pageListSize > pageLimit
      ? pageLimit
      : pageNumber + pageListSize);
    i++
  ) {
    arr.push(i + 1);
  }
  return arr;
};
