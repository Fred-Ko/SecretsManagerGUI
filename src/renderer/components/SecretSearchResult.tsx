import { AutoFixHigh as UpdateIcon } from '@mui/icons-material';
import {
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';
import BatchUpdateDialog from './BatchUpdateDialog';

interface Props {
  secrets: Secret[];
  onSecretSelect: (secret: Secret) => void;
  onBatchUpdate: (
    updates: Array<{ secret: Secret; key: string; newValue: string }>,
  ) => Promise<void>;
  mode?: 'search' | 'batch-update';
}

interface SearchResult {
  secretName: string;
  key: string;
  value: string;
  secret: Secret;
}

interface PreviewResult {
  secretName: string;
  key: string;
  oldValue: string;
  newValue: string;
}

type SearchType = 'key' | 'value';

export default function SecretSearchResult({
  secrets,
  onSecretSelect,
  onBatchUpdate,
}: Props) {
  const [searchType, setSearchType] = useState<'key' | 'value'>('key');
  const [searchText, setSearchText] = useState('');
  const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([]);

  const searchResults = useMemo(() => {
    const results: SearchResult[] = [];
    const searchLower = searchText.toLowerCase();

    secrets.forEach((secret) => {
      try {
        if (!secret.SecretString) return;

        const value = JSON.parse(secret.SecretString);
        if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([key, val]) => {
            const stringVal = String(val);
            if (
              (searchType === 'key' &&
                key.toLowerCase().includes(searchLower)) ||
              (searchType === 'value' &&
                stringVal.toLowerCase().includes(searchLower))
            ) {
              results.push({
                secretName: secret.Name || '',
                key,
                value: stringVal,
                secret,
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse secret value:', err);
      }
    });

    return results;
  }, [secrets, searchType, searchText]);

  return (
    <>
      <Paper>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            시크릿 검색
          </Typography>
          {selectedResults.length > 0 && (
            <Button
              startIcon={<UpdateIcon />}
              variant="contained"
              onClick={() => setIsBatchUpdateOpen(true)}
            >
              일괄 업데이트 ({selectedResults.length})
            </Button>
          )}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>검색 유형</InputLabel>
            <Select
              value={searchType}
              label="검색 유형"
              onChange={(e) =>
                setSearchType(e.target.value as typeof searchType)
              }
            >
              <MenuItem value="key">키</MenuItem>
              <MenuItem value="value">값</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="검색..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Toolbar>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      selectedResults.length > 0 &&
                      selectedResults.length === searchResults.length
                    }
                    indeterminate={
                      selectedResults.length > 0 &&
                      selectedResults.length < searchResults.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedResults(searchResults);
                      } else {
                        setSelectedResults([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>시크릿 이름</TableCell>
                <TableCell>키</TableCell>
                <TableCell>값</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchResults.map((result, index) => (
                <TableRow key={`${result.secretName}-${result.key}-${index}`}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedResults.some(
                        (r) =>
                          r.secretName === result.secretName &&
                          r.key === result.key &&
                          r.value === result.value,
                      )}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedResults([...selectedResults, result]);
                        } else {
                          setSelectedResults(
                            selectedResults.filter(
                              (r) =>
                                r.secretName !== result.secretName ||
                                r.key !== result.key ||
                                r.value !== result.value,
                            ),
                          );
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      onClick={() => onSecretSelect(result.secret)}
                      sx={{ textAlign: 'left' }}
                    >
                      {result.secretName}
                    </Link>
                  </TableCell>
                  <TableCell>{result.key}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {result.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <BatchUpdateDialog
        open={isBatchUpdateOpen}
        onClose={() => setIsBatchUpdateOpen(false)}
        onUpdate={onBatchUpdate}
        selectedSecrets={Array.from(
          new Set(selectedResults.map((r) => r.secret)),
        )}
      />
    </>
  );
}
