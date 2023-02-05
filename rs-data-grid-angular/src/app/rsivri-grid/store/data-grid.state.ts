export interface AppState {
    data: [];
    pager: Pager;
}


export interface Pager {
    pageNumber: number;
    pageSize: number;
    pageList: number[];
    pageListSize: number;
    pageLimit: number;  
    remotePage: boolean;
    remoteDataSize?: number;
}