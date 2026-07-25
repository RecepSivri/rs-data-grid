import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { DataGridStore } from '../store/data-grid.store';

@Component({
  selector: 'rsivri-grid-pager',
  standalone: true,
  imports: [],
  templateUrl: './rsivri-grid-pager.component.html',
  styleUrls: ['./rsivri-grid-pager.component.css']
})
export class RsivriGridPagerComponent implements OnInit, OnChanges {
  @Input() pagination: boolean = false;
  @Input() pagingSizes: number[] = [];
  @Input() currentPagingSize: number = 10;
  @Input() pageListSize: number = 5;

  private readonly store = inject(DataGridStore);

  pageSize = this.store.pageSize;
  pageNumber = this.store.pageNumber;
  pageList = this.store.pageList;
  pageLimit = this.store.pageLimit;

  ngOnInit(): void {
    this.store.changePageListSize(this.pageListSize);
    this.store.changePageSize(this.currentPagingSize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageListSize'] && !changes['pageListSize'].firstChange) {
      this.store.changePageListSize(this.pageListSize);
    }
    if (changes['currentPagingSize'] && !changes['currentPagingSize'].firstChange) {
      this.store.changePageNumber(0);
      this.store.changePageSize(this.currentPagingSize);
    }
  }

  changeCurrentPaginationSize = (val: number) => {
    this.store.changePageNumber(0);
    this.store.changePageSize(val);
  }

  setpage = (index: number) => {
    this.store.changePageNumber(index);
  }

  increasePager = () => this.store.increasePageNum();
  decreasePager = () => this.store.decreasePageNum();
  lastPage = () => this.store.lastPageNum();

  writeAS = (pageFirstItem: any, pageListSize: any, pageLimit: any) => {
    return pageFirstItem + pageListSize > pageLimit ? false : true;
  }
}
