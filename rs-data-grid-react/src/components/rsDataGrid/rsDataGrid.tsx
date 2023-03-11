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
  const isFullScreen = !column?.some((item: IColumn) => {
    return item.customize?.width === undefined
  });
  let totalWidth: number | undefined = 0;
  console.log(isFullScreen);
  if(isFullScreen){
    totalWidth = column?.reduce((accumulator, value) => {
      const val = value.customize?.width ? parseInt(value.customize?.width.replace(/\D/g, "")) : 0;
      return accumulator + val;
    }, 0);
  }
  return (
    <div className="rs-data-grid"
    style={{
      width: isFullScreen ? (totalWidth ? totalWidth + 'px' : '100%'): '100%'
    }}>
      <RsDataGridHeader data = {data} column= {column}/>
      <RsDataGridTable data = {data} column= {column}/>
     </div>
  )
}