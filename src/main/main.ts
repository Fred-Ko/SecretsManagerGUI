import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'ini';
import { homedir } from 'os';
import path from 'path';

// 앱 설정 파일 경로
const APP_CONFIG_DIR = '.secrets-manager';
const AWS_CONFIG_FILE = 'aws-config.json';

function ensureConfigDir() {
  if (!existsSync(APP_CONFIG_DIR)) {
    mkdirSync(APP_CONFIG_DIR);
  }
}

function getAppConfigPath() {
  return path.join(APP_CONFIG_DIR, AWS_CONFIG_FILE);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 728,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:1212/');
  mainWindow.webContents.openDevTools();
}

app
  .whenReady()
  .then(() => {
    ensureConfigDir();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    return undefined;
  })
  .catch(console.error);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// AWS 자격 증명 처리
ipcMain.handle('get-aws-credentials', async () => {
  try {
    // 먼저 앱 설정 파일에서 읽기 시도
    const appConfigPath = getAppConfigPath();
    if (existsSync(appConfigPath)) {
      const appConfig = JSON.parse(readFileSync(appConfigPath, 'utf-8'));
      return appConfig;
    }

    // 앱 설정이 없으면 AWS 기본 자격 증명에서 읽기 시도
    const credentialsPath = path.join(homedir(), '.aws', 'credentials');
    const configPath = path.join(homedir(), '.aws', 'config');

    if (!existsSync(credentialsPath) || !existsSync(configPath)) {
      return null;
    }

    const credentials = parse(readFileSync(credentialsPath, 'utf-8'));
    const config = parse(readFileSync(configPath, 'utf-8'));
    const profile = 'default';

    if (!credentials[profile]) {
      return null;
    }

    return {
      accessKeyId: credentials[profile].aws_access_key_id,
      secretAccessKey: credentials[profile].aws_secret_access_key,
      region:
        config[`profile ${profile}`]?.region ||
        config.default?.region ||
        'ap-northeast-2',
      endpoint:
        config[`profile ${profile}`]?.endpoint || config.default?.endpoint,
    };
  } catch (error) {
    console.error('Failed to load AWS credentials:', error);
    return null;
  }
});

// AWS 자격 증명 저장
ipcMain.handle('save-aws-credentials', async (_, credentials) => {
  try {
    ensureConfigDir();
    const appConfigPath = getAppConfigPath();
    writeFileSync(appConfigPath, JSON.stringify(credentials, null, 2));
  } catch (error) {
    console.error('Failed to save AWS credentials:', error);
    throw new Error('AWS 자격 증명을 저장하는데 실패했습니다.');
  }
});
