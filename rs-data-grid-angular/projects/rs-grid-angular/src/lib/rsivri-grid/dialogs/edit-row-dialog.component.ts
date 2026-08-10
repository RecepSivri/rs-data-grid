import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { IColumn } from '../../models/IColumn';

export interface EditRowDialogData {
  row?: any;
  columns?: IColumn[];
}

interface EditField {
  key: string;
}

@Component({
  selector: 'rsivri-edit-row-dialog',
  standalone: true,
  imports: [MatDialogModule, FormsModule, MatButtonModule],
  templateUrl: './edit-row-dialog.component.html',
  styleUrls: ['./edit-row-dialog.component.css']
})
export class EditRowDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EditRowDialogComponent, any>);
  readonly data = inject<EditRowDialogData>(MAT_DIALOG_DATA);

  editableRow: Record<string, string> = {};
  fields: EditField[] = [];

  constructor() {
    if (this.data.row) {
      for (const [key, value] of Object.entries(this.data.row)) {
        this.fields.push({ key });
        this.editableRow[key] = value === null || value === undefined ? '' : String(value);
      }
    } else {
      for (const column of this.data.columns ?? []) {
        this.fields.push({ key: column.dataField });
        this.editableRow[column.dataField] = '';
      }
    }
  }

  onSave(): void {
    const result: Record<string, any> = { ...this.data.row };
    for (const field of this.fields) {
      result[field.key] = this.editableRow[field.key];
    }
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}
