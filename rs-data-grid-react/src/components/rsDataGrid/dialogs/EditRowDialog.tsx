import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { IColumn } from '../models/rsDataGrid.models';
import './dialogs.scss';

export interface EditRowDialogProps {
  open: boolean;
  row?: any;
  columns?: IColumn[];
  onSave: (result: Record<string, any>) => void;
  onCancel: () => void;
}

interface EditField {
  key: string;
}

export const EditRowDialog = ({ open, row, columns, onSave, onCancel }: EditRowDialogProps) => {
  const [fields, setFields] = useState<EditField[]>([]);
  const [editableRow, setEditableRow] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    const nextFields: EditField[] = [];
    const nextEditable: Record<string, string> = {};
    if (row) {
      for (const [key, value] of Object.entries(row)) {
        nextFields.push({ key });
        nextEditable[key] = value === null || value === undefined ? '' : String(value);
      }
    } else {
      for (const column of columns ?? []) {
        nextFields.push({ key: column.dataField });
        nextEditable[column.dataField] = '';
      }
    }
    setFields(nextFields);
    setEditableRow(nextEditable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row, columns]);

  const handleSave = () => {
    const result: Record<string, any> = { ...row };
    for (const field of fields) {
      result[field.key] = editableRow[field.key];
    }
    onSave(result);
  };

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{row ? 'Edit row' : 'Add row'}</DialogTitle>
      <DialogContent>
        <div className="edit-form">
          {fields.map(field => (
            <div className="edit-row" key={field.key}>
              <label className="edit-label">{field.key}</label>
              <input
                type="text"
                className="edit-input"
                value={editableRow[field.key] ?? ''}
                onChange={e => setEditableRow({ ...editableRow, [field.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
