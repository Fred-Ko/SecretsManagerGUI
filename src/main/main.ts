import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'ini';
import { homedir } from 'os';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { resolveHtmlPath } from './util';
import MenuBuilder from './menu';

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

// AppUpdater 클래스 추가
class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// 디버그 및 확장 설치 관련 코드 추가
const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

// createWindow 함수 수정
const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

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
    // AWS 기본 자격 증명에서 읽기 시도
    const credentialsPath = path.join(homedir(), '.aws', 'credentials');
    const configPath = path.join(homedir(), '.aws', 'config');

    if (!existsSync(credentialsPath) || !existsSync(configPath)) {
      return null;
    }

    console.log('Credentials file path:', credentialsPath);
    console.log('Config file path:', configPath);

    const credentials = parse(readFileSync(credentialsPath, 'utf-8'));
    const config = parse(readFileSync(configPath, 'utf-8'));
    const profile = 'default';

    console.log('Parsed credentials:', credentials);
    console.log('Parsed config:', config);

    if (!credentials[profile]) {
      console.log('No default profile found in credentials');
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
