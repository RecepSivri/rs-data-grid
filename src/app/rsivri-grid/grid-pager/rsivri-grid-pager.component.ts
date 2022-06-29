import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { concatMap } from 'rxjs';
import { changePageNumber, changePageSize } from '../store/data-grid.actions';
import { selectData, selectPageSize } from '../store/data-grid.selectors';


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
  pageData$ = this.store.select(selectData);

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
    this.store.dispatch(changePageSize({pageSize: val}))
    console.log(val)
  }

  counter(i: number) {
    return new Array(Math.ceil(i));
  }

  setpage = (index: number) => {
    this.store.dispatch(changePageNumber({pageNumber: index}))
  }


}
