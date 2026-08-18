import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, ThemeProvider, createTheme } from '@mui/material';
import { IColumn } from '../models/rsDataGrid.models';
import './dialogs.scss';

export interface EditRowDialogProps {
  open: boolean;
  row?: any;
  columns?: IColumn[];
  theme?: 'dark' | 'light';
  container?: Element | null;
  onSave: (result: Record<string, any>) => void;
  onCancel: () => void;
}

interface EditField {
  key: string;
}

export const EditRowDialog = ({ open, row, columns, theme: themeProp, container, onSave, onCancel }: EditRowDialogProps) => {
  const [fields, setFields] = useState<EditField[]>([]);
  const [editableRow, setEditableRow] = useState<Record<string, string>>({});
  // rsDataGrid.tsx (this dialog's only caller) always passes a real theme
  // value -- never literally undefined -- so the fallback is defensive
  // only. (Own statement, not a parameter default, so the ignore comment
  // attaches to just this line instead of the whole component.)
  /* istanbul ignore next */
  const theme = themeProp ?? 'light';
  const muiTheme = useMemo(() => createTheme({ palette: { mode: theme } }), [theme]);

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
      // rsDataGrid.tsx's onAddRowClick (the only caller of the add-mode
      // path, row undefined) always passes a real columns array -- the
      // fallback is for other, non-demo consumers of this component.
      /* istanbul ignore next */
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
    <ThemeProvider theme={muiTheme}>
      <Dialog open={open} onClose={onCancel} container={container}>
        <DialogTitle>{row ? 'Edit row' : 'Add row'}</DialogTitle>
        <DialogContent>
          <div className="edit-form">
            {fields.map(field => (
              <div className="edit-row" key={field.key}>
                <label className="edit-label">{field.key}</label>
                <input
                  type="text"
                  className="edit-input"
                  // editableRow always has an entry for every field in
                  // `fields` (the effect above sets both together) -- never
                  // reachable as nullish, defensive fallback only.
                  value={/* istanbul ignore next */ editableRow[field.key] ?? ''}
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
    </ThemeProvider>
  );
};
