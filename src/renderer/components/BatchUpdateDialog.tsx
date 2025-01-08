import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';
import BatchUpdatePreviewDialog from './BatchUpdatePreviewDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdate: (
    updates: Array<{ secret: Secret; key: string; newValue: string }>,
  ) => Promise<void>;
  selectedSecrets: Array<{
    secret: Secret;
    key: string;
    value: string;
  }>;
}

interface UpdatePair {
  oldValue: string;
  newValue: string;
}

interface PreviewResult {
  secretName: string;
  key: string;
  oldValue: string;
  newValue: string;
}

export default function BatchUpdateDialog({
  open,
  onClose,
  onUpdate,
  selectedSecrets,
}: Props) {
  const [updatePairs, setUpdatePairs] = useState<UpdatePair[]>([
    { oldValue: '', newValue: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);

  const handleAddPair = () => {
    setUpdatePairs([...updatePairs, { oldValue: '', newValue: '' }]);
  };

  const handleRemovePair = (index: number) => {
    setUpdatePairs(updatePairs.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof UpdatePair,
    value: string,
  ) => {
    const newPairs = [...updatePairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    setUpdatePairs(newPairs);
  };

  const handlePreview = () => {
    setError(null);

    // 유효성 검사
    const emptyPairs = updatePairs.some(
      (pair) => !pair.oldValue.trim() || !pair.newValue.trim(),
    );
    if (emptyPairs) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    const results: PreviewResult[] = [];

    // 각 선택된 시크릿-키 쌍에 대해 업데이트할 내용 생성
    for (const { secret, key, value } of selectedSecrets) {
      // 각 업데이트 쌍에 대해 처리
      for (const pair of updatePairs) {
        if (value === pair.oldValue) {
          results.push({
            secretName: secret.Name || '',
            key,
            oldValue: pair.oldValue,
            newValue: pair.newValue,
          });
        }
      }
    }

    if (results.length === 0) {
      setError('업데이트할 값을 찾을 수 없습니다.');
      return;
    }

    setPreviewResults(results);
    setIsPreviewOpen(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      await onUpdate(
        previewResults.map(({ secretName, key, newValue }) => ({
          secret: selectedSecrets.find((s) => s.secret.Name === secretName)!.secret,
          key,
          newValue,
        })),
      );
      setIsPreviewOpen(false);
      onClose();
    } catch (err) {
      setError('업데이트 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">일괄 업데이트</Typography>
          <Typography variant="body2" color="text.secondary">
            선택된 {selectedSecrets.length}개의 시크릿에서 값을 일괄 변경합니다.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {updatePairs.map((pair, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2, position: 'relative' }}
              >
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="기존 값"
                    value={pair.oldValue}
                    onChange={(e) =>
                      handleChange(index, 'oldValue', e.target.value)
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="새 값"
                    value={pair.newValue}
                    onChange={(e) =>
                      handleChange(index, 'newValue', e.target.value)
                    }
                    size="small"
                    fullWidth
                  />
                </Box>
                {updatePairs.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemovePair(index)}
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Paper>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddPair}
              sx={{ alignSelf: 'flex-start' }}
            >
              업데이트 규칙 추가
            </Button>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>취소</Button>
          <Button
            onClick={handlePreview}
            variant="contained"
            disabled={updatePairs.length === 0}
          >
            프리뷰
          </Button>
        </DialogActions>
      </Dialog>

      <BatchUpdatePreviewDialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmUpdate}
        previewResults={previewResults}
      />
    </>
  );
}
