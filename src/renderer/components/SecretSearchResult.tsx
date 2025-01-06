import { AutoFixHigh as UpdateIcon, ContentCopy as CopyIcon, Search as SearchIcon, Clear as ClearIcon, Add as AddIcon } from '@mui/icons-material';
import {
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  TextField,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Chip,
} from '@mui/material';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';
import BatchUpdateDialog from './BatchUpdateDialog';
import BatchAddDialog from './BatchAddDialog';
import { FixedSizeList as List } from 'react-window';
import { useSnackbar } from 'notistack';
import ResizableColumn from './ResizableColumn';
import SecretList from './SecretList';

interface Props {
  secrets: Secret[];
  onSecretSelect: (secret: Secret) => void;
  onBatchUpdate: (
    updates: Array<{ secret: Secret; key: string; newValue: string }>,
  ) => Promise<void>;
  mode?: 'search' | 'batch-update' | 'batch-add';
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
  mode = 'search',
}: Props) {
  const [searchType, setSearchType] = useState<'key' | 'value'>('key');
  const [currentSearchType, setCurrentSearchType] = useState<'key' | 'value'>('key');
  const [searchText, setSearchText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  // 화면 너비에 따라 컬럼 너비 자동 조절
  const [columnWidths, setColumnWidths] = useState({
    name: 250,
    key: 250,
    value: 400,
  });

  // 화면 크기 변경 시 컬럼 너비 자동 조절
  useEffect(() => {
    const handleResize = () => {
      const totalWidth = window.innerWidth - 400; // 여백과 체크박스 영역 고려
      if (totalWidth > 900) { // 최소 너비보다 클 때만 자동 조절
        setColumnWidths({
          name: totalWidth * 0.25,
          key: totalWidth * 0.25,
          value: totalWidth * 0.5,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 시크릿 이름 검색을 위한 상태
  const [nameSearchText, setNameSearchText] = useState('');
  const [nameSearchTerms, setNameSearchTerms] = useState<string[]>([]);

  // 시크릿 이름 검색 핸들러
  const handleNameSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && nameSearchText.trim()) {
      event.preventDefault();
      setNameSearchTerms([...nameSearchTerms, nameSearchText.trim()]);
      setNameSearchText('');
    } else if (event.key === 'Backspace' && !nameSearchText && nameSearchTerms.length > 0) {
      event.preventDefault();
      setNameSearchTerms(nameSearchTerms.slice(0, -1));
    }
  }, [nameSearchText, nameSearchTerms]);

  const handleRemoveNameSearchTerm = useCallback((termToRemove: string) => {
    setNameSearchTerms(nameSearchTerms.filter(term => term !== termToRemove));
  }, [nameSearchTerms]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      event.preventDefault();
      setSearchText(inputValue.trim());
      setCurrentSearchType(searchType);
    }
  }, [inputValue, searchType]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // 시크릿 데이터를 미리 파싱
  const parsedSecrets = useMemo(() => {
    return secrets.map(secret => {
      try {
        if (!secret.SecretString) return { secret, entries: [] };
        const value = JSON.parse(secret.SecretString);
        if (typeof value === 'object' && value !== null) {
          return {
            secret,
            entries: Object.entries(value).map(([key, val]) => ({
              key,
              value: String(val)
            }))
          };
        }
        return { secret, entries: [] };
      } catch (err) {
        console.error('Failed to parse secret value:', err);
        return { secret, entries: [] };
      }
    });
  }, [secrets]);

  // 검색 결과 계산
  const searchResults = useMemo(() => {
    const results: SearchResult[] = [];
    const secretName = nameSearchText.toLowerCase();

    parsedSecrets.forEach(({ secret, entries }) => {
      // 시크릿 이름으로 필터링
      const name = (secret.Name || '').toLowerCase();
      if (nameSearchTerms.length > 0 && !nameSearchTerms.every(term =>
        name.includes(term.toLowerCase())
      )) {
        return;
      }
      // 현재 입력 중인 검색어로도 필터링
      if (nameSearchText && !name.includes(secretName)) {
        return;
      }

      // 키/값 검색어로 필터링
      entries.forEach(({ key, value }) => {
        if (!searchText || (
          (currentSearchType === 'key' && key.toLowerCase().includes(searchText.toLowerCase())) ||
          (currentSearchType === 'value' && value.toLowerCase().includes(searchText.toLowerCase()))
        )) {
          results.push({
            secretName: secret.Name || '',
            key,
            value,
            secret,
          });
        }
      });
    });

    return results;
  }, [parsedSecrets, nameSearchText, searchText, currentSearchType]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      enqueueSnackbar('복사되었습니다', { variant: 'success' });
    });
  }, [enqueueSnackbar]);

  const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);

  return (
    <>
      <Paper>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: 'auto', py: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" component="div">
              {mode === 'batch-add' ? '일괄 추가' : '시크릿 검색'}
            </Typography>
            {selectedResults.length > 0 && (
              <>
                {mode === 'search' && (
                  <Button
                    startIcon={<UpdateIcon />}
                    variant="contained"
                    size="small"
                    onClick={() => setIsBatchUpdateOpen(true)}
                  >
                    일괄 업데이트 ({selectedResults.length})
                  </Button>
                )}
                {mode === 'batch-add' && (
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    size="small"
                    onClick={() => setIsBatchAddOpen(true)}
                  >
                    일괄 추가 ({selectedResults.length})
                  </Button>
                )}
              </>
            )}
          </Box>

          <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            width: '100%',
            flexWrap: 'wrap'
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              flex: 1,
              minWidth: 200,
            }}>
              {mode === 'search' ? (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder={nameSearchTerms.length ? "" : "시크릿 이름 검색..."}
                      value={nameSearchText}
                      onChange={(e) => setNameSearchText(e.target.value)}
                      onKeyDown={handleNameSearchKeyDown}
                      sx={{ width: 250 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                        endAdornment: nameSearchText && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setNameSearchText('')}
                              sx={{ p: 0.5 }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    {nameSearchTerms.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                          {nameSearchTerms.map((term, index) => (
                            <Chip
                              key={index}
                              label={term}
                              size="small"
                              onDelete={() => handleRemoveNameSearchTerm(term)}
                            />
                          ))}
                          <IconButton
                            size="small"
                            onClick={() => setNameSearchTerms([])}
                            sx={{ p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    minWidth: 300,
                    flex: 1,
                  }}>
                    <FormControl size="small" sx={{ width: 120 }}>
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
                      placeholder="검색어 입력 후 Enter..."
                      value={inputValue}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder={nameSearchTerms.length ? "" : "시크릿 이름 검색..."}
                    value={nameSearchText}
                    onChange={(e) => setNameSearchText(e.target.value)}
                    onKeyDown={handleNameSearchKeyDown}
                    sx={{ width: 250 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: nameSearchText && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setNameSearchText('')}
                            sx={{ p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {nameSearchTerms.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                        {nameSearchTerms.map((term, index) => (
                          <Chip
                            key={index}
                            label={term}
                            size="small"
                            onDelete={() => handleRemoveNameSearchTerm(term)}
                          />
                        ))}
                        <IconButton
                          size="small"
                          onClick={() => setNameSearchTerms([])}
                          sx={{ p: 0.5 }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Toolbar>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 200px)',
          overflow: 'auto'
        }}>
          {mode === 'batch-add' ? (
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <SecretList
                secrets={secrets}
                onSelect={onSecretSelect}
                onAdd={() => {}}
                onBulkSelect={(selectedSecrets) => {
                  const results = selectedSecrets.map(secret => ({
                    secretName: secret.Name || '',
                    key: '',
                    value: '',
                    secret,
                  }));
                  setSelectedResults(results);
                }}
                onDelete={() => {}}
                searchTerms={nameSearchTerms}
              />
            </Box>
          ) : (
            <>
              <Box sx={{
                display: 'flex',
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                px: 2,
                height: 56,
              }}>
                <Box sx={{
                  width: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Checkbox
                    checked={selectedResults.length > 0 && selectedResults.length === searchResults.length}
                    indeterminate={selectedResults.length > 0 && selectedResults.length < searchResults.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedResults(searchResults);
                      } else {
                        setSelectedResults([]);
                      }
                    }}
                  />
                </Box>
                <ResizableColumn
                  width={columnWidths.name}
                  onResize={(width) => setColumnWidths(prev => ({ ...prev, name: width }))}
                >
                  <Box sx={{
                    fontWeight: 'bold',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    pr: 4,
                  }}>
                    시크릿 이름
                  </Box>
                </ResizableColumn>
                <ResizableColumn
                  width={columnWidths.key}
                  onResize={(width) => setColumnWidths(prev => ({ ...prev, key: width }))}
                >
                  <Box sx={{
                    fontWeight: 'bold',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    pr: 4,
                  }}>
                    키
                  </Box>
                </ResizableColumn>
                <ResizableColumn
                  width={columnWidths.value}
                  onResize={(width) => setColumnWidths(prev => ({ ...prev, value: width }))}
                >
                  <Box sx={{
                    fontWeight: 'bold',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    pr: 4,
                  }}>
                    값
                  </Box>
                </ResizableColumn>
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <List
                  height={window.innerHeight - 250}
                  itemCount={searchResults.length}
                  itemSize={56}
                  width="100%"
                  style={{
                    paddingTop: 4,
                    paddingBottom: 4,
                    minWidth: 'fit-content'
                  }}
                >
                  {({ index, style }) => {
                    const result = searchResults[index];
                    return (
                      <Box
                        key={`${result.secretName}-${result.key}-${index}`}
                        style={{
                          ...style,
                          width: 'fit-content',
                          minWidth: '100%'
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: 1,
                          borderColor: 'divider',
                          px: 2,
                          py: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Box sx={{ width: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        </Box>
                        <Box sx={{
                          width: columnWidths.name,
                          display: 'flex',
                          alignItems: 'center',
                          pr: 4,
                        }}>
                          <Link
                            component="button"
                            onClick={() => onSecretSelect(result.secret)}
                            sx={{
                              textAlign: 'left',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {result.secretName}
                          </Link>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(result.secretName)}
                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Box sx={{
                          width: columnWidths.key,
                          display: 'flex',
                          alignItems: 'center',
                          pr: 4,
                        }}>
                          <Box sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>{result.key}</Box>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(result.key)}
                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Box sx={{
                          width: columnWidths.value,
                          display: 'flex',
                          alignItems: 'center',
                          pr: 4,
                        }}>
                          <Box sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {result.value}
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(result.value)}
                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  }}
                </List>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      <BatchUpdateDialog
        open={isBatchUpdateOpen}
        onClose={() => setIsBatchUpdateOpen(false)}
        onUpdate={onBatchUpdate}
        selectedSecrets={Array.from(
          new Set(selectedResults.map((r) => r.secret)),
        )}
      />

      <BatchAddDialog
        open={isBatchAddOpen}
        onClose={() => setIsBatchAddOpen(false)}
        onAdd={onBatchUpdate}
        selectedSecrets={Array.from(
          new Set(selectedResults.map((r) => r.secret)),
        )}
      />
    </>
  );
}
