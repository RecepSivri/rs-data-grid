import {Component, Input, OnInit} from '@angular/core';
import {IColumn} from "../../../core/models/IColumn";

@Component({
  selector: 'rsivri-grid-hedaer',
  templateUrl: './rsivri-grid-header.component.html',
  styleUrls: ['./rsivri-grid-header.component.css']
})
export class RsivriGridHeaderComponent implements OnInit{

  @Input() columns: IColumn[];
  @Input() headerRowLines: boolean;
  @Input() headerColumnLines: boolean;
  @Input() tableBorder: boolean;
  @Input() borderRadiusTop: boolean;

  constructor() {
    this.columns = [];
    this.headerRowLines = true;
    this.headerColumnLines = true;
    this.tableBorder = true;
    this.borderRadiusTop = true;
  }

  ngOnInit(): void {
  }


}
