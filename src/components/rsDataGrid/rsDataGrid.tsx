import { RsDataGridTable } from "./rsDataGridTable/rsDataGridTable";
import "./rsDataGrid.scss";
import {
  IColumn,
  ICustomization,
  IRsDataGridData,
} from "./models/rsDataGrid.models";
import { RsDataGridHeader } from "./rsDataGridHeader/rsDataGridHeader";
import { useEffect, useState } from "react";
import React from "react";
import { RsDataGridPager } from "./rsDataGridPager/rsDataGridPager";
export interface IRsDataGridProps {
  data?: any[];
  column?: IColumn[];
  customization?: ICustomization;
  fetchData?: string;
}
export const TableStateContext = React.createContext({});

export const RsDataGrid = (param: IRsDataGridProps) => {
  const { data, column, customization, fetchData } = param;
  const customizationInit: ICustomization = {
    showHeader: customization
      ? customization.showHeader
        ? customization.showHeader
        : true
      : true,
    border: {
      borderOuter: customization
        ? customization.border
          ? customization.border.borderOuter
            ? customization.border.borderOuter
            : true
          : true
        : true,
      borderInnerHorizontal: customization
        ? customization.border
          ? customization.border.borderInnerHorizontal
            ? customization.border.borderInnerHorizontal
            : true
          : true
        : true,
      borderInnerVertical: customization
        ? customization.border
          ? customization.border.borderInnerVertical
            ? customization.border.borderInnerVertical
            : true
          : true
        : true,
      borderColor: customization
        ? customization.border
          ? customization.border.borderColor
            ? customization.border.borderColor
            : "#ccc"
          : "#ccc"
        : "#ccc",
      borderRadius: {
        borderRadiusTopLeft: customization
          ? customization.border
            ? customization.border
              ? customization.border.borderRadius
                ? customization.border.borderRadius.borderRadiusTopLeft
                  ? customization.border.borderRadius.borderRadiusTopLeft
                  : "0px"
                : "0px"
              : "0px"
            : "0px"
          : "0px",
        borderRadiusTopRight: customization
          ? customization.border
            ? customization.border
              ? customization.border.borderRadius
                ? customization.border.borderRadius.borderRadiusTopRight
                  ? customization.border.borderRadius.borderRadiusTopRight
                  : "0px"
                : "0px"
              : "0px"
            : "0px"
          : "0px",
        borderRadiusBottomRight: customization
          ? customization.border
            ? customization.border
              ? customization.border.borderRadius
                ? customization.border.borderRadius.borderRadiusBottomRight
                  ? customization.border.borderRadius.borderRadiusBottomRight
                  : "0px"
                : "0px"
              : "0px"
            : "0px"
          : "0px",
        borderRadiusBottomLeft: customization
          ? customization.border
            ? customization.border
              ? customization.border.borderRadius
                ? customization.border.borderRadius.borderRadiusBottomLeft
                  ? customization.border.borderRadius.borderRadiusBottomLeft
                  : "0px"
                : "0px"
              : "0px"
            : "0px"
          : "0px",
      },
    },
    crossRow: {
      crossRowEnable: customization
        ? customization.crossRow
          ? customization.crossRow.crossRowEnable
            ? customization.crossRow.crossRowEnable
            : false
          : false
        : false,
      crossRowColors1: customization
        ? customization.crossRow
          ? customization.crossRow.crossRowColors1
            ? customization.crossRow.crossRowColors1
            : "#ddd"
          : "#ddd"
        : "#ddd",
      crossRowColors2: customization
        ? customization.crossRow
          ? customization.crossRow.crossRowColors2
            ? customization.crossRow.crossRowColors2
            : "#fff"
          : "#fff"
        : "#fff",
    },
    page: {
      page: customization
        ? customization.page
          ? customization.page.page
            ? customization.page.page
            : 0
          : 0
        : 0,
      pageCurrSize: customization
        ? customization.page
          ? customization.page.pageCurrSize
            ? customization.page.pageCurrSize
            : 5
          : 5
        : 5,
      pageSizeList: customization
        ? customization.page
          ? customization.page.pageSizeList
            ? customization.page.pageSizeList
            : [10, 20, 40, 50, 100]
          : [10, 20, 40, 50, 100]
        : [10, 20, 40, 50, 100],
      pageNumList: customization
        ? customization.page
          ? Array.from(
              { length: customization.page.pageCurrSize },
              (_, index) => index,
            )
            ? Array.from(
                { length: customization.page.pageCurrSize },
                (_, index) => index,
              )
            : [0, 1, 2, 3, 4]
          : [0, 1, 2, 3, 4]
        : [0, 1, 2, 3, 4],
      pageSize: customization
        ? customization.page
          ? customization.page.pageSize
            ? customization.page.pageSize
            : 10
          : 10
        : 10,
    },
  };

  const dataTableInitialState: IRsDataGridData = {
    data: data ? data : [],
    page: {
      page: customizationInit
        ? customizationInit.page
          ? customizationInit.page.page
          : 0
        : 0,
      pageCurrSize: customizationInit
        ? customizationInit.page
          ? customizationInit.page.pageCurrSize
          : 5
        : 5,
      pageSizeList: customizationInit
        ? customizationInit.page
          ? customizationInit.page.pageSizeList
          : [10, 20, 40, 50, 100]
        : [10, 20, 40, 50, 100],
      pageNumList: customizationInit
        ? customizationInit.page
          ? customizationInit.page.pageNumList
          : [0, 1, 2, 3, 4]
        : [0, 1, 2, 3, 4],
      pageSize: customizationInit
        ? customizationInit.page
          ? customizationInit.page.pageSize
          : 10
        : 10,
      length: customizationInit
        ? customizationInit.page
          ? Math.ceil(
              (data ? data : []).length / customizationInit.page.pageSize,
            )
          : 0
        : 0,
    },
  };
  const [dataTableState, setDataTable] = useState(dataTableInitialState);

  const border: any = customizationInit?.border;
  const isFullScreen = !column?.some((item: IColumn) => {
    return item.customize?.width === undefined;
  });
  let totalWidth: number | undefined = 0;
  if (isFullScreen) {
    totalWidth = column?.reduce((accumulator, value) => {
      const val = value.customize?.width
        ? parseInt(value.customize?.width.replace(/\D/g, ""))
        : 0;
      return accumulator + val;
    }, 0);
  }

  const { page } = customizationInit;
  useEffect(() => {
    if (fetchData) {
      fetch(fetchData ? fetchData : "")
        .then((response: any) => {
          return response.json();
        })
        .then(
          (data: any) => {
            if (page) {
              setDataTable({
                ...dataTableState,
                data: data,
                page: {
                  ...page,
                  length: Math.ceil(data.length / dataTableState.page.pageSize),
                },
              });
            }
          },
          (error: any) => {
            console.log(error);
          },
        );
    }
  }, []);
  return (
    <div className="rs-data-grid-container">
      <div
        className="rs-data-grid"
        style={{
          borderBottomLeftRadius: border
            ? border.borderRadius
              ? border.borderRadius.borderRadiusBottomLeft
              : ""
            : "",
          borderBottomRightRadius: border
            ? border.borderRadius
              ? border.borderRadius.borderRadiusBottomRight
              : ""
            : "",
          borderTopLeftRadius: border
            ? border.borderRadius
              ? border.borderRadius.borderRadiusTopLeft
              : ""
            : "",
          borderTopRightRadius: border
            ? border.borderRadius
              ? border.borderRadius.borderRadiusTopRight
              : ""
            : "",
          width: isFullScreen
            ? totalWidth
              ? totalWidth + "px"
              : "100%"
            : "100%",
          border: border
            ? border.borderOuter
              ? border.borderColor
                ? "1px solid " + border.borderColor
                : "1px solid #ccc"
              : "0px solid #ccc"
            : "1px solid #ccc",
        }}
      >
        {customizationInit?.showHeader && dataTableState.data && (
          <TableStateContext.Provider value={{ dataTableState, setDataTable }}>
            <RsDataGridHeader
              column={column}
              customization={customizationInit}
            />
          </TableStateContext.Provider>
        )}
        {dataTableState.data && (
          <TableStateContext.Provider value={{ dataTableState, setDataTable }}>
            <RsDataGridTable
              column={column}
              customization={customizationInit}
            />
          </TableStateContext.Provider>
        )}
      </div>
      {dataTableState.data && (
        <TableStateContext.Provider value={{ dataTableState, setDataTable }}>
          <RsDataGridPager customization={customizationInit}></RsDataGridPager>
        </TableStateContext.Provider>
      )}
    </div>
  );
};
