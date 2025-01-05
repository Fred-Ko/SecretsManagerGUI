import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
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
} from '@mui/material';
import { useState } from 'react';
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

const DRAWER_WIDTH = 300;

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

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
            width: DRAWER_WIDTH,
            border: 'none',
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
      await saveAwsCredentials(credentials);
      showAlert('AWS 자격 증명이 저장되었습니다.', 'success');
      loadSecrets();
    } catch (error) {
      showAlert('AWS 자격 증명 저장에 실패했습니다.', 'error');
    }
  };

  const handleSecretSelect = (secret: Secret) => {
    selectSecret(secret);
    setCurrentTab(0);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />
        <AppBar position="fixed">
          <Toolbar variant="dense">
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Secrets Manager
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

        <Drawer variant="permanent">
          <Toolbar variant="dense" />
          <Box sx={{ overflow: 'auto', width: DRAWER_WIDTH }}>
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                시크릿 목록
              </Typography>
              <IconButton size="small" onClick={startCreating}>
                <AddIcon />
              </IconButton>
            </Box>
            <Divider />
            <SecretList
              secrets={secrets}
              onSelect={selectSecret}
              onAdd={startCreating}
              onBulkSelect={bulkSelectSecrets}
              onDelete={openDeleteDialog}
            />
          </Box>
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 2,
            mt: '48px',
            ml: `${DRAWER_WIDTH}px`,
            backgroundColor: 'action.hover',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
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
              />
            </Box>
          )}

          <CreateSecret
            open={isCreating}
            onClose={stopCreating}
            onCreated={createSecret}
          />
        </Box>

        <AwsCredentialsDialog
          open={isAwsSettingsOpen}
          onClose={closeAwsSettings}
          onSave={handleSaveAwsCredentials}
          initialCredentials={awsCredentials || undefined}
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
    </ThemeProvider>
  );
}
