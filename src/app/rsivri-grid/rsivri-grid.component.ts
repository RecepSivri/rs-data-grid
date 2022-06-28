import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { IColumn } from '../../core/models/IColumn';
import { Store } from '@ngrx/store';
import { fetchData } from './store/data-grid.actions';
@Component({
  selector: 'rsivri-grid',
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements OnInit, OnChanges {
  @Input() data: any[];
  @Input() headerColumnLines: boolean;
  @Input() headerRowLines: boolean;
  @Input() bodyRowLines: boolean;
  @Input() bodyColumnLines: boolean;
  @Input() columns: IColumn[];
  @Input() tableBorder: boolean;
  @Input() borderRadiusTop: boolean;
  @Input() borderRadiusBottom: boolean;
  @Input() diagonalRow: boolean;
  @Input() pagination: boolean;
  @Input() pagingSizes: number[];
  @Input() currentPagingSize: number;


  constructor(private store: Store) {
    this.data = [];
    this.columns = [];
    this.headerColumnLines = true;
    this.headerRowLines = true;
    this.bodyRowLines = true;
    this.bodyColumnLines = true;
    this.tableBorder = true;
    this.borderRadiusBottom = false;
    this.borderRadiusTop = false;
    this.diagonalRow = false;
    this.pagination = false;
    this.pagingSizes = [];
    this.currentPagingSize = 10;
  }

  ngOnInit(){
    this.store.dispatch(fetchData());
    this.initializeColumn();
  }

  ngOnChanges(changes: SimpleChanges) {
    /*this.data = changes.data.currentValue;*/
    this.data = changes.data.currentValue.map((item: any) => {
      return {name: item.name, capital: item.capital, nativeName: item.nativeName, population: item.population, subregion: item.subregion}
    });
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
