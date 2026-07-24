import { Component, Input } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { IColumn } from '../../../core/models/IColumn';

@Component({
  selector: 'rsivri-grid-hedaer',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './rsivri-grid-header.component.html',
  styleUrls: ['./rsivri-grid-header.component.css']
})
export class RsivriGridHeaderComponent {
  @Input() columns: IColumn[] = [];
  @Input() headerRowLines: boolean = true;
  @Input() headerColumnLines: boolean = true;
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusTop: boolean = true;
}
