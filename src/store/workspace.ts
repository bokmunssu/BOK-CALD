import { atom } from 'recoil';
import { normalizeSettings, WorkspaceSettings } from '../utils/workspace';
import { sharedEffect } from './sharedEffect';

export const workspaceSettingsState = atom<WorkspaceSettings>({
  key: 'workspaceSettings', default: normalizeSettings(),
  effects: [sharedEffect('workspaceSettings', value => normalizeSettings(value ?? {}))],
});
