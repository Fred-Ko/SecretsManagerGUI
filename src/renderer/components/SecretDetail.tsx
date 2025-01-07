import { Edit as EditIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Typography,
  TextField,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { Secret } from '../../main/interfaces/SecretManager';
import { useState } from 'react';

interface Props {
  secret: Secret;
  onEdit: () => void;
}

type ViewFormat = 'table' | 'json' | 'env';

export default function SecretDetail({ secret, onEdit }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [viewFormat, setViewFormat] = useState<ViewFormat>('table');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      enqueueSnackbar('복사되었습니다', { variant: 'success' });
      if (key) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1000);
      }
    });
  };

  const secretValue = (() => {
    try {
      if (!secret.SecretString) return null;
      return JSON.parse(secret.SecretString);
    } catch {
      return null;
    }
  })();

  if (!secretValue || typeof secretValue !== 'object') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography color="error">
            시크릿 값을 파싱할 수 없습니다. JSON 형식이 아닙니다.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const renderTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>키</TableCell>
            <TableCell>값</TableCell>
            <TableCell width={48} />
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(secretValue).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                {key}
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {String(value)}
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(String(value), key)}
                >
                  {copiedKey === key ? (
                    <Chip
                      label="복사됨"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <CopyIcon fontSize="small" />
                  )}
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderJson = () => (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="small"
        onClick={() => handleCopy(JSON.stringify(secretValue, null, 2), 'json')}
        sx={{ position: 'absolute', top: 8, right: 8 }}
      >
        {copiedKey === 'json' ? (
          <Chip
            label="복사됨"
            color="success"
            size="small"
            variant="outlined"
          />
        ) : (
          <CopyIcon fontSize="small" />
        )}
      </IconButton>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: 'action.hover',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {JSON.stringify(secretValue, null, 2)}
      </Paper>
    </Box>
  );

  const renderEnv = () => {
    const envFormat = Object.entries(secretValue)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    return (
      <Box sx={{ position: 'relative' }}>
        <IconButton
          size="small"
          onClick={() => handleCopy(envFormat, 'env')}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          {copiedKey === 'env' ? (
            <Chip
              label="복사됨"
              color="success"
              size="small"
              variant="outlined"
            />
          ) : (
            <CopyIcon fontSize="small" />
          )}
        </IconButton>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: 'action.hover',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {envFormat}
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="h6" component="h2">
                {secret.Name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleCopy(secret.Name || '')}
                title="이름 복사"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="ARN"
                value={secret.ARN}
                size="small"
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={() => handleCopy(secret.ARN || '')}
                      title="ARN 복사"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
              <TextField
                label="마지막 수정일"
                value={new Date(secret.LastChangedDate || '').toLocaleString()}
                size="small"
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
              />
              <TextField
                label="설명"
                value={secret.Description || '미 사용 여부 확인'}
                size="small"
                fullWidth
                multiline
                minRows={2}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
            sx={{ flexShrink: 0 }}
          >
            수정
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={viewFormat}
            onChange={(_, newValue: ViewFormat) => setViewFormat(newValue)}
          >
            <Tab label="값" value="table" />
            <Tab label="JSON" value="json" />
            <Tab label=".env" value="env" />
          </Tabs>
        </Box>
        {viewFormat === 'table' && renderTable()}
        {viewFormat === 'json' && renderJson()}
        {viewFormat === 'env' && renderEnv()}
      </Paper>
    </Box>
  );
}
