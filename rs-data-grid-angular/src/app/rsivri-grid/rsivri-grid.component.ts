import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IColumn } from '../../core/models/IColumn';
import { Store } from '@ngrx/store';
import { fetchData, setData } from './store/data-grid.actions';
import { selectData, selectPageNum, selectPageSize } from './store/data-grid.selectors';
import { combineLatest, Observable } from 'rxjs';
import { RsivriGridHeaderComponent } from './grid-header/rsivri-grid-header.component';
import { RsivriGridBodyComponent } from './grid-body/rsivri-grid-body.component';
import { RsivriGridPagerComponent } from './grid-pager/rsivri-grid-pager.component';

@Component({
  selector: 'rsivri-grid',
  standalone: true,
  imports: [CommonModule, RsivriGridHeaderComponent, RsivriGridBodyComponent, RsivriGridPagerComponent],
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements OnInit {
  data$: Observable<any[]> = this.store.select(selectData);

  @Input() headerColumnLines: boolean = true;
  @Input() fetchUrl: string = '';
  @Input() headerRowLines: boolean = true;
  @Input() bodyRowLines: boolean = true;
  @Input() bodyColumnLines: boolean = true;
  @Input() columns: IColumn[] = [];
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusTop: boolean = false;
  @Input() borderRadiusBottom: boolean = false;
  @Input() diagonalRow: boolean = false;
  @Input() pagination: boolean = false;
  @Input() pagingSizes: number[] = [];
  @Input() currentPagingSize: number = 10;
  @Input() dataSource: any[] = [];
  @Input() pageListSize: number = 5;
  @Input() entrySection: string | undefined = undefined;
  @Input() remoteMode: boolean = false;
  @Input() remoteModeParams?: any;

  pageNumber: Observable<any> = this.store.select(selectPageNum);
  pageSize: Observable<any> = this.store.select(selectPageSize);

  constructor(private store: Store) {}

  ngOnInit() {
    if (this.remoteMode) {
      const endpoint = new URL(this.remoteModeParams.endpoint);
      if (this.dataSource.length > 0) {
        this.store.dispatch(setData({ data: this.dataSource, remote: true }));
      } else {
        this.store.dispatch(fetchData({
          url: endpoint.href,
          section: this.remoteModeParams.aliases.data,
          remote: true,
          totalSection: 'size'
        }));
      }
      combineLatest([this.pageNumber, this.pageSize]).subscribe(val => {
        endpoint.searchParams.set('page', val[0]);
        endpoint.searchParams.set('size', val[1]);
        this.store.dispatch(fetchData({
          url: endpoint.href,
          section: this.remoteModeParams.aliases.data,
          remote: true,
          totalSection: 'size'
        }));
      });
    } else {
      if (this.dataSource.length > 0) {
        this.store.dispatch(setData({ data: this.dataSource, remote: false }));
      } else {
        if (this.fetchUrl !== '') {
          this.store.dispatch(fetchData({
            url: this.fetchUrl,
            section: this.entrySection,
            remote: false
          }));
        } else {
          this.store.dispatch(setData({ data: this.dataSource, remote: false }));
        }
      }
    }
    this.initializeColumnAsync();
  }

  initializeColumnAsync = () => {
    this.store.select(selectData).subscribe(data => {
      const result = Object.keys(Object.assign({}, ...data));
      if (this.columns.length === 0) {
        this.columns = result.map(item => ({ caption: item, dataField: item }));
      }
    });
  }
}
