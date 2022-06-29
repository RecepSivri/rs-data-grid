import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { concatMap } from 'rxjs';
import { changePageSize } from '../store/data-grid.actions';


@Component({
  selector: 'rsivri-grid-pager',
  templateUrl: './rsivri-grid-pager.component.html',
  styleUrls: ['./rsivri-grid-pager.component.css']
})
export class RsivriGridPagerComponent implements OnInit, OnChanges{
  @Input() pagination: boolean;
  @Input() pagingSizes: number[];
  @Input() currentPagingSize: number;

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


}
