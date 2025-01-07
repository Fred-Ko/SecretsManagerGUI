import { ContentCopy as CopyIcon, Edit as EditIcon } from '@mui/icons-material';
import {
  Box,
  Button,
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
  TextField,
  Typography,
  styled,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';

interface Props {
  secret: Secret;
  onEdit: () => void;
}

type ViewFormat = 'table' | 'json' | 'env';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderRight: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderRight: 'none',
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

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
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <StyledTableCell>키</StyledTableCell>
            <StyledTableCell>값</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(secretValue).map(([key, value]) => (
            <StyledTableRow key={key}>
              <StyledTableCell sx={{ width: '30%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(key)}
                    title="키 복사"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {key}
                  </Typography>
                </Box>
              </StyledTableCell>
              <StyledTableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(String(value))}
                    title="값 복사"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {String(value)}
                  </Typography>
                </Box>
              </StyledTableCell>
            </StyledTableRow>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onEdit}
              size="small"
            >
              수정
            </Button>
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
