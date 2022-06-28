import { createReducer, on } from '@ngrx/store';
import { AppState } from './data-grid.state';
export const initialState: AppState = {
    pageSize: 10,
    pageNumber: 1,
    data: []

}

export const dataGridReducer = createReducer(
  initialState
);
