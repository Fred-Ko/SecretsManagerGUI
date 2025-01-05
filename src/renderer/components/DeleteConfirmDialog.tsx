import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
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
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>시크릿 삭제 확인</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {count}개의 시크릿을 삭제하시겠습니까?
          <br />
          삭제된 시크릿은 복구할 수 없습니다.
        </DialogContentText>
        <FormControlLabel
          control={
            <Checkbox
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
            />
          }
          label="보존 기간 없이 즉시 삭제"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          삭제
        </Button>
      </DialogActions>
    </Dialog>
  );
}
