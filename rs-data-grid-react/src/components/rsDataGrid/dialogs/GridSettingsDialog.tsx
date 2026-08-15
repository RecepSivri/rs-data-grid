import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { IColumn } from '../models/rsDataGrid.models';
import './dialogs.scss';

export interface GridSettingsDialogProps {
  open: boolean;
  columns: IColumn[];
  selected: string[];
  theme?: 'dark' | 'light';
  container?: Element | null;
  onChange: (next: string[]) => void;
  onClose: () => void;
}

export const GridSettingsDialog = ({ open, columns, selected, theme = 'light', container, onChange, onClose }: GridSettingsDialogProps) => {
  const muiTheme = useMemo(() => createTheme({ palette: { mode: theme } }), [theme]);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  const byField = useMemo(() => new Map(columns.map(column => [column.dataField, column])), [columns]);
  const captionFor = (field: string): string => byField.get(field)?.caption ?? field;

  const handleSelectChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    // MUI's own SelectChangeEvent types `value` as `T | string` because a
    // *native* multi-select yields a comma-joined string, but this Select
    // isn't `native` -- MUI's JS-based multi-select always hands back the
    // real array, so the string branch here is unreachable in practice.
    /* istanbul ignore next */
    onChange(typeof value === 'string' ? value.split(',') : value);
  };

  const moveSelected = (fromField: string, toField: string) => {
    if (fromField === toField) {
      return;
    }
    const fromIndex = selected.indexOf(fromField);
    const toIndexOriginal = selected.indexOf(toField);
    // draggedField/toField always come from a rendered chip, which is always
    // itself a member of `selected` -- so both lookups always succeed. Kept
    // as a defensive guard only.
    /* istanbul ignore if */
    if (fromIndex === -1 || toIndexOriginal === -1) {
      return;
    }
    const next = selected.slice();
    next.splice(fromIndex, 1);
    let insertAt = next.indexOf(toField);
    if (fromIndex < toIndexOriginal) {
      insertAt += 1;
    }
    next.splice(insertAt, 0, fromField);
    onChange(next);
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Dialog open={open} onClose={onClose} container={container} maxWidth="sm" fullWidth>
        <DialogTitle>Grid Settings</DialogTitle>
        <DialogContent>
          <div className="grid-settings-section">
            <Typography variant="caption" className="grid-settings-hint">
              Pick which columns to show. Nothing selected shows every column.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="grid-settings-columns-label">Columns</InputLabel>
              <Select
                labelId="grid-settings-columns-label"
                multiple
                value={selected}
                onChange={handleSelectChange}
                input={<OutlinedInput label="Columns" />}
                renderValue={values => (
                  <div className="grid-settings-chip-row">
                    {values.map(field => (
                      <Chip key={field} label={captionFor(field)} size="small" />
                    ))}
                  </div>
                )}
              >
                {columns.map(column => (
                  <MenuItem key={column.dataField} value={column.dataField}>
                    <Checkbox checked={selected.includes(column.dataField)} size="small" />
                    <ListItemText primary={column.caption} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          {selected.length > 0 && (
            <div className="grid-settings-section">
              <Typography variant="subtitle2" className="grid-settings-heading">
                Visible order
              </Typography>
              <Typography variant="caption" className="grid-settings-hint">
                Drag to reorder.
              </Typography>
              <div className="grid-settings-chip-row">
                {selected.map(field => (
                  <Chip
                    key={field}
                    label={captionFor(field)}
                    color="primary"
                    onDelete={() => onChange(selected.filter(f => f !== field))}
                    className={'grid-settings-drag-chip' + (dragOverField === field ? ' grid-settings-drag-chip-over' : '')}
                    draggable
                    onDragStart={() => setDraggedField(field)}
                    onDragEnd={() => {
                      setDraggedField(null);
                      setDragOverField(null);
                    }}
                    onDragOver={event => {
                      event.preventDefault();
                      setDragOverField(field);
                    }}
                    onDragLeave={() => setDragOverField(current => (current === field ? null : current))}
                    onDrop={event => {
                      event.preventDefault();
                      if (draggedField) {
                        moveSelected(draggedField, field);
                      }
                      setDragOverField(null);
                      setDraggedField(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {selected.length > 0 && (
            <Button onClick={() => onChange([])} color="inherit">
              Clear
            </Button>
          )}
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};
