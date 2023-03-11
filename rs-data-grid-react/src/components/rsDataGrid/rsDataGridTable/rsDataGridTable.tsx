import { IColumn } from '../models/rsDataGrid.models';
import './rsDataGridTable.scss'
export interface IRsDataGridTableProps {
  data: any[];
  column?: IColumn[];
}

const getHeight = (column: IColumn[]) => {
  const arr: number[] = column.map((columnItem: IColumn) => {
    const val: any = parseInt(columnItem.customize?.height?.replace(/\D/g, "") + '')
    return val ? val : 0
  });
  return Math.max(...arr);
}

export const RsDataGridTable = (param: IRsDataGridTableProps)  => {
  const {data, column} = param;
  return (
    <div className="column-start-layout rs-data-grid-table">
      {
        column && 
        data.map((item: any, index: number) => {
          return <div className="row-start-layout rs-data-grid-table-row"
          style={{
            borderBottom: index !== data.length -1 ?  "1px solid #ccc" : "",
            height: getHeight(column) > 0 ? getHeight(column) + 'px' : 'unset'
          }} 
           key={'row-table-' + index}>
          {
              column.map((value: any, index2: number) => {
                return (<div className="rs-data-grid-table-cell row-layout-center "
                style={{
                  borderRight: index2 !== column.length -1 ?  "1px solid #ccc" : "",
                  width: value.customize ? (value.customize.width ? value.customize.width : 'inherit') : '100%'
                }} 
                key={'column-table-' + index + '-' + index2}>{
                  value.customize ? (value.customize.template ? value.customize.template : item[value.dataField]) :item[value.dataField]}</div>);
              })
          }
          </div>
        })
      }
      {
        !column && 
        data.map((item: any, index: number) => {
          return <div className="row-start-layout rs-data-grid-table-row"
          style={{
            borderBottom: index !== data.length -1 ?  "1px solid #ccc" : ""
          }} 
           key={'row-table-' + index}>
          {
              Object.values(item).map((value: any, index2: number) => {
                return (<div className="rs-data-grid-table-cell row-layout-center "
                style={{
                  borderRight: index2 !== Object.values(item).length -1 ?  "1px solid #ccc" : ""
                }} 
                key={'column-table-' + index + '-' + index2}>{value}</div>);
              })
          }
          </div>
        })
      }
    </div>
  )
}