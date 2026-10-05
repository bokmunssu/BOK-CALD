import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  system: { fonts: () => ipcRenderer.invoke('system-fonts'), windows: () => ipcRenderer.invoke('system-windows') },
  microsoftTodo: {
    status: () => ipcRenderer.invoke('microsoft-status'),
    configure: (id: string) => ipcRenderer.invoke('microsoft-configure', id),
    login: () => ipcRenderer.invoke('microsoft-login'),
    cancel: () => ipcRenderer.invoke('microsoft-cancel'),
    disconnect: () => ipcRenderer.invoke('microsoft-disconnect'),
    lists: () => ipcRenderer.invoke('microsoft-lists'),
    selectList: (id: string) => ipcRenderer.invoke('microsoft-select', id),
    createList: () => ipcRenderer.invoke('microsoft-create-list'),
    autoSync: (value: boolean) => ipcRenderer.invoke('microsoft-auto', value),
    sync: () => ipcRenderer.invoke('microsoft-sync'),
    subscribe: (callback: (value: unknown) => void) => {
      const listener = (_: unknown, value: unknown) => callback(value);
      ipcRenderer.on('microsoft-changed', listener);
      return () => ipcRenderer.removeListener('microsoft-changed', listener);
    },
  },
  openWidget: (kind: string, memoId?: string) => ipcRenderer.invoke('widget-open', kind, memoId),
  openCalendar: () => ipcRenderer.invoke('calendar-open'),
  getPinned: () => ipcRenderer.invoke('window-pinned'),
  setPinned: (value: boolean) => ipcRenderer.invoke('window-pin', value),
  mergeItems: (key: string, previous: unknown[], next: unknown[]) => ipcRenderer.invoke('store-merge-items', key, previous, next),
  onStoreChanged: (callback: (key: string, value: unknown) => void) => {
    const listener = (_: unknown, key: string, value: unknown) => callback(key, value);
    ipcRenderer.on('store-changed', listener);
    return () => ipcRenderer.removeListener('store-changed', listener);
  },
  timer: {
    get: () => ipcRenderer.invoke('timer-get'),
    command: (command: string, value?: unknown) => ipcRenderer.invoke('timer-command', command, value),
    capture: () => ipcRenderer.invoke('focus-capture'),
    subscribe: (callback: (value: unknown) => void) => {
      const listener = (_: unknown, value: unknown) => callback(value);
      ipcRenderer.on('timer-changed', listener);
      return () => ipcRenderer.removeListener('timer-changed', listener);
    },
  },
  workTime: {
    get: () => ipcRenderer.invoke('worktime-get'),
    command: (command: string, value?: unknown) => ipcRenderer.invoke('worktime-command', command, value),
    subscribe: (callback: (value: unknown) => void) => {
      const listener = (_: unknown, value: unknown) => callback(value);
      ipcRenderer.on('worktime-changed', listener);
      return () => ipcRenderer.removeListener('worktime-changed', listener);
    },
  },
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  resizeWindow: (width: number, height: number) =>
    ipcRenderer.invoke("resize-window", width, height),

  // 윈도우 컨트롤
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  maximizeWindow: () => ipcRenderer.invoke("maximize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  isMaximized: () => ipcRenderer.invoke("is-maximized"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),

  // 앱 종료 전 이벤트 리스너
  onAppBeforeQuit: (callback: () => void) =>
    ipcRenderer.on("app-before-quit", callback),
  removeAppBeforeQuitListener: (callback: () => void) =>
    ipcRenderer.removeListener("app-before-quit", callback),

  store: {
    get: (key: string) => ipcRenderer.invoke("store-get", key),
    set: (key: string, value: any) =>
      ipcRenderer.invoke("store-set", key, value),
    delete: (key: string) => ipcRenderer.invoke("store-delete", key),
    clear: () => ipcRenderer.invoke("store-clear"),
    has: (key: string) => ipcRenderer.invoke("store-has", key),
  },

  // Notification API
  showNotification: (options: {
    title: string;
    body: string;
    icon?: string;
    silent?: boolean;
  }) => ipcRenderer.invoke("show-notification", options),

  googleAccount: {
    info: () => ipcRenderer.invoke('google-account-info'), configure: (value: unknown) => ipcRenderer.invoke('google-account-configure', value),
    login: () => ipcRenderer.invoke('google-account-login'), cancel: () => ipcRenderer.invoke('google-account-cancel'), auth: () => ipcRenderer.invoke('google-account-auth'),
    refresh: () => ipcRenderer.invoke('google-account-refresh'), disconnect: () => ipcRenderer.invoke('google-account-disconnect'),
  },
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),

  // 앱 버전 가져오기
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
});
