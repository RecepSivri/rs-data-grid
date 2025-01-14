import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectDataGrid = createFeatureSelector('dataGrid');

export const selectData = createSelector(
  selectDataGrid,
  (state: any) => state.data,
);

export const selectPageNum = createSelector(
  selectDataGrid,
  (state: any) => state.pager.pageNumber,
);

export const selectPageSize = createSelector(
  selectDataGrid,
  (state: any) => state.pager.pageSize,
);

export const selectPageList = createSelector(
  selectDataGrid,
  (state: any) => state.pager.pageList,
);

export const selectPageLimit = createSelector(
  selectDataGrid,
  (state: any) => state.pager.pageLimit,
);
