/// <reference types="vite/client" />

interface ElectronAPI {
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
