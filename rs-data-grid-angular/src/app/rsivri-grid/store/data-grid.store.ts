import { Injectable, computed, effect, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { AppState } from './data-grid.state';

const initialState: AppState = {
  pager: {
    pageSize: 10,
    pageNumber: 0,
    pageList: [1, 2, 3, 4, 5],
    pageListSize: 5,
    pageLimit: 10,
    remotePage: false
  },
  data: []
};

export const setDataWrapper = (state: AppState, data: any, remote: boolean, remoteDatasize: number | undefined) => {
  return ({...state,
      data: data,
      pager: remote ?  {
        ...state.pager,
        remoteDataSize: remoteDatasize,
        remotePage: remote,
        pageLimit: remoteDatasize? Math.ceil(remoteDatasize/state.pager.pageSize) : 0,
        pageList: returnPageList(state.pager.pageListSize,Math.ceil((remoteDatasize ? Math.ceil(remoteDatasize/state.pager.pageSize) : 0 )/state.pager.pageSize))
      }:

      {
        ...state.pager,
        pageLimit: Math.ceil(data.length/state.pager.pageSize),
        pageList: returnPageList(state.pager.pageListSize,Math.ceil(data.length/state.pager.pageSize)),
        remotePage: remote,
      }})
}

export const applyFilters = (data: any[], filters: Record<string, string[]>): any[] => {
  const activeFilters = Object.entries(filters).filter(([, values]) => Array.isArray(values) && values.length > 0);
  if (activeFilters.length === 0) {
    return data;
  }
  return data.filter(row => activeFilters.every(([field, values]) =>
    values.includes(String(row[field] ?? ''))
  ));
}

export const returnPageList = (pageListSize: number, pageLimit: number) => {
  let arr = new Array();
    for (let i = 0; i < (pageListSize > pageLimit ? pageLimit : pageListSize); i++) {
      arr.push(i +1);
    }
    return arr;
}

export const returnPageStateRelatedPageNum = (state: AppState, pageNumber: number,flag:string) => {

    let pageVal = pageNumber;
    if(pageVal === 0 || pageVal === state.pager.pageLimit -1){
      return {...state, pager:{ ...state.pager, pageNumber: pageVal}}
    }else
    if(state.pager.pageList.findIndex( (val) => {return val === returnConditionIncrease(flag, pageVal+1)}) === state.pager.pageListSize-1){
      return {...state, pager:{ ...state.pager, pageNumber: pageVal, pageList: returnPageListWithPageNumber(pageVal, state.pager.pageLimit, state.pager.pageListSize)}}
    }else
    if(state.pager.pageList.findIndex( (val) => {return val === returnConditionDecrese(flag, pageVal+1)}) === 0){
      return {...state, pager:{ ...state.pager, pageNumber: pageVal, pageList: returnPageListWithPageNumber(pageVal-state.pager.pageListSize+1 >  0 ? pageVal-state.pager.pageListSize+1 : 0, state.pager.pageLimit, state.pager.pageListSize)}}
    }else
    return {...state, pager:{ ...state.pager, pageNumber: pageVal}}
}

const returnConditionDecrese = (flag: string, pageVal: number)=> {
  if(flag=== 'decrease'){
    return pageVal+1;
  }else{
    return pageVal
  }
}

const returnConditionIncrease = (flag: string, pageVal: number)=> {
  if(flag=== 'increase'){
    return pageVal-1;
  }else{
    return pageVal
  }
}

export const returnLastPageList = (state: AppState, pageNumber: number) => {
  return {...state, pager:{ ...state.pager, pageNumber: pageNumber, pageList: returnPageListWithPageNumber(pageNumber-state.pager.pageListSize+1, state.pager.pageLimit, state.pager.pageListSize)}}
}

const returnPageListWithPageNumber = (pageNumber: number, pageLimit: number, pageListSize: number) => {
  let arr = new Array();
    for (let i = pageNumber; i < (pageNumber + pageListSize > pageLimit ? pageLimit : pageNumber + pageListSize) ; i++) {
      arr.push(i +1);
    }
    return arr;
}

interface FetchConfig {
  baseUrl: string;
  section?: string;
  remote: boolean;
  totalSection?: string;
}

@Injectable()
export class DataGridStore {
  private readonly _state = signal<AppState>(initialState);
  private readonly _filters = signal<Record<string, string[]>>({});

  readonly filters = this._filters.asReadonly();
  readonly filteredData = computed(() => applyFilters(this._state().data, this._filters()));
  readonly data = computed(() => this.filteredData());
  readonly rawData = computed(() => this._state().data);
  readonly pageNumber = computed(() => this._state().pager.pageNumber);
  readonly pageSize = computed(() => this._state().pager.pageSize);
  readonly pageList = computed(() => this._state().pager.pageList);
  readonly pageLimit = computed(() => this._state().pager.pageLimit);

  private readonly _fetchConfig = signal<FetchConfig | null>(null);

  private readonly resource = httpResource<any>(() => {
    const cfg = this._fetchConfig();
    if (!cfg) {
      return undefined;
    }
    if (!cfg.remote) {
      return cfg.baseUrl;
    }
    const url = new URL(cfg.baseUrl);
    url.searchParams.set('page', String(this.pageNumber()));
    url.searchParams.set('size', String(this.pageSize()));
    return url.href;
  });

  constructor() {
    effect(() => {
      const cfg = this._fetchConfig();
      const values = this.resource.value();
      if (!cfg || values === undefined) {
        return;
      }
      this.setData(
        cfg.section ? values[cfg.section] || [] : values || [],
        cfg.remote,
        cfg.totalSection ? values[cfg.totalSection] : undefined
      );
    });
  }

  setData(data: any[], remote: boolean, remoteDatasize?: number) {
    this._state.update(s => setDataWrapper(s, data, remote, remoteDatasize));
  }

  fetchData(baseUrl: string, section: string | undefined, remote: boolean, totalSection?: string) {
    this._fetchConfig.set({ baseUrl, section, remote, totalSection });
  }

  changePageSize(pageSize: number) {
    this._state.update(s => {
      const length = s.pager.remotePage ? s.data.length : applyFilters(s.data, this._filters()).length;
      const pageLimit = Math.ceil(length/pageSize);
      return {...s, pager:{...s.pager, pageSize: pageSize, pageLimit, pageList: returnPageList(s.pager.pageListSize, pageLimit)}};
    });
  }

  setFilter(dataField: string, values: string[]) {
    this._filters.update(f => ({...f, [dataField]: values}));
    this._state.update(s => {
      if (s.pager.remotePage) {
        return s;
      }
      const pageLimit = Math.ceil(applyFilters(s.data, this._filters()).length/s.pager.pageSize);
      return {...s, pager:{...s.pager, pageNumber: 0, pageLimit, pageList: returnPageList(s.pager.pageListSize, pageLimit)}};
    });
  }

  changePageNumber(pageNumber: number) {
    this._state.update(s => returnPageStateRelatedPageNum(s, pageNumber, 'none'));
  }

  changePageListSize(pageListSize: number) {
    this._state.update(s => ({...s, pager:{ ...s.pager, pageListSize: pageListSize, pageList: returnPageList(pageListSize, s.pager.pageLimit)}}));
  }

  increasePageNum() {
    this._state.update(s => returnPageStateRelatedPageNum(s, s.pager.pageNumber === s.pager.pageLimit-1 ? s.pager.pageNumber: s.pager.pageNumber +1, 'increase'));
  }

  decreasePageNum() {
    this._state.update(s => returnPageStateRelatedPageNum(s, s.pager.pageNumber === 0 ? 0 : s.pager.pageNumber - 1,'decrease'));
  }

  lastPageNum() {
    this._state.update(s => returnLastPageList(s, s.pager.pageLimit-1));
  }
}
