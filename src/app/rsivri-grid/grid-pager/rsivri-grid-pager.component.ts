import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { concatMap } from 'rxjs';
import { changePageNumber, changePageSize } from '../store/data-grid.actions';
import { selectData, selectPageNum, selectPageSize } from '../store/data-grid.selectors';


@Component({
  selector: 'rsivri-grid-pager',
  templateUrl: './rsivri-grid-pager.component.html',
  styleUrls: ['./rsivri-grid-pager.component.css']
})
export class RsivriGridPagerComponent implements OnInit, OnChanges{
  @Input() pagination: boolean;
  @Input() pagingSizes: number[];
  @Input() currentPagingSize: number;
  pageSize$ = this.store.select(selectPageSize);
  pageNumber$ = this.store.select(selectPageNum);
  pageData$ = this.store.select(selectData);
  currPage: number[] = [];

  constructor(private store: Store) {
    this.pagination = false;
    this.pagingSizes = [];
    this.currentPagingSize = 10;
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  changeCurrentPaginationSize = (val: number) => {
    this.store.dispatch(changePageNumber({pageNumber: 0}))
    this.store.dispatch(changePageSize({pageSize: val}))
  }

  counter(size: number, pageNumber: number) {
    let arr = new Array();
    for (let i = 0; i < size; i++) {
      arr.push(i +1);
    }
    return arr.length > 4 ?  this.returnPageNumberConditionally(arr, pageNumber, size) : arr;
  }

  returnPageNumberConditionally = (arr: number[], pageNumber: number, size: number) => {

    if(this.currPage.length === 0 || this.currPage[this.currPage.length -1] === pageNumber +1){
      this.currPage = arr.slice(pageNumber, pageNumber +5 );
    }
    return [...this.currPage];
  }

  setpage = (index: number) => {
    this.store.dispatch(changePageNumber({pageNumber: index}))
  }


}
