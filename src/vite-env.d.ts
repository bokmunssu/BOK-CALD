/// <reference types="vite/client" />

interface ElectronAPI {
  updater: { check: () => Promise<import('../electron/updater').UpdateStatus>; status: () => Promise<import('../electron/updater').UpdateStatus>; install: () => Promise<void>; subscribe: (callback: (value: import('../electron/updater').UpdateStatus) => void) => () => void };

  googleAccount: {
    info: () => Promise<{ configured: boolean; clientId: string; personal: boolean }>;
    configure: (value: { clientId: string; clientSecret: string }) => Promise<{ configured: boolean; clientId: string; personal: boolean }>;
    login: () => Promise<import('./types').GoogleCalendarAuth>; cancel: () => Promise<void>;
    auth: () => Promise<import('./types').GoogleCalendarAuth | null>; refresh: () => Promise<import('./types').GoogleCalendarAuth>; disconnect: () => Promise<void>;
  };
  system: { fonts: () => Promise<string[]>; windows: () => Promise<import('./utils/workspace').WindowChoice[]> };
  microsoftTodo: {
    configure: (id: string) => Promise<import('./types/microsoft').MicrosoftStatus>;
    status: () => Promise<import('./types/microsoft').MicrosoftStatus>;
    login: () => Promise<import('./types/microsoft').MicrosoftStatus>;
    cancel: () => Promise<void>;
    disconnect: () => Promise<import('./types/microsoft').MicrosoftStatus>;
    lists: () => Promise<import('./types/microsoft').MicrosoftList[]>;
    selectList: (id: string) => Promise<import('./types/microsoft').MicrosoftStatus>;
    createList: () => Promise<import('./types/microsoft').MicrosoftList>;
    autoSync: (value: boolean) => Promise<import('./types/microsoft').MicrosoftStatus>;
    sync: () => Promise<import('./types/microsoft').MicrosoftStatus>;
    subscribe: (callback: (value: import('./types/microsoft').MicrosoftStatus) => void) => () => void;
  };
  workTime: {
    get: () => Promise<import('./utils/worktime').WorkTimeSnapshot>;
    command: (command: 'start' | 'pause' | 'add' | 'remove' | 'rename', value?: Partial<import('./utils/worktime').WorkTarget>) => Promise<import('./utils/worktime').WorkTimeSnapshot>;
    subscribe: (callback: (value: import('./utils/worktime').WorkTimeSnapshot) => void) => () => void;
  };
  openWidget: (kind: import('./utils/workspace').WidgetKind, memoId?: string) => Promise<void>;
  openCalendar: () => Promise<void>;
  getPinned: () => Promise<boolean>;
  setPinned: (value: boolean) => Promise<boolean>;
    mergeItems: (key: string, previous: unknown[], next: unknown[]) => Promise<void>;
    patchItems: (key: string, patch: import('./utils/workspace').CollectionPatch) => Promise<void>;
    onStorePatched: (callback: (key: string, patch: import('./utils/workspace').CollectionPatch) => void) => () => void;
    onFlushEdits: (callback: () => Promise<void>) => () => void;
  onStoreChanged: (callback: (key: string, value: any) => void) => () => void;
  timer: {
    get: () => Promise<TimerSnapshot>;
    command: (command: 'start' | 'pause' | 'reset' | 'configure', value?: Partial<import('./utils/workspace').TimerState>) => Promise<TimerSnapshot>;
    capture: () => Promise<import('./utils/workspace').ForegroundWindow>;
    subscribe: (callback: (value: TimerSnapshot) => void) => () => void;
  };
  getAppPath: () => Promise<string>;
  resizeWindow: (
    width: number,
    height: number
  ) => Promise<{ width: number; height: number }>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  getPlatform: () => Promise<string>;
  onAppBeforeQuit: (callback: () => void) => void;
  removeAppBeforeQuitListener: (callback: () => void) => void;
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    has: (key: string) => Promise<boolean>;
  };
  showNotification: (options: {
    title: string;
    body: string;
    icon?: string;
    silent?: boolean;
  }) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
}

interface Window {
  electronAPI: ElectronAPI;
}

type TimerSnapshot = import('./utils/workspace').TimerState & { targetActive: boolean; focusSupported: boolean };
