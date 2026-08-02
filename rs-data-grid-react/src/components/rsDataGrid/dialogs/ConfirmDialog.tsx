import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import './dialogs.scss';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={onCancel}>
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
  );
};
