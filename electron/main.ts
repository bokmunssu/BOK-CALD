import { app, BrowserWindow, ipcMain, Notification, shell, session, protocol, net } from "electron";
import { pathToFileURL } from 'node:url';
import { ImageAssets } from './imageAssets';
import { guardEditFlush } from './editFlush';
import path from "path";
import os from "os";
import Store from "electron-store";
import { registerUpdater } from './updater';
import { registerGoogleAccount } from './googleAccount';
import { registerGoogleTasks } from './googleTasks';
import { registerSystemPreferences } from './systemPreferences';
import { registerWidgets } from './widgets';
import { mergeItems, applyCollectionPatch, type CollectionPatch } from '../src/utils/workspace';

// Tests use a separate directory; never touch the user's real calendar data.
app.setName('TOMO CALENDAR');
app.setPath('userData', process.env.TOMO_TEST_USER_DATA || process.env.BOK_CALD_TEST_USER_DATA || path.join(app.getPath('appData'), 'TOMO CALENDAR'));
app.setAppUserModelId('io.github.bokmunssu.tomo.calendar');
// Electron Store 초기화
const store = new Store();
const images = new ImageAssets(path.join(app.getPath('userData'), 'images'));
protocol.registerSchemesAsPrivileged([{ scheme: 'tomo-image', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
// One-time migration keeps image bytes out of every later synchronous config write.
const savedConfig = store.store;
const compactConfig = images.externalize(savedConfig) as typeof savedConfig;
if (images.converted) store.store = compactConfig;

let mainWindow: BrowserWindow | null = null;

// 런타임 에러 디버깅을 위한 핸들러 추가
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  console.error("Stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
});

function createWindow() {
  // macOS 특정 설정
  const isMac = process.platform === "darwin";
  const isWindows = process.platform === "win32";

  // 저장된 창 상태 복원
  const savedWindowState = store.get("windowState") as any;
  const defaultBounds = {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
  };

  const windowState = savedWindowState
    ? {
        width: Math.max(savedWindowState.width || defaultBounds.width, 760),
        height: Math.max(savedWindowState.height || defaultBounds.height, 480),
        x: savedWindowState.x,
        y: savedWindowState.y,
      }
    : defaultBounds;

  mainWindow = new BrowserWindow({
    ...windowState,
    title: "TOMO CALENDAR",
    alwaysOnTop: store.get('calendarPinned') === true,
    minWidth: 760,
    minHeight: 480,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // 폰트 렌더링 최적화
      webgl: true,
      experimentalFeatures: true,
    },
    // Windows에서는 menu hide, macOS에서는 hidden 사용
    ...(isWindows ? { frame:true, autoHideMenuBar: true  } : { titleBarStyle: "hidden" }),
    // macOS에서 트래픽 라이트 버튼 위치 조정
    ...(isMac ? { trafficLightPosition: { x: 15, y: 13 } } : {}),
    backgroundColor: "#faf8f5",
    show: false,
  });

  guardEditFlush(mainWindow);
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      // 저장된 창 상태 복원
      if (savedWindowState) {
        if (savedWindowState.isMaximized) {
          mainWindow.maximize();
        }
        if (savedWindowState.isFullScreen) {
          mainWindow.setFullScreen(true);
        }
      }
      mainWindow.show();
    }
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // Production: dist-electron과 dist는 같은 레벨에 위치
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 앱 종료 전에 현재 상태 저장 요청
  mainWindow.on("close", (e) => {
    if (mainWindow) {
      // 현재 창 상태 저장
      const bounds = mainWindow.getBounds();
      store.set("windowState", {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: mainWindow.isMaximized(),
        isFullScreen: mainWindow.isFullScreen(),
      });

      mainWindow.webContents.send("app-before-quit");
    }
  });
}

