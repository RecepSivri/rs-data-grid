import { Component, Input, OnInit } from '@angular/core';
import { IColumn } from '../../core/models/IColumn';
import { Store } from '@ngrx/store';
import { fetchData, setData } from './store/data-grid.actions';
import { selectData, selectPageNum, selectPageSize} from './store/data-grid.selectors';
import { combineLatest, Observable } from 'rxjs';
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
  @Input() entrySection: string | undefined;
  @Input() remoteMode: boolean = false;
  @Input() remoteModeParams?: any;
  
  pageNumber: Observable<any> = this.store.select(selectPageNum)
  pageSize: Observable<any> = this.store.select(selectPageSize)


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
    this.entrySection = undefined;
  }

  ngOnInit(){
    
    if(this.remoteMode){
      const endpoint = new URL(this.remoteModeParams.endpoint);
      if(this.dataSource.length > 0){
        this.store.dispatch(setData({data: this.dataSource, remote:true }));
      }else{
        this.store.dispatch(fetchData({url: endpoint.href, section: this.remoteModeParams.aliases.data, remote: true, totalSection: 'size' }));
      }
      combineLatest(this.pageNumber, this.pageSize).subscribe(val => {
        endpoint.searchParams.set('page', val[0])
        endpoint.searchParams.set('size', val[1])
        this.store.dispatch(fetchData({url: endpoint.href, section: this.remoteModeParams.aliases.data, remote: true ,  totalSection: 'size'}));
      })
    }else{
      if(this.dataSource.length > 0){
        this.store.dispatch(setData({data: this.dataSource, remote: false }));
      }else {
        if(this.fetchUrl !== ''){
          this.store.dispatch(fetchData({url: this.fetchUrl, section: this.entrySection, remote: false }));
        }else {
          this.store.dispatch(setData({data: this.dataSource, remote: false }));
        }
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
