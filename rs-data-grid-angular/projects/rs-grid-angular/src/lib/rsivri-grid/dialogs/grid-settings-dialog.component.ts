import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { IColumn } from '../../models/IColumn';

export interface GridSettingsDialogData {
  columns: IColumn[];
  selected: string[];
}

@Component({
  selector: 'rsivri-grid-settings-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatSelectModule, MatChipsModule],
  templateUrl: './grid-settings-dialog.component.html',
  styleUrls: ['./grid-settings-dialog.component.css']
})
export class GridSettingsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<GridSettingsDialogComponent>);
  readonly data = inject<GridSettingsDialogData>(MAT_DIALOG_DATA);

  @Output() selectedChange = new EventEmitter<string[]>();

  selected: string[] = [...this.data.selected];
  draggedField: string | null = null;
  dragOverField: string | null = null;

  captionFor(field: string): string {
    return this.data.columns.find(column => column.dataField === field)?.caption ?? field;
  }

  onSelectChange(value: string[]): void {
    this.selected = value;
    this.selectedChange.emit(this.selected);
  }

  removeColumn(field: string): void {
    this.selected = this.selected.filter(f => f !== field);
    this.selectedChange.emit(this.selected);
  }

  clearAll(): void {
    this.selected = [];
    this.selectedChange.emit(this.selected);
  }

  onDragStart(field: string, event: DragEvent): void {
    this.draggedField = field;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.draggedField = null;
    this.dragOverField = null;
  }

  onDragOver(field: string, event: DragEvent): void {
    event.preventDefault();
    this.dragOverField = field;
  }

  onDragLeave(field: string): void {
    if (this.dragOverField === field) {
      this.dragOverField = null;
    }
  }

  onDrop(field: string, event: DragEvent): void {
    event.preventDefault();
    if (this.draggedField) {
      this.moveSelected(this.draggedField, field);
    }
    this.dragOverField = null;
    this.draggedField = null;
  }

  private moveSelected(fromField: string, toField: string): void {
    if (fromField === toField) {
      return;
    }
    const fromIndex = this.selected.indexOf(fromField);
    const toIndexOriginal = this.selected.indexOf(toField);
    if (fromIndex === -1 || toIndexOriginal === -1) {
      return;
    }
    const next = this.selected.slice();
    next.splice(fromIndex, 1);
    let insertAt = next.indexOf(toField);
    if (fromIndex < toIndexOriginal) {
      insertAt += 1;
    }
    next.splice(insertAt, 0, fromField);
    this.selected = next;
    this.selectedChange.emit(this.selected);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
