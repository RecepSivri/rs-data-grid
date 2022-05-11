import {Component, Input, OnInit} from '@angular/core';
import {IColumn} from "../../core/models/IColumn";

@Component({
  selector: 'rsivri-grid',
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements  OnInit{
  @Input() data: any[];
  @Input() columns: IColumn[];


  constructor() {
    this.data = [];
    this.columns = [];
  }

  ngOnInit(){
    this.initializeColumn();
  }


  initializeColumn = () => {
    console.log(this.data.length > 0 ? this.data : "aboov");
    const result = Object.keys(Object.assign({}, ...this.data));
     if(this.columns.length === 0){
       this.columns = result.map((item) =>{
         return {caption: item, dataField: item}
       })
     }
  }
}
