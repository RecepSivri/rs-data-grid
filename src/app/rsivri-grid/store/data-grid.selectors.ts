import { createFeatureSelector, createSelector } from "@ngrx/store";

export const selectDataGrid = createFeatureSelector('dataGrid');

export const selectData = createSelector(
    selectDataGrid,
    (state: any) => state.data
  );