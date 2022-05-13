import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';


@Component({
  selector: 'rsivri-grid-pager',
  templateUrl: './rsivri-grid-pager.component.html',
  styleUrls: ['./rsivri-grid-pager.component.css']
})
export class RsivriGridPagerComponent implements OnInit, OnChanges{
  @Input() pagination: boolean;
  @Input() pagingSizes: number[];
  @Input() currentPagingSize: number;

  constructor() {
    this.pagination = false;
    this.pagingSizes = [];
    this.currentPagingSize = 10;
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  changeCurrentPaginationSize = (val: number) => {
    this.currentPagingSize = val;
  }


}
