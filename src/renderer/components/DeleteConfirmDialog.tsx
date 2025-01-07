import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (forceDelete: boolean) => void;
  count: number;
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  count,
}: Props) {
  const [forceDelete, setForceDelete] = useState(false);

  const handleConfirm = () => {
    onConfirm(forceDelete);
    setForceDelete(false);
  };

  const handleClose = () => {
    onClose();
    setForceDelete(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.default',
          px: 3,
          py: 2,
        }}
      >
        시크릿 삭제 확인
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <DialogContentText sx={{ mb: 2 }}>
          {count}개의 시크릿을 삭제하시겠습니까?
          <br />
          삭제된 시크릿은 복구할 수 없습니다.
        </DialogContentText>
        <FormControlLabel
          control={
            <Checkbox
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              보존 기간 없이 즉시 삭제
            </Typography>
          }
          sx={{
            '& .MuiFormControlLabel-label': {
              fontSize: '0.875rem',
            },
          }}
        />
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          px: 3,
          py: 2,
        }}
      >
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          취소
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          sx={{ textTransform: 'none' }}
        >
          삭제
        </Button>
      </DialogActions>
    </Dialog>
  );
}
