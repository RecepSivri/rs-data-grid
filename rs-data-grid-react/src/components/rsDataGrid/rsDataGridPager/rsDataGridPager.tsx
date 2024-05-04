import { useContext } from 'react';
import { ICustomization } from '../models/rsDataGrid.models'
import { TableStateContext } from '../rsDataGrid';
import './rsDataGridPager.scss'
export interface IRsDataGridPagerProps {
  customization? :ICustomization
}


export const RsDataGridPager = (param: IRsDataGridPagerProps)  => {
  const tableState: any = useContext(TableStateContext);
  const {customization} = param;
  const {border} = customization ? customization: {border: null};
  const {dataTableState, setDataTable} = tableState;
  const {page} = dataTableState;
  let pageNumbers: number[] = [];
  for(let i = 0; i < page.length; ++i){
    pageNumbers.push(i)
  }

  const setPageSize = (val: number) =>{
    setDataTable({...dataTableState, page: {...dataTableState.page, pageSize: val, length: Math.ceil(dataTableState.data.length / val)}})
  }

  const setPageNumber = (val: number) =>{
    setDataTable({...dataTableState, page: {...dataTableState.page, page: val}})
  }

  return (
    <div
    className='rs-datagrid-pager row-layout-space-between'>
      <div className='row-start-layout rs-datagrid-pager-number-list'
      style={{
        border: border ? border.borderOuter ?  '1px solid ' +  border.borderColor: '' :'1px solid #ccc'
      }}>
        <div 
              onClick = {() => {setPageNumber(page.page-1 > 0 ? page.page-1  : 0)}}
              style={{
                borderRight: border ? border.borderOuter ?  '1px solid ' +  border.borderColor: '' :'1px solid #ccc' 
              }}
              key={'page-number-item-last' } className='rs-datagrid-pager-number-item'>{'<'}</div>  
        
        {
            pageNumbers.map((item: number, index: number) => {
              return page.pageCurrSize > index &&  <div style={{
                borderRight: border ? border.borderOuter ?  '1px solid ' +  border.borderColor: '' :'1px solid #ccc' 
              }}
              onClick = {() => {setPageNumber(item)}}
              key={'page-number-item-' + index } className='rs-datagrid-pager-number-item'>{item +1}</div>
            })
        }

        <div 
              onClick = {() => {setPageNumber(page.length-1)}}
              style={{
                borderRight: border ? border.borderOuter ?  '1px solid ' +  border.borderColor: '' :'1px solid #ccc',
                minWidth: '40px'
              }}
              key={'page-number-item-last' } className='rs-datagrid-pager-number-item'>{page.length}</div>  
        <div 
              onClick = {() => {setPageNumber(page.page + 1 > page.length ? page.length  : page.page + 1 )}}
              key={'page-number-item-last' } className='rs-datagrid-pager-number-item'>{'>'}</div> 
        
      </div>
      <div className='row-start-layout rs-datagrid-pager-size-list'
      style={{
        border: border ? border.borderOuter ?  '1px solid ' +  border.borderColor: '' :'1px solid #ccc'
      }}>
      {
        page.pageSizeList.map((item: any, index: number) => {
          return <div style={{
            borderRight: index !== page.pageSizeList.length-1 ? border ? border.borderOuter ?  '1px solid ' +  border.borderColor: '' :'1px solid #ccc' : ''
          }}
          onClick = {() => {setPageSize(item)}}
          key={'page-size-item-' + index } className='rs-datagrid-pager-size-item'>{item}</div>
        })
      }
      </div>
    </div>
  )
}