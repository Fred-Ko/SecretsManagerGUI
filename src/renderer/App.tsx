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

const DRAWER_WIDTH = 300;

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [currentSearchText, setCurrentSearchText] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const handleDrawerResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(250, Math.min(600, e.clientX));
    setDrawerWidth(newWidth);
  }, [isResizing]);

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

  const { alertMessage, alertSeverity, isAlertOpen, showAlert, hideAlert } =
    useAlert();

  const {
    awsCredentials,
    isAwsSettingsOpen,
    openAwsSettings,
    closeAwsSettings,
    saveAwsCredentials,
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

  const handleSaveAwsCredentials = async (credentials: AwsCredentials) => {
    try {
      await saveAwsCredentials(credentials, () => {
        showAlert('AWS 자격 증명이 저장되었습니다.', 'success');
        loadSecrets();
      });
    } catch (error) {
      showAlert('AWS 자격 증명 저장에 실패했습니다.', 'error');
    }
  };

  const handleSecretSelect = (secret: Secret) => {
    selectSecret(secret);
    setCurrentTab(0);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && currentSearchText.trim()) {
      event.preventDefault();
      setSearchTerms([...searchTerms, currentSearchText.trim()]);
      setCurrentSearchText('');
    } else if (event.key === 'Backspace' && !currentSearchText && searchTerms.length > 0) {
      // 입력창이 비어있을 때 백스페이스를 누르면 마지막 검색어 제거
      event.preventDefault();
      setSearchTerms(searchTerms.slice(0, -1));
    }
  };

  const handleRemoveSearchTerm = (termToRemove: string) => {
    setSearchTerms(searchTerms.filter(term => term !== termToRemove));
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
              <IconButton color="inherit" onClick={openAwsSettings}>
                <SettingsIcon />
              </IconButton>
              <IconButton
                color="inherit"
                onClick={loadSecrets}
                disabled={isLoading}
              >
                <RefreshIcon />
              </IconButton>
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
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                시크릿 목록
              </Typography>
              <IconButton size="small" onClick={startCreating}>
                <AddIcon />
              </IconButton>
            </Box>

            <Box sx={{ px: 1, py: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={currentSearchText}
                placeholder={searchTerms.length ? "" : "검색어 입력 후 Enter..."}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                onChange={(e) => setCurrentSearchText(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {searchTerms.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flexGrow: 1 }}>
                    {searchTerms.map((term, index) => (
                      <Chip
                        key={index}
                        label={term}
                        size="small"
                        onDelete={() => handleRemoveSearchTerm(term)}
                      />
                    ))}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerms([])}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <SecretList
                secrets={secrets}
                onSelect={selectSecret}
                onAdd={startCreating}
                onBulkSelect={bulkSelectSecrets}
                onDelete={openDeleteDialog}
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
                  onChange={(_, newValue) => setCurrentTab(newValue)}
                >
                  <Tab label="상세 정보" />
                  <Tab label="검색" />
                  <Tab label="일괄 추가" />
                </Tabs>
              </Box>

              {currentTab === 0 && (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {selectedSecret && !isEditing && (
                    <SecretDetail secret={selectedSecret} onEdit={startEditing} />
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
