import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Box,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useState, useCallback } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (updates: Array<{ secret: Secret; key: string; newValue: string }>) => Promise<void>;
  selectedSecrets: Secret[];
}

interface KeyValuePair {
  key: string;
  value: string;
}

interface PreviewResult {
  secret: Secret;
  existingKeys: { [key: string]: string };
  newKeys: { [key: string]: string };
  duplicateKeys: string[];
}

type InputMode = 'form' | 'json' | 'env';
type DialogStep = 'input' | 'preview';

const parseEnvFormat = (input: string): KeyValuePair[] => {
  const pairs: KeyValuePair[] = [];
  const lines = input.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      pairs.push({
        key: key.trim(),
        value: value.trim(),
      });
    }
  }

  return pairs;
};

export default function BatchAddDialog({ open, onClose, onAdd, selectedSecrets }: Props) {
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('form');
  const [rawInput, setRawInput] = useState('');
  const [dialogStep, setDialogStep] = useState<DialogStep>('input');
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);

  const handleInputModeChange = (_: React.SyntheticEvent, newMode: InputMode) => {
    if (newMode === inputMode) return;

    // 현재 입력값을 새로운 모드에 맞게 변환
    if (newMode === 'json') {
      const obj = Object.fromEntries(keyValuePairs.map(kv => [kv.key, kv.value]));
      setRawInput(JSON.stringify(obj, null, 2));
    } else if (newMode === 'env') {
      setRawInput(keyValuePairs.map(kv => `${kv.key}=${kv.value}`).join('\n'));
    } else {
      // form 모드로 전환
      try {
        let pairs: KeyValuePair[] = [];
        if (inputMode === 'json') {
          const obj = JSON.parse(rawInput || '{}');
          pairs = Object.entries(obj).map(([key, value]) => ({
            key,
            value: String(value),
          }));
        } else if (inputMode === 'env') {
          pairs = parseEnvFormat(rawInput);
        }
        if (pairs.length > 0) {
          setKeyValuePairs(pairs);
        }
      } catch (err) {
        console.error('Failed to parse input:', err);
      }
    }
    setInputMode(newMode);
    setError(null);
  };

  const handleAddKeyValue = useCallback(() => {
    setKeyValuePairs((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const handleRemoveKeyValue = useCallback((index: number) => {
    setKeyValuePairs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyValueChange = useCallback((index: number, field: keyof KeyValuePair, value: string) => {
    setKeyValuePairs((prev) =>
      prev.map((kv, i) => (i === index ? { ...kv, [field]: value } : kv)),
    );
  }, []);

  const validateAndParseInput = (): KeyValuePair[] | null => {
    if (inputMode === 'json') {
      try {
        const obj = JSON.parse(rawInput || '{}');
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          setError('올바른 JSON 객체 형식이 아닙니다.');
          return null;
        }
        return Object.entries(obj).map(([key, value]) => ({
          key,
          value: String(value),
        }));
      } catch {
        setError('올바른 JSON 형식이 아닙니다.');
        return null;
      }
    } else if (inputMode === 'env') {
      const pairs = parseEnvFormat(rawInput);
      if (pairs.length === 0 && rawInput.trim()) {
        setError('올바른 .env 형식이 아닙니다.');
        return null;
      }
      return pairs;
    }
    return keyValuePairs;
  };

  const handlePreview = async () => {
    setError(null);

    const pairs = validateAndParseInput();
    if (!pairs) return;

    // 빈 키/값 체크
    const hasEmptyFields = pairs.some(kv => !kv.key.trim() || !kv.value.trim());
    if (hasEmptyFields) {
      setError('모든 키와 값을 입력해주세요.');
      return;
    }

    // 입력한 키들 중 중복 체크
    const duplicateKey = pairs.some(
      (kv, index) => pairs.findIndex((item) => item.key === kv.key) !== index,
    );
    if (duplicateKey) {
      setError('입력한 키들 중 중복된 키가 있습니다.');
      return;
    }

    // 각 시크릿별 프리뷰 결과 생성
    const results: PreviewResult[] = [];
    for (const secret of selectedSecrets) {
      try {
        const existingData = JSON.parse(secret.SecretString || '{}');
        const duplicateKeys = pairs.filter(kv => existingData.hasOwnProperty(kv.key)).map(kv => kv.key);
        const newKeyValues = Object.fromEntries(pairs.map(kv => [kv.key, kv.value]));

        results.push({
          secret,
          existingKeys: existingData,
          newKeys: newKeyValues,
          duplicateKeys,
        });
      } catch (err) {
        console.error('Failed to parse secret value:', err);
        setError('시크릿 값을 파싱하는 중 오류가 발생했습니다.');
        return;
      }
    }

    setPreviewResults(results);
    setDialogStep('preview');
  };

  const handleAdd = async () => {
    try {
      const updates = selectedSecrets.flatMap(secret => {
        const preview = previewResults.find(p => p.secret.ARN === secret.ARN);
        if (!preview || preview.duplicateKeys.length > 0) return [];
        return Object.entries(preview.newKeys).map(([key, value]) => ({
          secret,
          key,
          newValue: value,
        }));
      });

      if (updates.length === 0) {
        setError('추가할 수 있는 키가 없습니다.');
        return;
      }

      await onAdd(updates);
      onClose();
    } catch (err) {
      setError('일괄 추가 중 오류가 발생했습니다.');
    }
  };

  const renderForm = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {keyValuePairs.map((kv, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 2, position: 'relative' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="키"
              value={kv.key}
              onChange={(e) => handleKeyValueChange(index, 'key', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="값"
              value={kv.value}
              onChange={(e) => handleKeyValueChange(index, 'value', e.target.value)}
              size="small"
              fullWidth
            />
          </Box>
          {keyValuePairs.length > 1 && (
            <IconButton
              size="small"
              onClick={() => handleRemoveKeyValue(index)}
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
        onClick={handleAddKeyValue}
        sx={{ alignSelf: 'flex-start' }}
      >
        키-값 추가
      </Button>
    </Box>
  );

  const renderRawInput = () => (
    <TextField
      multiline
      rows={10}
      value={rawInput}
      onChange={(e) => setRawInput(e.target.value)}
      placeholder={
        inputMode === 'json'
          ? '{\n  "key": "value"\n}'
          : '# .env format\nKEY=value'
      }
      sx={{ fontFamily: 'monospace' }}
      fullWidth
    />
  );

  const renderPreview = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {previewResults.map((result) => (
        <Paper key={result.secret.ARN} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {result.secret.Name}
          </Typography>

          {result.duplicateKeys.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              중복된 키: {result.duplicateKeys.join(', ')}
            </Alert>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>키</TableCell>
                  <TableCell>현재 값</TableCell>
                  <TableCell>새 값</TableCell>
                  <TableCell>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(result.newKeys).map(([key, newValue]) => (
                  <TableRow key={key}>
                    <TableCell>{key}</TableCell>
                    <TableCell>{result.existingKeys[key] || '-'}</TableCell>
                    <TableCell>{newValue}</TableCell>
                    <TableCell>
                      {result.duplicateKeys.includes(key) ? (
                        <Typography color="error">중복</Typography>
                      ) : (
                        <Typography color="success.main">추가</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>일괄 추가 {dialogStep === 'preview' ? '- 프리뷰' : ''}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            선택된 시크릿 ({selectedSecrets.length}개)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {selectedSecrets.map((secret) => (
              <Typography key={secret.ARN} variant="body2">
                {secret.Name}
              </Typography>
            ))}
          </Box>

          {dialogStep === 'input' ? (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={inputMode}
                  onChange={handleInputModeChange}
                  aria-label="시크릿 입력 모드"
                >
                  <Tab label="폼" value="form" />
                  <Tab label="JSON" value="json" />
                  <Tab label=".env" value="env" />
                </Tabs>
              </Box>

              {inputMode === 'form' ? renderForm() : renderRawInput()}
            </>
          ) : (
            renderPreview()
          )}

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {dialogStep === 'preview' ? (
          <>
            <Button onClick={() => setDialogStep('input')}>이전</Button>
            <Button onClick={onClose}>취소</Button>
            <Button
              onClick={handleAdd}
              variant="contained"
              disabled={previewResults.some(r => r.duplicateKeys.length > 0)}
            >
              추가
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>취소</Button>
            <Button onClick={handlePreview} variant="contained">
              프리뷰
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}