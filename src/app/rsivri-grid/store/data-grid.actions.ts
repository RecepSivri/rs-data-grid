import { createAction, props } from '@ngrx/store';


export const fetchData = createAction(
    '[DataGrid/API] Data fetch',
    props<{ url: string }>()
);


export const setData = createAction(
    '[DataGrid/API] Set Data',
    props<{ data: any }>()
    );