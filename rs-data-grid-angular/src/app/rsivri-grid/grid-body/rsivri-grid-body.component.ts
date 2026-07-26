import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { IColumn } from '../../../core/models/IColumn';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';

@Component({
  selector: 'rsivri-grid-body',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rsivri-grid-body.component.html',
  styleUrls: ['./rsivri-grid-body.component.css']
})
export class RsivriGridBodyComponent {
  private readonly dialog = inject(MatDialog);

  @Input() columns: IColumn[] = [];
  @Input() data: any[] = [];
  @Input() bodyRowLines: boolean = true;
  @Input() bodyColumnLines: boolean = true;
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusBottom: boolean = false;
  @Input() diagonalRow: boolean = false;
  @Input() currentPagingSize: number = 10;
  @Input() showActions: boolean = false;
  @Input() gridMode: 'popup' | 'batch' = 'popup';

  @Output() rowEdit = new EventEmitter<any>();
  @Output() rowDelete = new EventEmitter<any>();
  @Output() batchRowSave = new EventEmitter<{ original: any; updated: any }>();
  @Output() batchRowAdd = new EventEmitter<any>();

  editingRow: any = null;
  editDraft: Record<string, string> = {};

  isAddingRow: boolean = false;
  addDraft: Record<string, string> = {};

  onEditClick(row: any, event: Event): void {
    event.stopPropagation();
    if (this.gridMode === 'batch') {
      this.startEditingRow(row);
    } else {
      this.rowEdit.emit(row);
    }
  }

  private startEditingRow(row: any): void {
    this.editingRow = row;
    this.editDraft = {};
    for (const column of this.columns) {
      const value = row[column.dataField];
      this.editDraft[column.dataField] = value === null || value === undefined ? '' : String(value);
    }
  }

  onSaveEditClick(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm save', message: 'Are you sure you want to save the changes to this row?' }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const updated = { ...this.editingRow, ...this.editDraft };
        this.batchRowSave.emit({ original: this.editingRow, updated });
        this.editingRow = null;
      }
    });
  }

  onCancelEditClick(): void {
    this.editingRow = null;
  }

  startAddingRow(): void {
    this.isAddingRow = true;
    this.addDraft = {};
    for (const column of this.columns) {
      this.addDraft[column.dataField] = '';
    }
  }

  onSaveAddClick(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm add', message: 'Are you sure you want to add this row?' }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.batchRowAdd.emit({ ...this.addDraft });
        this.isAddingRow = false;
      }
    });
  }

  onCancelAddClick(): void {
    this.isAddingRow = false;
  }
}
