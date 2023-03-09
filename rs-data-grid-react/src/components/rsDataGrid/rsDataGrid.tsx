import { RsDataGridTable } from "./rsDataGridTable/rsDataGridTable";
import './rsDataGrid.scss'
import { IColumn } from "./models/rsDataGrid.models";
import { RsDataGridHeader } from "./rsDataGridHeader/rsDataGridHeader";
export interface IRsDataGridProps {
  data: any[];
  column?: IColumn[];
}


export const RsDataGrid = (param: IRsDataGridProps)  => {
  const {data, column} = param;
  return (
    <div className="rs-data-grid">
      <RsDataGridHeader data = {data} column= {column}/>
      <RsDataGridTable data = {data} column= {column}/>
     </div>
  )
}