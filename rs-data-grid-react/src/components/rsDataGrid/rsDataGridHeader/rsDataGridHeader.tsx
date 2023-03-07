
import { IColumn } from '../models/rsDataGrid.models';
import './rsDataGridHeader.scss'
export interface IRsDataGridHeaderProps {
  data: any[];
  column?: IColumn[]; 
}

export const RsDataGridHeader = (param: IRsDataGridHeaderProps)  => {
  const {data, column} = param;
  console.log(data, column)
  return (
    <div className='row-layout-start rs-data-grid-header'>
      <div>deneme</div>
    </div>
  )
}