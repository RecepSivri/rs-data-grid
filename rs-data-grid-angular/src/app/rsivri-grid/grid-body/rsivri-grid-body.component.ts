import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { IColumn } from '../../../core/models/IColumn';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';

@Component({
  selector: 'rsivri-grid-body',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rsivri-grid-body.component.html',
  styleUrls: ['./rsivri-grid-body.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RsivriGridBodyComponent implements OnChanges {
  private readonly dialog = inject(MatDialog);

  @Input() theme: 'dark' | 'light' = 'light';
  @Input() columns: IColumn[] = [];
  @Input() data: any[] = [];
  @Input() bodyRowLines: boolean = true;
  @Input() bodyColumnLines: boolean = true;
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusBottom: boolean = false;
  @Input() diagonalRow: boolean = false;
  @Input() currentPagingSize: number = 10;
  @Input() showActions: boolean = false;
  @Input() showIndex: boolean = false;
  @Input() dragDropRows: boolean = false;
  @Input() indexOffset: number = 0;
  @Input() gridMode: 'popup' | 'row' | 'batch' = 'popup';

  @Output() rowEdit = new EventEmitter<any>();
  @Output() rowDelete = new EventEmitter<any>();
  @Output() rowMove = new EventEmitter<{ fromRow: any; toRow: any }>();
  @Output() batchRowSave = new EventEmitter<{ original: any; updated: any }>();
  @Output() batchRowAdd = new EventEmitter<any>();
  @Output() batchCommit = new EventEmitter<{ added: any[]; updated: { original: any; updated: any }[] }>();

  draggedRow: any = null;
  dragOverRow: any = null;

  onRowDragStart(row: any, event: DragEvent): void {
    this.draggedRow = row;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onRowDragEnd(): void {
    this.draggedRow = null;
    this.dragOverRow = null;
  }

  onRowDragOver(row: any, event: DragEvent): void {
    event.preventDefault();
    this.dragOverRow = row;
  }

  onRowDragLeave(row: any): void {
    if (this.dragOverRow === row) {
      this.dragOverRow = null;
    }
  }

  onRowDrop(row: any, event: DragEvent): void {
    event.preventDefault();
    if (this.draggedRow) {
      this.rowMove.emit({ fromRow: this.draggedRow, toRow: row });
    }
    this.dragOverRow = null;
    this.draggedRow = null;
  }

  editingRow: any = null;
  editDraft: Record<string, string> = {};

  isAddingRow: boolean = false;
  addDraft: Record<string, string> = {};

  batchDrafts: Record<string, string>[] = [];
  batchNewDrafts: Record<string, string>[] = [];
  private batchDraftRowRefs: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (this.gridMode === 'batch' && (changes['data'] || changes['columns'] || changes['gridMode'])) {
      this.syncBatchDrafts();
    }
  }

  private syncBatchDrafts(): void {
    const draftByRow = new Map<any, Record<string, string>>();
    this.batchDraftRowRefs.forEach((row, i) => {
      if (this.batchDrafts[i]) {
        draftByRow.set(row, this.batchDrafts[i]);
      }
    });
    this.batchDrafts = this.data.map(row => draftByRow.get(row) ?? this.toDraft(row));
    this.batchDraftRowRefs = this.data;
  }

  private toDraft(row: any): Record<string, string> {
    const draft: Record<string, string> = {};
    for (const column of this.columns) {
      const value = row[column.dataField];
      draft[column.dataField] = value === null || value === undefined ? '' : String(value);
    }
    return draft;
  }

  addBatchRow(): void {
    this.batchNewDrafts = [...this.batchNewDrafts, this.toDraft({})];
  }

  removeBatchNewRow(index: number): void {
    this.batchNewDrafts = this.batchNewDrafts.filter((_, i) => i !== index);
  }

  saveBatch(): void {
    const updated: { original: any; updated: any }[] = [];
    this.data.forEach((row, i) => {
      const draft = this.batchDrafts[i];
      if (!draft) {
        return;
      }
      const isDirty = this.columns.some(column => String(row[column.dataField] ?? '') !== draft[column.dataField]);
      if (isDirty) {
        updated.push({ original: row, updated: { ...row, ...draft } });
      }
    });
    const added = this.batchNewDrafts.map(draft => ({ ...draft }));
    this.batchNewDrafts = [];
    this.batchCommit.emit({ added, updated });
  }

  onEditClick(row: any, event: Event): void {
    event.stopPropagation();
    if (this.gridMode === 'row') {
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

  private get dialogPanelClass(): string {
    return this.theme === 'light' ? 'rg-dialog-light' : 'rg-dialog-dark';
  }

  onSaveEditClick(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm save', message: 'Are you sure you want to save the changes to this row?' },
      panelClass: this.dialogPanelClass
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
      data: { title: 'Confirm add', message: 'Are you sure you want to add this row?' },
      panelClass: this.dialogPanelClass
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
