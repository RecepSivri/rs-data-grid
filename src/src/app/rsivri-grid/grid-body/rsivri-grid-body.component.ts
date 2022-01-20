import {Component, Input, OnInit} from '@angular/core';
import {IColumn} from "../../../core/models/IColumn";

@Component({
  selector: 'rsivri-grid-body',
  templateUrl: './rsivri-grid-body.component.html',
  styleUrls: ['./rsivri-grid-body.component.css']
})
export class RsivriGridBodyComponent implements OnInit{

  @Input() columns: IColumn[];
  @Input() data: any[];

  constructor() {
    this.columns = [];
    this.data = [];
  }

  ngOnInit(): void {
  }


}
