import { createReducer, on } from '@ngrx/store';
import { changePageListSize, changePageNumber, changePageSize, decreasePageNum, increasePageNum, lastPageNum, setData } from './data-grid.actions';
import { AppState } from './data-grid.state';
export const initialState: AppState = {

  pager: {
    pageSize: 10,
    pageNumber: 0,
    pageList: [1,2,3,4,5],
    pageListSize: 5,  
    pageLimit: 10
  },
  data: []

}

export const dataGridReducer = createReducer(
  initialState,
  on(setData, (state, { data:data }) => ({...state, data: data, pager:{ ...state.pager, pageLimit: Math.ceil(data.length/state.pager.pageSize), pageList: returnPageList(state.pager.pageListSize, Math.ceil(data.length/state.pager.pageSize))}})),
  on(changePageSize, (state, { pageSize: pageSize }) => ({...state, pager:{...state.pager, pageSize: pageSize, pageLimit: Math.ceil(state.data.length/pageSize), pageList: returnPageList(state.pager.pageListSize, Math.ceil(state.data.length/pageSize))}})),
  on(changePageNumber, (state, { pageNumber: pageNumber }) => returnPageStateRelatedPageNum(state, pageNumber)),
  on(changePageListSize, (state, { pageListSize: pageListSize }) => ({...state, pager:{ ...state.pager, pageListSize: pageListSize, pageList: returnPageList(pageListSize, state.pager.pageLimit)}})),
  on(increasePageNum, (state) => returnPageStateRelatedPageNum(state, state.pager.pageNumber === state.pager.pageLimit-1 ? state.pager.pageNumber: state.pager.pageNumber +1)),
  on(decreasePageNum, (state) => returnPageStateRelatedPageNum(state, state.pager.pageNumber === 0 ? 0 : state.pager.pageNumber - 1)),
  on(lastPageNum, (state) => returnLastPageList(state, state.pager.pageLimit-1))
);

const returnPageList = (pageListSize: number, pageLimit: number) => {
  let arr = new Array();
    for (let i = 0; i < (pageListSize > pageLimit ? pageLimit : pageListSize); i++) {
      arr.push(i +1);
    }
    return arr;
}


const returnPageStateRelatedPageNum = (state: AppState, pageNumber: number) => {

    if(pageNumber === 0 || pageNumber === state.pager.pageLimit -1){
      return {...state, pager:{ ...state.pager, pageNumber: pageNumber}}
    }else
    if(state.pager.pageList.findIndex( (val) => {return val === pageNumber+1}) === state.pager.pageListSize-1){
      return {...state, pager:{ ...state.pager, pageNumber: pageNumber, pageList: returnPageListWithPageNumber(pageNumber, state.pager.pageLimit, state.pager.pageListSize)}}
    }else
    if(state.pager.pageList.findIndex( (val) => {return val === pageNumber+1}) === 0){
      return {...state, pager:{ ...state.pager, pageNumber: pageNumber, pageList: returnPageListWithPageNumber(pageNumber-state.pager.pageListSize+1 >=  0 ? pageNumber-state.pager.pageListSize+1 : 0, state.pager.pageLimit, state.pager.pageListSize)}}
    }else
    return {...state, pager:{ ...state.pager, pageNumber: pageNumber}}
}

const returnLastPageList = (state: AppState, pageNumber: number) => {
  return {...state, pager:{ ...state.pager, pageNumber: pageNumber, pageList: returnPageListWithPageNumber(pageNumber-state.pager.pageListSize+1, state.pager.pageLimit, state.pager.pageListSize)}}
}


const returnPageListWithPageNumber = (pageNumber: number, pageLimit: number, pageListSize: number) => {
  let arr = new Array();
    for (let i = pageNumber; i < (pageNumber + pageListSize > pageLimit ? pageLimit : pageNumber + pageListSize) ; i++) {
      arr.push(i +1);
    }
    return arr;
}
