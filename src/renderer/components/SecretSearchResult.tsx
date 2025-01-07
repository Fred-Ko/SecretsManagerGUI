import React from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  tableCellClasses,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Secret } from '../../main/interfaces/SecretManager';
import BatchUpdateDialog from './BatchUpdateDialog';
import BatchAddDialog from './BatchAddDialog';
import { FixedSizeList as List } from 'react-window';
import { useSnackbar } from 'notistack';
import ResizableColumn from './ResizableColumn';
import SecretList from './SecretList';
import { TableVirtuoso } from 'react-virtuoso';

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

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.background.paper,
    fontWeight: 'bold',
    padding: theme.spacing(1, 2),
    borderRight: `1px solid ${theme.palette.divider}`,
    position: 'relative',
    '&:last-child': {
      borderRight: 'none',
    },
    '&.MuiTableCell-paddingCheckbox': {
      padding: theme.spacing(0, 1),
      borderRight: `1px solid ${theme.palette.divider}`,
    },
    '& .resizer': {
      position: 'absolute',
      right: -4,
      top: 0,
      height: '100%',
      width: 8,
      cursor: 'col-resize',
      userSelect: 'none',
      touchAction: 'none',
      '&:hover': {
        backgroundColor: theme.palette.primary.main,
        opacity: 0.5,
      },
      '&.isResizing': {
        backgroundColor: theme.palette.primary.main,
        opacity: 0.5,
      }
    },
  },
  [`&.${tableCellClasses.body}`]: {
    padding: theme.spacing(1, 2),
    borderRight: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderRight: 'none',
    },
    '&.MuiTableCell-paddingCheckbox': {
      padding: theme.spacing(0, 1),
      borderRight: `1px solid ${theme.palette.divider}`,
    },
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  // 마지막 row를 제외하고 모든 row에 하단 border 추가
  '&:not(:last-child)': {
    '& td': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
}));

