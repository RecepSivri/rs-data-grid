export interface AppState {
    data: any[];
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