export interface IColumn {
    name: string;
    dataField: string;
    customize?: ICustom;
}

export interface ICustom {
    width?: string;
    height?: string;
    template?: React.ReactNode;
}