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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useRef, useCallback } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';

interface Props {
  secret: Secret;
  onSave: (secret: Secret) => Promise<void>;
  onClose: () => void;
}

interface KeyValuePair {
  key: string;
  value: string;
}

type InputMode = 'form' | 'json' | 'env';

export default function SecretEdit({ secret, onSave, onClose }: Props) {
  const [description, setDescription] = useState(secret.Description || '');
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>(() => {
    try {
      if (!secret.SecretString) return [];
      const parsed = JSON.parse(secret.SecretString);
      return Object.entries(parsed).map(([k, v]) => ({
        key: k,
        value: String(v),
      }));
    } catch {
      return [];
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('form');
  const [rawInput, setRawInput] = useState(() => {
    try {
      if (!secret.SecretString) return '';
      const parsed = JSON.parse(secret.SecretString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return '';
    }
  });
  const formRef = useRef<HTMLDivElement>(null);

  const handleAddKeyValue = useCallback(() => {
    setKeyValuePairs(prev => [...prev, { key: '', value: '' }]);
  }, []);

  const handleRemoveKeyValue = useCallback((index: number) => {
    setKeyValuePairs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyValueChange = useCallback(
    (index: number, field: keyof KeyValuePair, value: string) => {
      setKeyValuePairs(prev =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const parseEnvFormat = (input: string): KeyValuePair[] => {
    return input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (!match) return null;
        const [, key, value] = match;
        return { key: key.trim(), value: value.trim() };
      })
      .filter((pair): pair is KeyValuePair => pair !== null);
  };

  const handleInputModeChange = (_: any, newMode: InputMode) => {
    if (newMode === inputMode) return;

    let newRawInput = '';

    if (newMode === 'json') {
      // 현재 상태를 JSON으로 변환
      const obj = Object.fromEntries(
        (inputMode === 'form' ? keyValuePairs : parseEnvFormat(rawInput)).map(
          ({ key, value }) => [key, value],
        ),
      );
      newRawInput = JSON.stringify(obj, null, 2);
    } else if (newMode === 'env') {
      // 현재 상태를 .env로 변환
      const pairs =
        inputMode === 'form'
          ? keyValuePairs
          : Object.entries(JSON.parse(rawInput)).map(([key, value]) => ({
              key,
              value: String(value),
            }));
      newRawInput = pairs.map(({ key, value }) => `${key}=${value}`).join('\n');
    } else if (newMode === 'form') {
      // 현재 상태를 form으로 변환
      const pairs =
        inputMode === 'json'
          ? Object.entries(JSON.parse(rawInput)).map(([key, value]) => ({
              key,
              value: String(value),
            }))
          : parseEnvFormat(rawInput);
      setKeyValuePairs(pairs);
    }

    if (newMode !== 'form') {
      setRawInput(newRawInput);
    }
    setInputMode(newMode);
    setError(null);
  };

  const validateAndParseInput = (): KeyValuePair[] | null => {
    if (inputMode === 'json') {
      try {
        const obj = JSON.parse(rawInput);
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
      if (pairs.length === 0) {
        setError('올바른 .env 형식이 아닙니다.');
        return null;
      }
      return pairs;
    }
    return keyValuePairs;
  };

  const handleSave = async () => {
    if (!secret.Name?.trim()) {
      setError('시크릿 이름은 필수입니다.');
      return;
    }

    const pairs = validateAndParseInput();
    if (!pairs) return;

    // 중복 키 체크
    const duplicateKey = pairs.some(
      (kv, index) => pairs.findIndex((item) => item.key === kv.key) !== index,
    );
    if (duplicateKey) {
      setError('중복된 키가 있습니다.');
      return;
    }

    // 빈 키 체크
    const emptyKey = pairs.some((kv) => !kv.key.trim());
    if (emptyKey) {
      setError('모든 키는 값이 있어야 합니다.');
      return;
    }

    const secretString = JSON.stringify(
      Object.fromEntries(pairs.map(({ key, value }) => [key, value])),
    );

    try {
      await onSave({
        ...secret,
        Name: secret.Name,
        Description: description,
        SecretString: secretString,
      });
      onClose();
    } catch (err) {
      setError('시크릿 수정에 실패했습니다.');
    }
  };

  const renderForm = () => (
    <Box
      ref={formRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: '60vh',
        overflowY: 'auto'
      }}
    >
      {keyValuePairs.map((kv, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={{ p: 2, position: 'relative' }}
        >
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

  return (
    <Dialog open maxWidth="md" fullWidth>
      <DialogTitle>시크릿 수정</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="이름"
            value={secret.Name}
            disabled
            size="small"
            helperText="시크릿 이름은 수정할 수 없습니다"
          />
          <TextField
            label="설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            multiline
            rows={2}
          />
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
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSave} variant="contained">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}
