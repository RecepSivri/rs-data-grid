import { Component, Input, OnInit, effect, inject } from '@angular/core';
import { IColumn } from '../../core/models/IColumn';
import { DataGridStore } from './store/data-grid.store';
import { FilterChangeEvent, RsivriGridHeaderComponent } from './grid-header/rsivri-grid-header.component';
import { RsivriGridBodyComponent } from './grid-body/rsivri-grid-body.component';
import { RsivriGridPagerComponent } from './grid-pager/rsivri-grid-pager.component';

@Component({
  selector: 'rsivri-grid',
  standalone: true,
  imports: [RsivriGridHeaderComponent, RsivriGridBodyComponent, RsivriGridPagerComponent],
  providers: [DataGridStore],
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements OnInit {
  readonly store = inject(DataGridStore);

  data = this.store.data;
  allData = this.store.rawData;
  sort = this.store.sort;
  pageNumber = this.store.pageNumber;
  pageSize = this.store.pageSize;

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
  @Input() showFilter: boolean = false;
  @Input() showSort: boolean = false;
  @Input() pagingSizes: number[] = [];
  @Input() currentPagingSize: number = 10;
  @Input() dataSource: any[] = [];
  @Input() pageListSize: number = 5;
  @Input() entrySection: string | undefined = undefined;
  @Input() remoteMode: boolean = false;
  @Input() remoteModeParams?: any;

  constructor() {
    effect(() => {
      const data = this.store.data();
      if (this.columns.length === 0) {
        const result = Object.keys(Object.assign({}, ...data));
        this.columns = result.map(item => ({ caption: item, dataField: item }));
      }
    });
  }

  onFilterChange(event: FilterChangeEvent): void {
    this.store.setFilter(event.dataField, event.values);
  }

  onSortToggle(dataField: string): void {
    this.store.toggleSort(dataField);
  }

  ngOnInit() {
    if (this.remoteMode) {
      const endpoint = new URL(this.remoteModeParams.endpoint);
      if (this.dataSource.length > 0) {
        this.store.setData(this.dataSource, true);
      } else {
        this.store.fetchData(endpoint.href, this.remoteModeParams.aliases.data, true, 'size');
      }
    } else {
      if (this.dataSource.length > 0) {
        this.store.setData(this.dataSource, false);
      } else {
        if (this.fetchUrl !== '') {
          this.store.fetchData(this.fetchUrl, this.entrySection, false);
        } else {
          this.store.setData(this.dataSource, false);
        }
      }
    }
  }
}
