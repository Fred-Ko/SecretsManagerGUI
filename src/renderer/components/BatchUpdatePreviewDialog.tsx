import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewResults: Array<{
    secretName: string;
    key: string;
    oldValue: string;
    newValue: string;
  }>;
}

export default function BatchUpdatePreviewDialog({
  open,
  onClose,
  onConfirm,
  previewResults,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">업데이트 프리뷰</Typography>
        <Typography variant="body2" color="text.secondary">
          총 {previewResults.length}개의 값이 업데이트됩니다.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>시크릿 이름</TableCell>
                <TableCell>키</TableCell>
                <TableCell>기존 값</TableCell>
                <TableCell>새 값</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewResults.map((result, index) => (
                <TableRow key={`${result.secretName}-${result.key}-${index}`}>
                  <TableCell>{result.secretName}</TableCell>
                  <TableCell>{result.key}</TableCell>
                  <TableCell>{result.oldValue}</TableCell>
                  <TableCell>{result.newValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          업데이트
        </Button>
      </DialogActions>
    </Dialog>
  );
}
