import { Component, Input, OnInit } from '@angular/core';
import { IColumn } from '../../core/models/IColumn';
import { Store } from '@ngrx/store';
import { fetchData, setData } from './store/data-grid.actions';
import { selectData, selectPageNum, selectPageSize} from './store/data-grid.selectors';
import { Observable, of } from 'rxjs';
@Component({
  selector: 'rsivri-grid',
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements OnInit {
  data$: Observable<any[]> = this.store.select(selectData);
  @Input() headerColumnLines: boolean;
  @Input() fetchUrl: string;
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
  @Input() dataSource: any[];
  @Input() pageListSize: number;
  pageNumber = this.store.select(selectPageNum)
  pageSize = this.store.select(selectPageSize)


  constructor(private store: Store) {
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
    this.fetchUrl = '';
    this.dataSource = [];
    this.pageListSize = 5;
  }

  ngOnInit(){
    
    if(this.dataSource.length > 0){
      this.store.dispatch(setData({data: this.dataSource }));
    }else {
      if(this.fetchUrl !== ''){
        this.store.dispatch(fetchData({url: this.fetchUrl }));
      }else {
        this.store.dispatch(setData({data: this.dataSource }));
      }
    }
    this.initializeColumnAsync();
  }


  initializeColumnAsync = () => {
    this.store.select(selectData).subscribe(data => {
      const result = Object.keys(Object.assign({}, ...data));
      if(this.columns.length === 0){
        this.columns = result.map((item) => {
          return {caption: item, dataField: item}
        });
      }
    })
  }
}
