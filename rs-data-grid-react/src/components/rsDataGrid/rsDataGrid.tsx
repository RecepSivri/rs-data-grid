import { RsDataGridTable } from "./rsDataGridTable/rsDataGridTable";
import './rsDataGrid.scss'
import { IColumn, ICustomization } from "./models/rsDataGrid.models";
import { RsDataGridHeader } from "./rsDataGridHeader/rsDataGridHeader";
export interface IRsDataGridProps {
  data: any[];
  column?: IColumn[];
  customization?: ICustomization;
}


export const RsDataGrid = (param: IRsDataGridProps)  => {
  const {data, column, customization} = param;
  const customizationInit: ICustomization = {
    showHeader: customization ? customization.showHeader ?  customization.showHeader : true : true,
    border: {
      borderOuter: customization ? customization.border ? customization.border.borderOuter ? customization.border.borderOuter :true: true :true,
      borderInnerHorizontal: customization ? customization.border ? customization.border.borderInnerHorizontal ? customization.border.borderInnerHorizontal :true: true :true,
      borderInnerVertical: customization ? customization.border ? customization.border.borderInnerVertical ? customization.border.borderInnerVertical :true: true :true,
      borderColor: customization ? customization.border ? customization.border.borderColor ? customization.border.borderColor :'#ccc': '#ccc' : '#ccc',
      borderRadius:{
        borderRadiusTopLeft: customization ? customization.border ? customization.border ? customization.border.borderRadius ? customization.border.borderRadius.borderRadiusTopLeft ? customization.border.borderRadius.borderRadiusTopLeft : '0px'  : '0px' :'0px': '0px' : '0px',
        borderRadiusTopRight: customization ? customization.border ? customization.border ? customization.border.borderRadius ? customization.border.borderRadius.borderRadiusTopRight ? customization.border.borderRadius.borderRadiusTopRight : '0px'  : '0px' :'0px': '0px' : '0px',
        borderRadiusBottomRight: customization ? customization.border ? customization.border ? customization.border.borderRadius ? customization.border.borderRadius.borderRadiusBottomRight ? customization.border.borderRadius.borderRadiusBottomRight : '0px'  : '0px' :'0px': '0px' : '0px',
        borderRadiusBottomLeft: customization ? customization.border ? customization.border ? customization.border.borderRadius ? customization.border.borderRadius.borderRadiusBottomLeft ? customization.border.borderRadius.borderRadiusBottomLeft : '0px'  : '0px' :'0px': '0px' : '0px',
      }
    },
    crossRow: {
      crossRowEnable : customization ? customization.crossRow ?  customization.crossRow.crossRowEnable ? customization.crossRow.crossRowEnable : false : false : false,
      crossRowColors1: customization ? customization.crossRow ?  customization.crossRow.crossRowColors1 ? customization.crossRow.crossRowColors1 : '#ddd' : '#ddd' : '#ddd',
      crossRowColors2: customization ? customization.crossRow ?  customization.crossRow.crossRowColors2 ? customization.crossRow.crossRowColors2 : '#fff' : '#fff' : '#fff',
    }
  }
  const border:any = customizationInit?.border;
  const isFullScreen = !column?.some((item: IColumn) => {
    return item.customize?.width === undefined
  });
  let totalWidth: number | undefined = 0;
  if(isFullScreen){
    totalWidth = column?.reduce((accumulator, value) => {
      const val = value.customize?.width ? parseInt(value.customize?.width.replace(/\D/g, "")) : 0;
      return accumulator + val;
    }, 0);
  }
  return (
    <div className="rs-data-grid"
    style={{
      borderBottomLeftRadius: border ? border.borderRadius ? (border.borderRadius.borderRadiusBottomLeft): '': '',
      borderBottomRightRadius: border ? border.borderRadius ? (border.borderRadius.borderRadiusBottomRight): '': '',
      borderTopLeftRadius: border ? border.borderRadius ? (border.borderRadius.borderRadiusTopLeft): '': '',
      borderTopRightRadius: border ? border.borderRadius ? (border.borderRadius.borderRadiusTopRight): '': '',
      width: isFullScreen ? (totalWidth ? totalWidth + 'px' : '100%'): '100%',
      border: border ? (border.borderOuter ? (border.borderColor ? '1px solid '+ border.borderColor : '1px solid #ccc') : '0px solid #ccc' ):   '1px solid #ccc'
    }}>
      {
        customizationInit?.showHeader &&
        <RsDataGridHeader data = {data} column= {column} customization = {customizationInit}/>
      }
      <RsDataGridTable data = {data} column= {column} customization = {customizationInit}/>
     </div>
  )
}