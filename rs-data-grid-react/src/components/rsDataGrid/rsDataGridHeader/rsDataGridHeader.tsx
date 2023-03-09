
import { IColumn } from '../models/rsDataGrid.models';
import './rsDataGridHeader.scss'
export interface IRsDataGridHeaderProps {
  data: any[];
  column?: IColumn[]; 
}

export const RsDataGridHeader = (param: IRsDataGridHeaderProps)  => {
  const {data, column} = param;
  return (
    <div className='row-start-layout rs-data-grid-header'>
        <div className='row-start-layout rs-data-grid-header-row'>
          {
            data.length > 0 && !column &&
            Object.keys(data[0]).map((item: any, index: number) => {
              return <div className='rs-data-grid-header-item row-layout-center' key={'rs-data-grid-header-item-'+index}
              style={{
                borderRight: index !== Object.keys(data[0]).length -1 ?  "1px solid #ccc" : ""
              }}>{item}</div>
            })
          }
          {
            data.length > 0 && column &&
            column.map((item: any, index: number) => {
              return <div className='rs-data-grid-header-item row-layout-center' key={'rs-data-grid-header-item-'+index}
              style={{
                borderRight: index !== column.length -1 ?  "1px solid #ccc" : ""
              }}>{item.name}</div>
            })
          }
        </div>
    </div>
  )
}