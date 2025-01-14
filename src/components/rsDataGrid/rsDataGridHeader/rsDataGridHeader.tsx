import { useContext } from "react";
import { IColumn, ICustomization } from "../models/rsDataGrid.models";
import { TableStateContext } from "../rsDataGrid";
import "./rsDataGridHeader.scss";
export interface IRsDataGridHeaderProps {
  data?: any[];
  column?: IColumn[];
  customization?: ICustomization;
}

export const RsDataGridHeader = (param: IRsDataGridHeaderProps) => {
  const { column, customization } = param;
  const border: any = customization?.border;
  const tableState: any = useContext(TableStateContext);
  const { data, page } = tableState.dataTableState;
  let heightOfAllHeader: string = "20px";
  const setHeight = column?.some((item: IColumn) => {
    return item.customizeHeader?.height !== undefined;
  });
  if (setHeight) {
    const columnItem: IColumn | undefined = column?.find((item: IColumn) => {
      return item.customizeHeader?.height !== undefined;
    });
    heightOfAllHeader = columnItem
      ? columnItem.customizeHeader
        ? columnItem.customizeHeader.height
        : "20px"
      : "20px";
  }
  return (
    <div className="row-start-layout rs-data-grid-header">
      <div
        className="row-start-layout rs-data-grid-header-row"
        style={{
          borderBottom: border
            ? border.borderInnerHorizontal
              ? border.borderColor
                ? "1px solid " + border.borderColor
                : "1px solid #ccc"
              : ""
            : "",
        }}
      >
        {data &&
          data.length > 0 &&
          !column &&
          Object.keys(data[0]).map((item: any, index: number) => {
            return (
              <div
                className="rs-data-grid-header-item row-layout-center"
                key={"rs-data-grid-header-item-" + index}
                style={{
                  borderRight:
                    index !== Object.keys(data[0]).length - 1
                      ? border.borderColor
                        ? "1px solid " + border.borderColor
                        : "1px solid #ccc"
                      : "",
                }}
              >
                {item}
              </div>
            );
          })}
        {data &&
          data.length > 0 &&
          column &&
          column.map((item: IColumn, index: number) => {
            return (
              <div
                className="rs-data-grid-header-item row-layout-center"
                key={"rs-data-grid-header-item-" + index}
                style={{
                  borderRight: border
                    ? border.borderInnerHorizontal
                      ? index !== column.length - 1
                        ? border.borderColor
                          ? "1px solid " + border.borderColor
                          : "1px solid #ccc"
                        : ""
                      : ""
                    : "",
                  width: item.customize
                    ? item.customize.width
                      ? item.customize.width
                      : "inherit"
                    : "100%",
                  height: heightOfAllHeader,
                }}
              >
                {item.customizeHeader
                  ? item.customizeHeader.template
                    ? item.customizeHeader.template
                    : item.name
                  : item.name}
              </div>
            );
          })}
      </div>
    </div>
  );
};
