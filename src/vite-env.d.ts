/// <reference types="vite/client" />

interface ElectronAPI {
  microsoftTodo: {
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
  googleOAuth: {
    start: () => Promise<{ success: boolean; code?: string; error?: string }>;
    stop: () => Promise<void>;
  };
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
}

interface Window {
  electronAPI: ElectronAPI;
}

type TimerSnapshot = import('./utils/workspace').TimerState & { targetActive: boolean; focusSupported: boolean };
