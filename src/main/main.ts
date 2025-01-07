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
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) return;

    mainWindow.setTouchBar(null);
    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow) return;
      mainWindow.webContents.executeJavaScript(`
        navigator.maxTouchPoints = 5;
      `);
    });
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

  if (process.platform === 'darwin') {
    mainWindow.on('swipe', (e, direction) => {
      if (!mainWindow) return;
      if (direction === 'right') {
        mainWindow.webContents.send('navigate-back');
      }
    });
  }
};

app
  .whenReady()
  .then(() => {
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