const StyledCheckboxCell = styled(TableCell)(({ theme }) => ({
  width: 50,
  minWidth: 50,
  maxWidth: 50,
  padding: theme.spacing(0, 1),
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  '&.MuiTableCell-head': {
    backgroundColor: theme.palette.background.paper,
  },
}));

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
    if (event.key === 'Enter') {
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

  const [isResizing, setIsResizing] = useState(false);
  const [currentResizer, setCurrentResizer] = useState<string | null>(null);
  const startResizePos = useRef(0);
  const startWidth = useRef(0);
  const currentWidth = useRef(0);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, column: 'name' | 'key' | 'value') => {
    setIsResizing(true);
    setCurrentResizer(column);
    startResizePos.current = e.clientX;
    startWidth.current = columnWidths[column];
    currentWidth.current = columnWidths[column];

    // 리사이징 중에는 임시 스타일을 적용
    if (resizerRef.current) {
      resizerRef.current.style.position = 'fixed';
      resizerRef.current.style.height = '100vh';
      resizerRef.current.style.top = '0';
      resizerRef.current.style.zIndex = '1300';
      resizerRef.current.style.opacity = '0.5';
      resizerRef.current.style.backgroundColor = 'primary.main';
    }
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !currentResizer || !resizerRef.current) return;

    const diff = e.clientX - startResizePos.current;
    currentWidth.current = Math.max(100, startWidth.current + diff);

    // 실시간으로는 리사이저의 위치만 업데이트
    resizerRef.current.style.left = `${e.clientX}px`;
  }, [isResizing, currentResizer]);

  const handleResizeEnd = useCallback(() => {
    if (currentResizer && currentWidth.current !== startWidth.current) {
      // 드래그가 끝난 시점에만 실제 컬럼 너비 업데이트
      setColumnWidths(prev => {
        const newWidths = { ...prev };
        if (currentResizer === 'name' || currentResizer === 'key' || currentResizer === 'value') {
          newWidths[currentResizer] = currentWidth.current;
        }
        return newWidths;
      });
    }

    if (resizerRef.current) {
      resizerRef.current.style.position = '';
      resizerRef.current.style.height = '';
      resizerRef.current.style.top = '';
      resizerRef.current.style.zIndex = '';
      resizerRef.current.style.opacity = '';
      resizerRef.current.style.backgroundColor = '';
    }

    setIsResizing(false);
    setCurrentResizer(null);
  }, [currentResizer]);

  // 마지막 컬럼(value)은 남은 공간을 모두 차지하도록 설정
  const valueColumnWidth = useMemo(() => {
    const totalWidth = window.innerWidth - 400; // 전체 너비에서 여백과 체크박스 영역 제외
    return Math.max(400, totalWidth - columnWidths.name - columnWidths.key - 50); // 50은 체크박스 컬럼 너비
  }, [columnWidths.name, columnWidths.key]);

  useEffect(() => {
    if (!isResizing) {  // 리사이징 중에는 value 컬럼 너비를 자동 조정하지 않음
      setColumnWidths(prev => ({
        ...prev,
        value: valueColumnWidth,
      }));
    }
  }, [valueColumnWidth, isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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
            gap: 1,
            alignItems: 'center',
            width: '100%',
            flexWrap: 'nowrap'
          }}>
            <Box sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              flex: 1,
              minWidth: 200,
            }}>
              {mode === 'search' ? (
                <>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, maxWidth: 200, overflow: 'hidden' }}>
                    {nameSearchTerms.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
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
                    )}
                  </Box>
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
                    sx={{ flex: 1, maxWidth: 1200 }}
                  />
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, maxWidth: 200, overflow: 'hidden' }}>
                    {nameSearchTerms.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
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
                    )}
                  </Box>
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
                searchTerms={nameSearchTerms}
              />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ height: '100%', overflow: 'auto' }}>
              <TableVirtuoso
                style={{ height: '100%' }}
                data={searchResults}
                components={{
                  Table: (props: any) => (
                    <Table {...props} stickyHeader size="small" style={{ tableLayout: 'fixed' }} />
                  ),
                  TableHead: (props: any) => (
                    <TableHead {...props} />
                  ),
                  TableRow: StyledTableRow,
                  TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
                    <TableBody {...props} ref={ref} />
                  )),
                }}
                fixedHeaderContent={() => (
                  <TableRow>
                    <StyledCheckboxCell>
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
                    </StyledCheckboxCell>
                    <StyledTableCell sx={{ width: columnWidths.name, minWidth: columnWidths.name, maxWidth: columnWidths.name }}>
                      시크릿 이름
                      <div
                        ref={currentResizer === 'name' ? resizerRef : null}
                        className={`resizer ${currentResizer === 'name' ? 'isResizing' : ''}`}
                        onMouseDown={(e) => handleResizeStart(e, 'name')}
                      />
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: columnWidths.key, minWidth: columnWidths.key, maxWidth: columnWidths.key }}>
                      키
                      <div
                        ref={currentResizer === 'key' ? resizerRef : null}
                        className={`resizer ${currentResizer === 'key' ? 'isResizing' : ''}`}
                        onMouseDown={(e) => handleResizeStart(e, 'key')}
                      />
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: columnWidths.value, minWidth: columnWidths.value }}>
                      값
                      <div
                        ref={currentResizer === 'value' ? resizerRef : null}
                        className={`resizer ${currentResizer === 'value' ? 'isResizing' : ''}`}
                        onMouseDown={(e) => handleResizeStart(e, 'value')}
                      />
                    </StyledTableCell>
                  </TableRow>
                )}
                itemContent={(index: number, result: SearchResult) => (
                  <>
                    <StyledCheckboxCell>
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
                    </StyledCheckboxCell>
                    <StyledTableCell sx={{ width: columnWidths.name, minWidth: columnWidths.name, maxWidth: columnWidths.name }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(result.secretName)}
                          title="이름 복사"
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
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
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: columnWidths.key, minWidth: columnWidths.key, maxWidth: columnWidths.key }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(result.key)}
                          title="키 복사"
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                        <Typography
                          sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {result.key}
                        </Typography>
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: columnWidths.value, minWidth: columnWidths.value }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(result.value)}
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
                            flex: 1,
                          }}
                        >
                          {result.value}
                        </Typography>
                      </Box>
                    </StyledTableCell>
                  </>
                )}
              />
            </TableContainer>
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
