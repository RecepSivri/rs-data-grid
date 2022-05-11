import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { IColumn } from '../../core/models/IColumn';

@Component({
  selector: 'rsivri-grid',
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements OnInit, OnChanges {
  @Input() data: any[];
  @Input() columns: IColumn[];


  constructor() {
    this.data = [];
    this.columns = [];
  }

  ngOnInit(){
    this.initializeColumn();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.data = changes.data.currentValue;
    this.initializeColumn();
  }


  initializeColumn = () => {
    const result = Object.keys(Object.assign({}, ...this.data));
     if(this.columns.length === 0){
       this.columns = result.map((item) => {
         return {caption: item, dataField: item}
       });
     }
  }
}
