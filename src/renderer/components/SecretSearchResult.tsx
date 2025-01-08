import {
  Add as AddIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
  AutoFixHigh as UpdateIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
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
  tableCellClasses,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { Secret } from '../../main/interfaces/SecretManager';
import BatchAddDialog from './BatchAddDialog';
import BatchUpdateDialog from './BatchUpdateDialog';

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
      },
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

// 테이블 컴포넌트들을 메모이제이션
const TableComponent = React.memo((props: any) => (
  <Table
    {...props}
    stickyHeader
    size="small"
    style={{ tableLayout: 'fixed' }}
  />
));

const TableHeadComponent = React.memo((props: any) => <TableHead {...props} />);

const TableBodyComponent = React.memo(
  React.forwardRef<HTMLTableSectionElement>((props, ref) => (
    <TableBody {...props} ref={ref} />
  )),
);

// 행 컴포넌트 메모이제이션
const TableRowComponent = React.memo(StyledTableRow);

// 헤더 컨텐츠 컴포넌트 분리
const HeaderContent = React.memo(
  ({
    columnWidths,
    currentResizer,
    resizerRef,
    handleResizeStart,
    selectedResults,
    totalResults,
    onSelectAll,
  }: {
    columnWidths: { name: number; key: number; value: number };
    currentResizer: string | null;
    resizerRef: React.RefObject<HTMLDivElement>;
    handleResizeStart: (
      e: React.MouseEvent,
      column: 'name' | 'key' | 'value',
    ) => void;
    selectedResults: SearchResult[];
    totalResults: number;
    onSelectAll: (checked: boolean) => void;
  }) => (
    <TableRow>
      <StyledCheckboxCell>
        <Checkbox
          checked={
            selectedResults.length > 0 &&
            selectedResults.length === totalResults
          }
          indeterminate={
            selectedResults.length > 0 && selectedResults.length < totalResults
          }
          onChange={(e) => onSelectAll(e.target.checked)}
        />
      </StyledCheckboxCell>
      <StyledTableCell
        sx={{
          width: columnWidths.name,
          minWidth: columnWidths.name,
          maxWidth: columnWidths.name,
        }}
      >
        시크릿 이름
        <div
          ref={currentResizer === 'name' ? resizerRef : null}
          className={`resizer ${currentResizer === 'name' ? 'isResizing' : ''}`}
          onMouseDown={(e) => handleResizeStart(e, 'name')}
        />
      </StyledTableCell>
      <StyledTableCell
        sx={{
          width: columnWidths.key,
          minWidth: columnWidths.key,
          maxWidth: columnWidths.key,
        }}
      >
        설명
        <div
          ref={currentResizer === 'key' ? resizerRef : null}
          className={`resizer ${currentResizer === 'key' ? 'isResizing' : ''}`}
          onMouseDown={(e) => handleResizeStart(e, 'key')}
        />
      </StyledTableCell>
      <StyledTableCell
        sx={{
          width: columnWidths.value,
          minWidth: columnWidths.value,
        }}
      >
        마지막 수정일
        <div
          ref={currentResizer === 'value' ? resizerRef : null}
          className={`resizer ${currentResizer === 'value' ? 'isResizing' : ''}`}
          onMouseDown={(e) => handleResizeStart(e, 'value')}
        />
      </StyledTableCell>
    </TableRow>
  ),
);

