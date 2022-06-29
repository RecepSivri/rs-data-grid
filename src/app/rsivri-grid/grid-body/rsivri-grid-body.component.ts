import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import {IColumn} from "../../../core/models/IColumn";

@Component({
  selector: 'rsivri-grid-body',
  templateUrl: './rsivri-grid-body.component.html',
  styleUrls: ['./rsivri-grid-body.component.css']
})
export class RsivriGridBodyComponent implements OnInit, OnChanges{

  @Input() columns: IColumn[];
  @Input() data: any[];
  @Input() bodyRowLines: boolean;
  @Input() bodyColumnLines: boolean;
  @Input() tableBorder: boolean;
  @Input() borderRadiusBottom: boolean;
  @Input() diagonalRow: boolean;
  @Input() currentPagingSize: number;

  constructor() {
    this.columns = [];
    this.data = [];
    this.bodyRowLines = true;
    this.bodyColumnLines = true;
    this.tableBorder = true;
    this.borderRadiusBottom = false;
    this.diagonalRow = false;
    this.currentPagingSize = 10;
  }

  ngOnInit(): void {
   
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log(this.data)
  }


}
