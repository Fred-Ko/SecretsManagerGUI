import { ContentCopy as CopyIcon, Edit as EditIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';

interface Props {
  secret: Secret;
  onEdit: () => void;
}

type ViewFormat = 'overview' | 'table' | 'json' | 'env';

export default function SecretDetail({ secret, onEdit }: Props) {
  const [viewFormat, setViewFormat] = useState<ViewFormat>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1000);
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
      <Typography color="error">
        시크릿 값을 파싱할 수 없습니다. JSON 형식이 아닙니다.
      </Typography>
    );
  }

  const renderOverview = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          설명
        </Typography>
        <Typography variant="body2">{secret.Description || '-'}</Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          ARN
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              p: 0.5,
              borderRadius: 1,
              flexGrow: 1,
            }}
          >
            {secret.ARN}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleCopy(secret.ARN || '', 'arn')}
          >
            {copiedKey === 'arn' ? (
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
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          마지막 수정일
        </Typography>
        <Typography variant="body2">
          {new Date(secret.LastChangedDate!).toLocaleString('ko-KR')}
        </Typography>
      </Paper>
    </Box>
  );

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
              <TableCell
                component="th"
                scope="row"
                sx={{ fontWeight: 'medium' }}
              >
                {key}
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
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
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="div">
              {secret.Name}
            </Typography>
            <Button
              startIcon={<EditIcon />}
              onClick={onEdit}
              size="small"
              sx={{ ml: 'auto' }}
            >
              수정
            </Button>
          </Box>
        }
        subheader={
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            <div>ARN: {secret.ARN}</div>
            <div>
              마지막 변경:{' '}
              {new Date(secret.LastChangedDate!).toLocaleString('ko-KR')}
            </div>
            {secret.Description && <div>설명: {secret.Description}</div>}
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={viewFormat}
            onChange={(_, newValue: ViewFormat) => setViewFormat(newValue)}
          >
            <Tab label="개요" value="overview" />
            <Tab label="값" value="table" />
            <Tab label="JSON" value="json" />
            <Tab label=".env" value="env" />
          </Tabs>
        </Box>
        {viewFormat === 'overview' && renderOverview()}
        {viewFormat === 'table' && renderTable()}
        {viewFormat === 'json' && renderJson()}
        {viewFormat === 'env' && renderEnv()}
      </CardContent>
    </Card>
  );
}
