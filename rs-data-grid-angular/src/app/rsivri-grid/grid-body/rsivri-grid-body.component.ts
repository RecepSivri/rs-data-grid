import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IColumn } from '../../../core/models/IColumn';

@Component({
  selector: 'rsivri-grid-body',
  standalone: true,
  imports: [CommonModule],
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
}
