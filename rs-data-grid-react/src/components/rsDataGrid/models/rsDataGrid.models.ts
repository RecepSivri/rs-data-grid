export interface IColumn {
    name: string;
    dataField: string;
    customize?: ICustom;
    customizeHeader? : ICustomizeHeader
}

export interface ICustom {
    width?: string;
    height?: string;
    template?: React.ReactNode;
}

export interface ICustomization {
    border?: IBorder;
    showHeader?: boolean;
    crossRow?: ICrossRow;
}

export interface IBorder {
    borderOuter?: boolean,
    borderInnerHorizontal?: boolean,
    borderInnerVertical?: boolean,
    borderColor?: string,
    borderRadius?: IBorderRadius;
}

export interface IBorderRadius {
    borderRadiusTopLeft?: string;
    borderRadiusTopRight?: string;
    borderRadiusBottomRight?: string;
    borderRadiusBottomLeft?: string;
}

export interface ICrossRow {
    crossRowEnable?: boolean;
    crossRowColors1?: string;
    crossRowColors2?: string;
}

export interface ICustomizeHeader {
    height: string;
    template?: React.ReactNode;
}