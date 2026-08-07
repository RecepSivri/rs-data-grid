import { useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, ThemeProvider, createTheme } from '@mui/material';
import './dialogs.scss';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  theme?: 'dark' | 'light';
  container?: Element | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({ open, title, message, theme = 'dark', container, onConfirm, onCancel }: ConfirmDialogProps) => {
  const muiTheme = useMemo(() => createTheme({ palette: { mode: theme } }), [theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <Dialog open={open} onClose={onCancel} container={container}>
        <DialogTitle>{title || 'Confirm'}</DialogTitle>
        <DialogContent>
          <p className="confirm-message">{message}</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>No</Button>
          <Button variant="contained" color="error" onClick={onConfirm}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};
