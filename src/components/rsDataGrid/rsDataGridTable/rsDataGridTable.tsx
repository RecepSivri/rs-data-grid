import { useContext } from "react";
import { IColumn, ICustomization } from "../models/rsDataGrid.models";
import "./rsDataGridTable.scss";
import { TableStateContext } from "../rsDataGrid";
export interface IRsDataGridTableProps {
  data?: any[];
  column?: IColumn[];
  customization?: ICustomization;
}

const getHeight = (column: IColumn[]) => {
  const arr: number[] = column.map((columnItem: IColumn) => {
    const val: any = parseInt(
      columnItem.customize?.height?.replace(/\D/g, "") + "",
    );
    return val ? val : 0;
  });
  return Math.max(...arr);
};

export const RsDataGridTable = (param: IRsDataGridTableProps) => {
  const { column, customization } = param;
  const border: any = customization?.border;
  const crossRow: any = customization?.crossRow;

  const tableState: any = useContext(TableStateContext);
  const { data, page } = tableState.dataTableState;
  return (
    <div className="column-start-layout rs-data-grid-table">
      {column &&
        data &&
        data
          .slice(
            page.page * page.pageSize,
            returnLastSize(data, page.page + 1, page.pageSize),
          )
          .map((item: any, index: number) => {
            return (
              <div
                className="row-start-layout rs-data-grid-table-row"
                style={{
                  borderBottom: border
                    ? border.borderInnerHorizontal
                      ? index !==
                        data.slice(
                          page.page * page.pageSize,
                          returnLastSize(data, page.page + 1, page.pageSize),
                        ).length -
                          1
                        ? border
                          ? border.borderColor
                            ? "1px solid " + border.borderColor
                            : "1px solid #ccc"
                          : "1px solid #ccc"
                        : ""
                      : ""
                    : "",
                  height:
                    getHeight(column) > 0 ? getHeight(column) + "px" : "unset",
                  backgroundColor: crossRow
                    ? crossRow.crossRowEnable
                      ? index % 2 === 0
                        ? crossRow.crossRowColors1
                        : crossRow.crossRowColors2
                      : ""
                    : "",
                }}
                key={"row-table-" + index}
              >
                {column.map((value: any, index2: number) => {
                  return (
                    <div
                      className="rs-data-grid-table-cell row-layout-center "
                      style={{
                        borderRight: border
                          ? border.borderInnerVertical
                            ? index2 !== column.length - 1
                              ? border.borderColor
                                ? "1px solid " + border.borderColor
                                : "1px solid #ccc"
                              : ""
                            : ""
                          : "",
                        width: value.customize
                          ? value.customize.width
                            ? value.customize.width
                            : "inherit"
                          : "100%",
                      }}
                      key={"column-table-" + index + "-" + index2}
                    >
                      {value.customize
                        ? value.customize.template
                          ? value.customize.template
                          : item[value.dataField]
                        : item[value.dataField]}
                    </div>
                  );
                })}
              </div>
            );
          })}
      {!column &&
        data &&
        data
          .slice(
            page.page * page.pageSize,
            returnLastSize(data, page.page + 1, page.pageSize),
          )
          .map((item: any, index: number) => {
            return (
              <div
                className="row-start-layout rs-data-grid-table-row"
                style={{
                  borderBottom: border
                    ? border.borderInnerHorizontal
                      ? index !==
                        data.slice(
                          page.page * page.pageSize,
                          returnLastSize(data, page.page + 1, page.pageSize),
                        ).length -
                          1
                        ? border
                          ? border.borderColor
                            ? "1px solid " + border.borderColor
                            : "1px solid #ccc"
                          : "1px solid #ccc"
                        : ""
                      : ""
                    : "",
                }}
                key={"row-table-" + index}
              >
                {Object.values(item).map((value: any, index2: number) => {
                  return (
                    <div
                      className="rs-data-grid-table-cell row-layout-center "
                      style={{
                        borderRight:
                          index2 !== Object.values(item).length - 1
                            ? "1px solid #ccc"
                            : "",
                      }}
                      key={"column-table-" + index + "-" + index2}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            );
          })}
    </div>
  );
};

const returnLastSize = (data: any[], lastSize: number, pageSize: number) => {
  return data.length > lastSize * pageSize ? lastSize * pageSize : data.length;
};
