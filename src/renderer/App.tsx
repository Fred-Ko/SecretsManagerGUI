import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import {
  Alert,
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Snackbar,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import { useState, useCallback, useEffect } from 'react';
import { Secret } from '../main/interfaces/SecretManager';
import AwsCredentialsDialog from './components/AwsCredentialsDialog';
import BatchUpdateDialog from './components/BatchUpdateDialog';
import CreateSecret from './components/CreateSecret';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import SecretDetail from './components/SecretDetail';
import SecretEdit from './components/SecretEdit';
import SecretList from './components/SecretList';
import SecretSearchResult from './components/SecretSearchResult';
import { useAlert } from './hooks/useAlert';
import { useAwsCredentials } from './hooks/useAwsCredentials';
import { useSecrets } from './hooks/useSecrets';
import { AwsCredentials } from './utils/aws';
import { SnackbarProvider } from 'notistack';
import { useNavigationStack } from './hooks/useNavigationStack';

const DRAWER_WIDTH = 300;

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const { alertMessage, alertSeverity, isAlertOpen, showAlert, hideAlert } =
    useAlert();

  const {
    awsCredentials,
    isAwsSettingsOpen,
    openAwsSettings,
    closeAwsSettings,
    setCredentials,
  } = useAwsCredentials();

  const {
    secrets,
    selectedSecret,
    selectedSecrets,
    isLoading,
    isDetailOpen,
    isEditing,
    isCreating,
    isDeleteDialogOpen,
    loadSecrets,
    selectSecret,
    bulkSelectSecrets,
    updateSecret,
    createSecret,
    deleteSecrets,
    batchUpdateSecrets,
    closeDetail,
    startEditing,
    stopEditing,
    startCreating,
    stopCreating,
    openDeleteDialog,
    closeDeleteDialog,
  } = useSecrets({
    awsCredentials,
    onError: (message) => showAlert(message, 'error'),
    onSuccess: (message) => showAlert(message, 'success'),
  });

  const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [previousTab, setPreviousTab] = useState<number | null>(null);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [currentSearchText, setCurrentSearchText] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const navigation = useNavigationStack();

  const handleStateChange = useCallback(
    (type: string, data?: any) => {
      navigation.push({ type, data });
    },
    [navigation],
  );

  const handleBackButton = useCallback(() => {
    const lastState = navigation.pop();
    if (!lastState) return;

    switch (lastState.type) {
      case 'EDIT':
        stopEditing();
        break;
      case 'DETAIL':
        closeDetail();
        if (lastState.data?.previousTab !== undefined) {
          setCurrentTab(lastState.data.previousTab);
        }
        break;
      case 'SETTINGS':
        closeAwsSettings();
        break;
      case 'CREATE':
        stopCreating();
        break;
      case 'BATCH_UPDATE':
        setIsBatchUpdateOpen(false);
        break;
      case 'DELETE':
        closeDeleteDialog();
        break;
      case 'TAB':
        if (lastState.data?.tab !== undefined) {
          setCurrentTab(lastState.data.tab);
        }
        break;
      case 'SEARCH_TERM':
        setSearchTerms((prev) => prev.slice(0, -1));
        break;
    }
  }, [
    navigation,
    stopEditing,
    closeDetail,
    closeAwsSettings,
    stopCreating,
    closeDeleteDialog,
  ]);

  const handleTabChange = (newTab: number) => {
    handleStateChange('TAB', { tab: currentTab });
    setCurrentTab(newTab);
  };

  const handleSecretSelect = (secret: Secret) => {
    handleStateChange('DETAIL', { previousTab: currentTab });
    selectSecret(secret);
    setCurrentTab(0);
  };

  const handleStartEditing = () => {
    handleStateChange('EDIT');
    startEditing();
  };

  const handleOpenSettings = () => {
    handleStateChange('SETTINGS');
    openAwsSettings();
  };

  const handleStartCreating = () => {
    handleStateChange('CREATE');
    startCreating();
  };

  const handleSearchTermAdd = (term: string) => {
    handleStateChange('SEARCH_TERM');
    setSearchTerms((prev) => [...prev, term]);
  };

  useEffect(() => {
    const handleMouseBack = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        handleBackButton();
      }
    };

    window.addEventListener('mouseup', handleMouseBack);

    // 트랙패드 제스처 이벤트 리스너
    const unsubscribe = window.electron?.onNavigateBack?.(() => {
      handleBackButton();
    });

    return () => {
      window.removeEventListener('mouseup', handleMouseBack);
      if (unsubscribe) unsubscribe();
    };
  }, [handleBackButton]);

  const handleDrawerResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(600, e.clientX));
      setDrawerWidth(newWidth);
    },
    [isResizing],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleDrawerResize);
      window.addEventListener('mouseup', () => setIsResizing(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleDrawerResize);
      window.removeEventListener('mouseup', () => setIsResizing(false));
    };
  }, [isResizing, handleDrawerResize]);

  const theme = createTheme({
    palette: {
      mode: prefersDarkMode ? 'dark' : 'light',
      primary: {
        main: '#007ACC',
      },
    },
    components: {
      MuiDrawer: {
        styleOverrides: {
          paper: {
            width: drawerWidth,
            border: 'none',
            position: 'relative',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            zIndex: 1300,
          },
        },
      },
    },
  });

  const handleSaveAwsCredentials = (credentials: AwsCredentials) => {
    // 필수 필드 검증
    if (
      !credentials.accessKeyId ||
      !credentials.secretAccessKey ||
      !credentials.region
    ) {
      showAlert('필수 필드가 누락되었습니다.', 'error');
      return;
    }

    // 자격 증명 설정
    setCredentials(credentials);
    showAlert('AWS 자격 증명이 설정되었습니다.', 'success');
    loadSecrets();
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter' && currentSearchText.trim()) {
      event.preventDefault();
      setSearchTerms([...searchTerms, currentSearchText.trim()]);
      setCurrentSearchText('');
    } else if (
      event.key === 'Backspace' &&
      !currentSearchText &&
      searchTerms.length > 0
    ) {
      // 입력창이 비어있을 때 백스페이스를 누르면 마지막 검색어 제거
      event.preventDefault();
      setSearchTerms(searchTerms.slice(0, -1));
    }
  };

  const handleRemoveSearchTerm = (termToRemove: string) => {
    setSearchTerms(searchTerms.filter((term) => term !== termToRemove));
  };

  // 자동 리프레시 설정
  useEffect(() => {
    if (autoRefreshInterval === null) return;

    const interval = setInterval(() => {
      loadSecrets();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, loadSecrets]);

  const handleRefreshMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleRefreshMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAutoRefreshChange = (interval: number | null) => {
    setAutoRefreshInterval(interval);
    handleRefreshMenuClose();
  };

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <CssBaseline />
          <AppBar position="fixed" elevation={0}>
            <Toolbar variant="dense">
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Secrets Manager GUI
              </Typography>
              <IconButton color="inherit" onClick={handleOpenSettings}>
                <SettingsIcon />
              </IconButton>
              <Box sx={{ position: 'relative' }}>
                <IconButton
                  color="inherit"
                  onClick={loadSecrets}
                  disabled={isLoading}
                  sx={{ mr: 0.5 }}
                >
                  <RefreshIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={handleRefreshMenuClick}
                  sx={{
                    position: 'absolute',
                    right: -8,
                    bottom: -8,
                    width: 20,
                    height: 20,
                    bgcolor: autoRefreshInterval ? 'primary.main' : 'transparent',
                    '&:hover': {
                      bgcolor: autoRefreshInterval ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    {autoRefreshInterval ? `${autoRefreshInterval}s` : '⌵'}
                  </Typography>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleRefreshMenuClose}
                >
                  <MenuItem
                    onClick={() => handleAutoRefreshChange(null)}
                    selected={autoRefreshInterval === null}
                  >
                    사용 안함
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleAutoRefreshChange(3)}
                    selected={autoRefreshInterval === 3}
                  >
                    3초
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleAutoRefreshChange(5)}
                    selected={autoRefreshInterval === 5}
                  >
                    5초
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleAutoRefreshChange(10)}
                    selected={autoRefreshInterval === 10}
                  >
                    10초
                  </MenuItem>
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              height: '100vh',
              position: 'relative',
              bgcolor: 'background.paper',
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              transition: isResizing ? 'none' : 'width 0.2s',
            }}
          >
            <Toolbar variant="dense" />
            <Box
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  p: 1,
                  flex: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <SearchIcon fontSize="small" color="action" />
                <Box
                  sx={{
                    position: 'relative',
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="시크릿 이름 검색..."
                    value={currentSearchText}
                    onChange={(e) => setCurrentSearchText(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    variant="standard"
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      '& .MuiInput-root': {
                        fontSize: '0.875rem',
                        '&:before, &:after': { display: 'none' },
                      },
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      flexGrow: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {searchTerms.map((term, index) => (
                      <Chip
                        key={index}
                        label={term}
                        size="small"
                        onDelete={() => handleRemoveSearchTerm(term)}
                        sx={{
                          height: 24,
                          flexShrink: 0,
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
                          '& .MuiChip-deleteIcon': { fontSize: '0.75rem' },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
                {searchTerms.length > 0 && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerms([])}
                    sx={{
                      p: 0.5,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <IconButton
                size="small"
                onClick={handleStartCreating}
                sx={{
                  flexShrink: 0,
                  bgcolor: 'background.default',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: 'auto', mt: 1 }}>
              <SecretList
                secrets={secrets}
                onSelect={handleSecretSelect}
                onAdd={handleStartCreating}
                onBulkSelect={bulkSelectSecrets}
                searchTerms={searchTerms}
              />
            </Box>

            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 4,
                height: '100%',
                cursor: 'col-resize',
                bgcolor: 'divider',
                transition: 'background-color 0.2s',
                '&:hover': {
                  bgcolor: 'primary.main',
                },
                zIndex: 1,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
            />
          </Box>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: isResizing ? 'none' : 'margin 0.2s',
            }}
          >
            <Toolbar variant="dense" />
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: 'action.hover',
                p: 2,
              }}
            >
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  mb: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Tabs
                  value={currentTab}
                  onChange={(_, newValue) => handleTabChange(newValue)}
                >
                  <Tab label="상세 정보" />
                  <Tab label="검색" />
                  <Tab label="일괄 추가" />
                </Tabs>
              </Box>

              {currentTab === 0 && (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {selectedSecret && !isEditing && (
                    <SecretDetail
                      secret={selectedSecret}
                      onEdit={handleStartEditing}
                    />
                  )}
                  {selectedSecret && isEditing && (
                    <SecretEdit
                      secret={selectedSecret}
                      onSave={updateSecret}
                      onClose={stopEditing}
                    />
                  )}
                </Box>
              )}

              {currentTab === 1 && (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <SecretSearchResult
                    secrets={secrets}
                    onSecretSelect={handleSecretSelect}
                    onBatchUpdate={batchUpdateSecrets}
                    mode="search"
                  />
                </Box>
              )}

              {currentTab === 2 && (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <SecretSearchResult
                    secrets={secrets}
                    onSecretSelect={handleSecretSelect}
                    onBatchUpdate={batchUpdateSecrets}
                    mode="batch-add"
                  />
                </Box>
              )}

              <CreateSecret
                open={isCreating}
                onClose={stopCreating}
                onCreated={createSecret}
              />
            </Box>
          </Box>

          <AwsCredentialsDialog
            open={isAwsSettingsOpen}
            onClose={closeAwsSettings}
            onSave={handleSaveAwsCredentials}
            initialCredentials={awsCredentials || undefined}
            onLoadFromFile={async () => {
              try {
                const credentials = await window.electron.getAwsCredentials();
                if (credentials) {
                  return credentials;
                } else {
                  showAlert('AWS 자격 증명 파일을 찾을 수 없습니다.', 'error');
                }
              } catch (error) {
                showAlert('AWS 자격 증명을 불러오는데 실패했습니다.', 'error');
              }
              return null;
            }}
          />
          <Snackbar
            open={isAlertOpen}
            autoHideDuration={6000}
            onClose={hideAlert}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={hideAlert}
              severity={alertSeverity}
              sx={{ width: '100%' }}
              variant="filled"
            >
              {alertMessage}
            </Alert>
          </Snackbar>
          <DeleteConfirmDialog
            open={isDeleteDialogOpen}
            onClose={closeDeleteDialog}
            onConfirm={deleteSecrets}
            count={selectedSecrets.length}
          />
          <BatchUpdateDialog
            open={isBatchUpdateOpen}
            onClose={() => setIsBatchUpdateOpen(false)}
            onUpdate={batchUpdateSecrets}
            selectedSecrets={selectedSecrets}
          />
        </Box>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
