import { createAction, props } from '@ngrx/store';


export const fetchData = createAction(
    '[DataGrid/API] Data fetch',
    props<{ url: string }>()
);


export const setData = createAction(
    '[DataGrid/API] Set Data',
    props<{ data: any }>()
);

export const changePageSize = createAction(
    '[DataGrid/API] Change Page Size',
    props<{ pageSize: any }>()
);

export const changePageNumber = createAction(
    '[DataGrid/API] Change Page Number',
    props<{ pageNumber: any }>()
);


export const changePageListSize = createAction(
    '[DataGrid/API] Change Page List Size',
    props<{ pageListSize: any }>()
);

export const increasePageNum = createAction(
    '[DataGrid/API] Increase Page Num',
);

export const decreasePageNum = createAction(
    '[DataGrid/API] Decrease Page Num',
);