/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { useContext } from "react";
import { ICustomization } from "../models/rsDataGrid.models";
import { TableStateContext } from "../rsDataGrid";
import "./rsDataGridPager.scss";
export interface IRsDataGridPagerProps {
  customization?: ICustomization;
}

export const RsDataGridPager = (param: IRsDataGridPagerProps) => {
  const tableState: any = useContext(TableStateContext);
  const { customization } = param;
  const { border } = customization ? customization : { border: null };
  const { dataTableState, setDataTable } = tableState;
  const { page } = dataTableState;

  const setPageSize = (val: number) => {
    setDataTable({
      ...dataTableState,
      page: {
        ...dataTableState.page,
        pageSize: val,
        length: Math.ceil(dataTableState.data.length / val),
      },
    });
  };

  const  createNumberArray = (start: number, end: number): number[] =>  {
    if (start > end) {
      throw new Error("Start value must be less than or equal to the end value.");
    }
  
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  const setPageNumber = (val: number) => {
    console.log( page.length -1, page.page + page.pageCurrSize)
    if (val < page.pageNumList[0]) {
      if (val > 0) {
        setDataTable({
          ...dataTableState,
          page: {
            ...dataTableState.page,
            pageNumList: page.pageNumList.map(
              (item: number) => item - page.pageCurrSize,
            ),
          },
        });
      }
    } else if (val < page.length - 1 && val > page.pageNumList[page.pageNumList.length - 1]) {
      setDataTable({
        ...dataTableState,
        page: {
          ...dataTableState.page,
          page: val,
          pageNumList: val +  page.pageCurrSize < page.length ? page.pageNumList.map(
            (item: number) => item + page.pageCurrSize,
          ): createNumberArray(val-1,  page.length-2)
        },
      });
    } else {
      setDataTable({
        ...dataTableState,
        page: { ...dataTableState.page, page: val },
      });
    }
  };

  return (
    <div className="rs-datagrid-pager row-layout-space-between">
      <div
        className="row-start-layout rs-datagrid-pager-number-list"
        style={{
          border: border
            ? border.borderOuter
              ? "1px solid " + border.borderColor
              : ""
            : "1px solid #ccc",
        }}
      >
        <div
          onClick={() => {
            setPageNumber(page.page - 1 > 0 ? page.page - 1 : 0);
          }}
          style={{
            borderRight: border
              ? border.borderOuter
                ? "1px solid " + border.borderColor
                : ""
              : "1px solid #ccc",
          }}
          key={"page-number-item-last"}
          className="rs-datagrid-pager-number-item"
        >
          {"<"}
        </div>

        {page.pageNumList.map((item: number, index: number) => {
          return (
            page.pageCurrSize > index && (
              <div
                style={{
                  borderRight: border
                    ? border.borderOuter
                      ? "1px solid " + border.borderColor
                      : ""
                    : "1px solid #ccc",
                }}
                onClick={() => {
                  setPageNumber(item);
                }}
                key={"page-number-item-" + index}
                className="rs-datagrid-pager-number-item"
              >
                {item + 1}
              </div>
            )
          );
        })}
        {
          page.length  > page.page + page.pageCurrSize &&
        <div
          onClick={() => {
            setPageNumber(page.length - 1);
          }}
          style={{
            borderRight: border
              ? border.borderOuter
                ? "1px solid " + border.borderColor
                : ""
              : "1px solid #ccc",
            minWidth: "40px",
          }}
          key={"page-number-item-last"}
          className="rs-datagrid-pager-number-item"
        >
          {page.length}
        </div>
        }
        <div
          onClick={() => {
            setPageNumber(
              page.page + 2 > page.length ? page.length : page.page + 1,
            );
          }}
          key={"page-number-item-last"}
          className="rs-datagrid-pager-number-item"
        >
          {">"}
        </div>
      </div>
      <div
        className="row-start-layout rs-datagrid-pager-size-list"
        style={{
          border: border
            ? border.borderOuter
              ? "1px solid " + border.borderColor
              : ""
            : "1px solid #ccc",
        }}
      >
        {page.pageSizeList.map((item: any, index: number) => {
          return (
            <div
              style={{
                borderRight:
                  index !== page.pageSizeList.length - 1
                    ? border
                      ? border.borderOuter
                        ? "1px solid " + border.borderColor
                        : ""
                      : "1px solid #ccc"
                    : "",
              }}
              onClick={() => {
                setPageSize(item);
              }}
              key={"page-size-item-" + index}
              className="rs-datagrid-pager-size-item"
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};