// 행 컨텐츠 컴포넌트 분리
const RowContent = React.memo(
  ({
    result,
    columnWidths,
    isSelected,
    onSelect,
    onCopy,
    onSecretSelect,
  }: {
    result: SearchResult;
    columnWidths: { name: number; key: number; value: number };
    isSelected: boolean;
    onSelect: (checked: boolean) => void;
    onCopy: (text: string) => void;
    onSecretSelect: (secret: Secret) => void;
  }) => (
    <>
      <StyledCheckboxCell>
        <Checkbox
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </StyledCheckboxCell>
      <StyledTableCell
        sx={{
          width: columnWidths.name,
          minWidth: columnWidths.name,
          maxWidth: columnWidths.name,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => onCopy(result.secretName)}
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
      <StyledTableCell
        sx={{
          width: columnWidths.key,
          minWidth: columnWidths.key,
          maxWidth: columnWidths.key,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => onCopy(result.key)}
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
      <StyledTableCell
        sx={{
          width: columnWidths.value,
          minWidth: columnWidths.value,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => onCopy(result.value)}
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
  ),
);

export default function SecretSearchResult({
  secrets,
  onSecretSelect,
  onBatchUpdate,
  mode = 'search',
}: Props) {
  const [searchType, setSearchType] = useState<'key' | 'value'>('key');
  const [currentSearchType, setCurrentSearchType] = useState<'key' | 'value'>(
    'key',
  );
  const [searchText, setSearchText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  // 초기 컬럼 너비 설정
  const [columnWidths, setColumnWidths] = useState({
    name: 250,
    key: 250,
    value: 400,
  });

  // 화면 크기 변경 시 컬럼 너비 자동 조절 제거
  useEffect(() => {
    const handleResize = () => {
      const totalWidth = window.innerWidth - 400;
      if (totalWidth > 900) {
        setColumnWidths((prev) => ({
          ...prev,
          value: Math.max(400, totalWidth - prev.name - prev.key - 50),
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 시크릿 이름 검색을 위한 상태
  const [nameSearchText, setNameSearchText] = useState('');
  const [nameSearchTerms, setNameSearchTerms] = useState<string[]>([]);

  // 시크릿 이름 검색 핸들러
  const handleNameSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && nameSearchText.trim()) {
        event.preventDefault();
        setNameSearchTerms([...nameSearchTerms, nameSearchText.trim()]);
        setNameSearchText('');
      } else if (
        event.key === 'Backspace' &&
        !nameSearchText &&
        nameSearchTerms.length > 0
      ) {
        event.preventDefault();
        setNameSearchTerms(nameSearchTerms.slice(0, -1));
      }
    },
    [nameSearchText, nameSearchTerms],
  );

  const handleRemoveNameSearchTerm = useCallback(
    (termToRemove: string) => {
      setNameSearchTerms(
        nameSearchTerms.filter((term) => term !== termToRemove),
      );
    },
    [nameSearchTerms],
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        setSearchText(inputValue.trim());
        setCurrentSearchType(searchType);
      }
    },
    [inputValue, searchType],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  // 시크릿 데이터를 미리 파싱
  const parsedSecrets = useMemo(() => {
    return secrets.map((secret) => {
      try {
        if (!secret.SecretString) return { secret, entries: [] };
        const value = JSON.parse(secret.SecretString);
        if (typeof value === 'object' && value !== null) {
          return {
            secret,
            entries: Object.entries(value).map(([key, val]) => ({
              key,
              value: String(val),
            })),
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

      // nameSearchTerms가 비어있고 현재 입력 중인 검색어도 없으면 필터링하지 않음
      const shouldFilterByName = nameSearchTerms.length > 0 || nameSearchText;
      if (shouldFilterByName) {
        if (
          (nameSearchTerms.length > 0 && !nameSearchTerms.every((term) => name.includes(term.toLowerCase()))) ||
          (nameSearchText && !name.includes(secretName))
        ) {
          return;
        }
      }

      // 키/값 검색어로 필터링
      entries.forEach(({ key, value }) => {
        if (
          !searchText ||
          (currentSearchType === 'key' &&
            key.toLowerCase().includes(searchText.toLowerCase())) ||
          (currentSearchType === 'value' &&
            value.toLowerCase().includes(searchText.toLowerCase()))
        ) {
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
  }, [parsedSecrets, nameSearchText, nameSearchTerms, searchText, currentSearchType]);

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        enqueueSnackbar('복사되었습니다', { variant: 'success' });
      });
    },
    [enqueueSnackbar],
  );

  const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);

  const [isResizing, setIsResizing] = useState(false);
  const [currentResizer, setCurrentResizer] = useState<string | null>(null);
  const startResizePos = useRef(0);
  const startWidth = useRef(0);
  const currentWidth = useRef(0);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, column: 'name' | 'key' | 'value') => {
      e.preventDefault();
      setIsResizing(true);
      setCurrentResizer(column);

      // 컬럼의 왼른쪽 경계 위치를 저장
      const headerCell = e.currentTarget.closest('th');
      if (headerCell) {
        const rect = headerCell.getBoundingClientRect();
        startResizePos.current = rect.right;
        startWidth.current = columnWidths[column];
      }
    },
    [columnWidths],
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !currentResizer) return;

      // 마우스와 시작 위치의 차이를 이용해 새로운 너비 계산
      const diff = e.clientX - startResizePos.current;
      const newWidth = Math.max(100, startWidth.current + diff);

      // 현재 컬럼의 너비만 업데이트
      setColumnWidths((prev) => ({
        ...prev,
        [currentResizer]: newWidth,
      }));

      // value 컬럼의 너비 자동 조절
      if (currentResizer !== 'value') {
        const totalWidth = window.innerWidth - 400;
        setColumnWidths((prev) => ({
          ...prev,
          value: Math.max(400, totalWidth - prev.name - prev.key - 50),
        }));
      }
    },
    [isResizing, currentResizer],
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setCurrentResizer(null);
  }, []);

  // 마지막 컬럼(value)은 남은 공간을 모두 차지하도록 설정
  const valueColumnWidth = useMemo(() => {
    if (isResizing && currentResizer === 'value') {
      return columnWidths.value;
    }
    const totalWidth = window.innerWidth - 400; // 여백과 체크박스 영역 고려
    return Math.max(
      400,
      totalWidth - columnWidths.name - columnWidths.key - 50,
    );
  }, [
    columnWidths.name,
    columnWidths.key,
    columnWidths.value,
    isResizing,
    currentResizer,
  ]);

  useEffect(() => {
    if (!isResizing) {
      setColumnWidths((prev) => ({
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

  const tableComponents = useMemo(
    () => ({
      Table: TableComponent,
      TableHead: TableHeadComponent,
      TableRow: TableRowComponent,
      TableBody: TableBodyComponent,
    }),
    [],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedResults(checked ? searchResults : []);
    },
    [searchResults],
  );

  const renderHeaderContent = useCallback(
    () => (
      <HeaderContent
        columnWidths={columnWidths}
        currentResizer={currentResizer}
        resizerRef={resizerRef}
        handleResizeStart={handleResizeStart}
        selectedResults={selectedResults}
        totalResults={searchResults.length}
        onSelectAll={handleSelectAll}
      />
    ),
    [
      columnWidths,
      currentResizer,
      selectedResults,
      searchResults.length,
      handleResizeStart,
      handleSelectAll,
    ],
  );

  const renderRowContent = useCallback(
    (index: number, result: SearchResult) => (
      <RowContent
        result={result}
        columnWidths={columnWidths}
        isSelected={selectedResults.some(
          (r) =>
            r.secretName === result.secretName &&
            r.key === result.key &&
            r.value === result.value,
        )}
        onSelect={(checked) => {
          if (checked) {
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
        onCopy={handleCopy}
        onSecretSelect={onSecretSelect}
      />
    ),
    [columnWidths, selectedResults, handleCopy, onSecretSelect],
  );

  return (
    <>
      <div ref={resizerRef} style={{ display: 'none' }} />
      <Paper>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: 'auto', py: 1 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography variant="h6" component="div">
              {
                {
                  'batch-add': '일괄 추가',
                  'batch-update': '일괄 업데이트',
                  search: '시크릿 검색',
                }[mode || 'search']
              }
            </Typography>
            {selectedResults.length > 0 && (
              <>
                {mode === 'batch-update' && (
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

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              width: '100%',
              flexWrap: 'nowrap',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flex: 1,
                minWidth: 200,
              }}
            >
              {mode === 'search' || mode === 'batch-update' ? (
                <>
                  <TextField
                    size="small"
                    placeholder={
                      nameSearchTerms.length ? '' : '시크릿 이름 검색...'
                    }
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
                    placeholder={
                      nameSearchTerms.length ? '' : '시크릿 이름 검색...'
                    }
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
                </Box>
              )}
            </Box>
          </Box>
          {nameSearchTerms.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
                overflow: 'hidden',
                width: '100%',
                mt: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.5,
                  overflow: 'hidden',
                }}
              >
                {nameSearchTerms.map((term) => (
                  <Chip
                    key={term}
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
        </Toolbar>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 200px)',
            overflow: 'auto',
          }}
        >
          {mode === 'batch-add' ? (
            <TableContainer
              component={Paper}
              sx={{ height: '100%', overflow: 'auto' }}
            >
              <TableVirtuoso
                style={{ height: '100%' }}
                data={secrets}
                components={{
                  Table: (props: any) => (
                    <Table
                      {...props}
                      stickyHeader
                      size="small"
                      style={{ tableLayout: 'fixed' }}
                    />
                  ),
                  TableHead: (props: any) => <TableHead {...props} />,
                  TableRow: StyledTableRow,
                  TableBody: React.forwardRef<HTMLTableSectionElement>(
                    (props, ref) => <TableBody {...props} ref={ref} />,
                  ),
                }}
                fixedHeaderContent={() => (
                  <TableRow>
                    <StyledCheckboxCell>
                      <Checkbox
                        checked={
                          selectedResults.length > 0 &&
                          selectedResults.length === secrets.length
                        }
                        indeterminate={
                          selectedResults.length > 0 &&
                          selectedResults.length < secrets.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const results = secrets.map((secret) => ({
                              secretName: secret.Name || '',
                              key: '',
                              value: '',
                              secret,
                            }));
                            setSelectedResults(results);
                          } else {
                            setSelectedResults([]);
                          }
                        }}
                      />
                    </StyledCheckboxCell>
                    <StyledTableCell
                      sx={{
                        width: columnWidths.name,
                        minWidth: columnWidths.name,
                        maxWidth: columnWidths.name,
                      }}
                    >
                      시크릿 이름
                      <div
                        ref={currentResizer === 'name' ? resizerRef : null}
                        className={`resizer ${currentResizer === 'name' ? 'isResizing' : ''}`}
                        onMouseDown={(e) => handleResizeStart(e, 'name')}
                      />
                    </StyledTableCell>
                    <StyledTableCell
                      sx={{
                        width: columnWidths.key,
                        minWidth: columnWidths.key,
                        maxWidth: columnWidths.key,
                      }}
                    >
                      설명
                      <div
                        ref={currentResizer === 'key' ? resizerRef : null}
                        className={`resizer ${currentResizer === 'key' ? 'isResizing' : ''}`}
                        onMouseDown={(e) => handleResizeStart(e, 'key')}
                      />
                    </StyledTableCell>
                    <StyledTableCell
                      sx={{
                        width: columnWidths.value,
                        minWidth: columnWidths.value,
                      }}
                    >
                      마지막 수정일
                      <div
                        ref={currentResizer === 'value' ? resizerRef : null}
                        className={`resizer ${currentResizer === 'value' ? 'isResizing' : ''}`}
                        onMouseDown={(e) => handleResizeStart(e, 'value')}
                      />
                    </StyledTableCell>
                  </TableRow>
                )}
                itemContent={(index: number, secret: Secret) => (
                  <>
                    <StyledCheckboxCell>
                      <Checkbox
                        checked={selectedResults.some(
                          (r) => r.secret.ARN === secret.ARN,
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResults([
                              ...selectedResults,
                              {
                                secretName: secret.Name || '',
                                key: '',
                                value: '',
                                secret,
                              },
                            ]);
                          } else {
                            setSelectedResults(
                              selectedResults.filter(
                                (r) => r.secret.ARN !== secret.ARN,
                              ),
                            );
                          }
                        }}
                      />
                    </StyledCheckboxCell>
                    <StyledTableCell
                      sx={{
                        width: columnWidths.name,
                        minWidth: columnWidths.name,
                        maxWidth: columnWidths.name,
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(secret.Name || '')}
                          title="이름 복사"
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                        <Link
                          component="button"
                          onClick={() => onSecretSelect(secret)}
                          sx={{
                            textAlign: 'left',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {secret.Name}
                        </Link>
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell
                      sx={{
                        width: columnWidths.key,
                        minWidth: columnWidths.key,
                        maxWidth: columnWidths.key,
                      }}
                    >
                      <Typography
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {secret.Description}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell
                      sx={{
                        width: columnWidths.value,
                        minWidth: columnWidths.value,
                      }}
                    >
                      <Typography>
                        {secret.LastChangedDate?.toLocaleString()}
                      </Typography>
                    </StyledTableCell>
                  </>
                )}
              />
            </TableContainer>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ height: '100%', overflow: 'auto' }}
            >
              <TableVirtuoso
                style={{ height: '100%' }}
                data={searchResults}
                components={tableComponents}
                fixedHeaderContent={renderHeaderContent}
                itemContent={renderRowContent}
              />
            </TableContainer>
          )}
        </Box>
      </Paper>

      <BatchUpdateDialog
        open={isBatchUpdateOpen}
        onClose={() => setIsBatchUpdateOpen(false)}
        onUpdate={async (updates) => {
          await onBatchUpdate(updates);
          setSelectedResults([]);
          setIsBatchUpdateOpen(false);
        }}
        selectedSecrets={selectedResults.map(r => ({
          secret: r.secret,
          key: r.key,
          value: r.value
        }))}
      />

      <BatchAddDialog
        open={isBatchAddOpen}
        onClose={() => setIsBatchAddOpen(false)}
        onAdd={async (updates) => {
          await onBatchUpdate(updates);
          setSelectedResults([]);
          setIsBatchAddOpen(false);
        }}
        selectedSecrets={Array.from(
          new Set(selectedResults.map((r) => r.secret)),
        )}
      />
    </>
  );
}
