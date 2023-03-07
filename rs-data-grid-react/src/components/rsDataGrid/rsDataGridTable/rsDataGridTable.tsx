import './rsDataGridTable.scss'
export interface IRsDataGridTableProps {
  data: any[];
}

export const RsDataGridTable = (param: IRsDataGridTableProps)  => {
  const {data} = param;
  return (
    <div className="column-start-layout rs-data-grid-table">
      {
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