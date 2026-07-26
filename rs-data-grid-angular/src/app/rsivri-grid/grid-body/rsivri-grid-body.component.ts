import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IColumn } from '../../../core/models/IColumn';

@Component({
  selector: 'rsivri-grid-body',
  standalone: true,
  imports: [],
  templateUrl: './rsivri-grid-body.component.html',
  styleUrls: ['./rsivri-grid-body.component.css']
})
export class RsivriGridBodyComponent {
  @Input() columns: IColumn[] = [];
  @Input() data: any[] = [];
  @Input() bodyRowLines: boolean = true;
  @Input() bodyColumnLines: boolean = true;
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusBottom: boolean = false;
  @Input() diagonalRow: boolean = false;
  @Input() currentPagingSize: number = 10;
  @Input() showActions: boolean = false;

  @Output() rowEdit = new EventEmitter<any>();
  @Output() rowDelete = new EventEmitter<any>();
}
