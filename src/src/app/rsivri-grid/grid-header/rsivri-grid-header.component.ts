import {Component, Input, OnInit} from '@angular/core';
import {IColumn} from "../../../core/models/IColumn";

@Component({
  selector: 'rsivri-grid-hedaer',
  templateUrl: './rsivri-grid-header.component.html',
  styleUrls: ['./rsivri-grid-header.component.css']
})
export class RsivriGridHeaderComponent implements OnInit{

  @Input() columns: IColumn[];

  constructor() {
    this.columns = [];
  }

  ngOnInit(): void {
  }


}
