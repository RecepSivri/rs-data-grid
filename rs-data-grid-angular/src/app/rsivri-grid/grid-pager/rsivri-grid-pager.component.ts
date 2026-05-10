import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import {
  changePageListSize, changePageNumber, changePageSize,
  decreasePageNum, increasePageNum, lastPageNum
} from '../store/data-grid.actions';
import {
  selectData, selectPageLimit, selectPageList,
  selectPageNum, selectPageSize
} from '../store/data-grid.selectors';

@Component({
  selector: 'rsivri-grid-pager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rsivri-grid-pager.component.html',
  styleUrls: ['./rsivri-grid-pager.component.css']
})
export class RsivriGridPagerComponent implements OnInit {
  @Input() pagination: boolean = false;
  @Input() pagingSizes: number[] = [];
  @Input() currentPagingSize: number = 10;
  @Input() pageListSize: number = 5;

  pageSize$ = this.store.select(selectPageSize);
  pageNumber$ = this.store.select(selectPageNum);
  pageData$ = this.store.select(selectData);
  pageList$ = this.store.select(selectPageList);
  pageLimit$ = this.store.select(selectPageLimit);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(changePageListSize({ pageListSize: this.pageListSize }));
    this.store.dispatch(changePageSize({ pageSize: this.currentPagingSize }));
  }

  changeCurrentPaginationSize = (val: number) => {
    this.store.dispatch(changePageNumber({ pageNumber: 0 }));
    this.store.dispatch(changePageSize({ pageSize: val }));
  }

  setpage = (index: number) => {
    this.store.dispatch(changePageNumber({ pageNumber: index }));
  }

  increasePager = () => this.store.dispatch(increasePageNum());
  decreasePager = () => this.store.dispatch(decreasePageNum());
  lastPage = () => this.store.dispatch(lastPageNum());

  writeAS = (pageFirstItem: any, pageListSize: any, pageLimit: any) => {
    return pageFirstItem + pageListSize > pageLimit ? false : true;
  }
}
