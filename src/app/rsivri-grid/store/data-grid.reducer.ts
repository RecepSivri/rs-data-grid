import { createReducer, on } from '@ngrx/store';
import { changePageSize, setData } from './data-grid.actions';
import { AppState } from './data-grid.state';
export const initialState: AppState = {
    pageSize: 10,
    pageNumber: 0,
    data: []

}

export const dataGridReducer = createReducer(
  initialState,
  on(setData, (state, { data:data }) => ({...state, data: data})),
  on(changePageSize, (state, { pageSize: pageSize }) => ({...state, pageSize: pageSize}))
);
