import { createFeatureSelector, createSelector } from "@ngrx/store";

export const selectDataGrid = createFeatureSelector('dataGrid');

export const selectData = createSelector(
    selectDataGrid,
    (state: any) => state.data
  );

export const selectPageNum = createSelector(
   selectDataGrid,
   (state: any) => state.pageNumber
);

export const selectPageSize = createSelector(
    selectDataGrid,
    (state: any) => state.pageSize
 );