app.whenReady().then(() => {
  protocol.handle('tomo-image', request => { const file = images.resolve(request.url); return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 }); });
  const trustedPage = (url: string) => url.startsWith('file:') || url.startsWith('http://localhost:5173/');
  session.defaultSession.setPermissionCheckHandler((contents, permission) => String(permission) === 'local-fonts' && !!contents && trustedPage(contents.getURL()));
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(String(permission) === 'local-fonts' && trustedPage(contents.getURL())));
  registerUpdater();
  registerGoogleAccount();
  registerSystemPreferences();
  registerGoogleTasks(store, broadcastStore);
  registerWidgets(store, () => {
    if (!mainWindow) createWindow();
    else { mainWindow.show(); mainWindow.restore(); mainWindow.focus(); }
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Store API handlers
ipcMain.handle("store-get", (_, key: string) => {
  return store.get(key);
});

ipcMain.handle("store-set", (event, key: string, value: any) => {
  value = images.externalize(value);
  store.set(key, value);
  broadcastStore(key, value, event.sender.id);
});

ipcMain.handle('store-patch-items', (event, key: string, value: CollectionPatch) => {
  if (!['todos', 'memos', 'dDays'].includes(key) || !value || !Array.isArray(value.updates) || !Array.isArray(value.deleted)
    || value.deleted.some(id => typeof id !== 'string') || value.updates.some(item => !item || typeof item.id !== 'string' || !item.fields || !Array.isArray(item.unset))) throw new Error('Invalid collection patch');
  const patch = images.externalize(value) as CollectionPatch;
  const merged = applyCollectionPatch((store.get(key) as { id: string }[]) || [], patch);
  store.set(key, merged);
  for (const win of BrowserWindow.getAllWindows()) if (win.webContents.id !== event.sender.id) win.webContents.send('store-patched', key, patch);
});

function broadcastStore(key: string, value: unknown, senderId?: number) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents.id !== senderId) win.webContents.send('store-changed', key, value);
  }
}
ipcMain.handle('store-merge-items', (event, key: string, previous: { id: string }[], next: { id: string }[]) => {
  if (!['todos', 'memos', 'dDays'].includes(key) || !Array.isArray(previous) || !Array.isArray(next)
    || [...previous, ...next].some(item => !item || typeof item.id !== 'string')) throw new Error('Invalid collection');
  const merged = images.externalize(mergeItems((store.get(key) as { id: string }[]) || [], previous, next));
  store.set(key, merged);
  broadcastStore(key, merged, event.sender.id);
});

ipcMain.handle("store-delete", (_, key: string) => {
  store.delete(key);
  broadcastStore(key, null);
});

ipcMain.handle("store-clear", () => {
  store.clear();
});

ipcMain.handle("store-has", (_, key: string) => {
  return store.has(key);
});

ipcMain.handle("get-app-path", () => {
  return app.getPath("userData");
});

// Window control handlers
ipcMain.handle("minimize-window", event => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("close-window", event => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("is-maximized", () => {
  if (mainWindow) {
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle("get-platform", () => {
  return process.platform;
});

// Notification handler with error handling
ipcMain.handle(
  "show-notification",
  async (
    _,
    options: {
      title: string;
      body: string;
      icon?: string;
      silent?: boolean;
    }
  ) => {
    try {
      if (!Notification.isSupported()) {
        console.log("Notifications not supported on this system");
        return false;
      }

      // Create notification with platform-specific handling
      const notificationOptions: Electron.NotificationConstructorOptions = {
        title: options.title,
        body: options.body,
        silent: options.silent || false,
      };

      // Add icon only if provided and valid
      if (options.icon) {
        notificationOptions.icon = options.icon;
      }

      const notification = new Notification(notificationOptions);

      // Show notification
      notification.show();

      // Handle click event
      notification.on("click", () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();
        }
      });

      // Handle errors
      notification.on("failed", (event, error) => {
        console.error("Notification failed:", error);
      });

      return true;
    } catch (error) {
      console.error("Error showing notification:", error);
      return false;
    }
  }
);

// Window resize API handler
ipcMain.handle("resize-window", (_, width: number, height: number) => {
  if (mainWindow) {
    const currentBounds = mainWindow.getBounds();

    // 화면 중앙에 위치하도록 x, y 좌표 계산
    const { screen } = require("electron");
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    const x = Math.round((screenWidth - width) / 2);
    const y = Math.round((screenHeight - height) / 2);

    // 최소/최대 크기 제한 확인
    const minWidth = 760;
    const minHeight = 480;
    const maxWidth = primaryDisplay.bounds.width;
    const maxHeight = primaryDisplay.bounds.height;

    const finalWidth = Math.max(minWidth, Math.min(width, maxWidth));
    const finalHeight = Math.max(minHeight, Math.min(height, maxHeight));

    mainWindow.setBounds(
      {
        x,
        y,
        width: finalWidth,
        height: finalHeight,
      },
      true
    );

    return { width: finalWidth, height: finalHeight };
  }

  throw new Error("Main window is not available");
});

ipcMain.handle("open-external", (_, url: string) => {
  return shell.openExternal(url);
});

// 앱 버전 가져오기 (package.json에서)
ipcMain.handle("get-app-version", () => app.getVersion());
