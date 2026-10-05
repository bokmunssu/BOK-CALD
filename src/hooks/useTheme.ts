import { useRecoilState, useRecoilValue } from 'recoil';
import { currentThemeState, customThemesState, predefinedThemes } from '@store/atoms';
import { Theme } from '@types';
import { useEffect, useCallback } from 'react';
import { resolveFont } from '../utils/localFonts';
import { workspaceSettingsState } from '../store/workspace';

export const useTheme = () => {
  const workspace = useRecoilValue(workspaceSettingsState);
  const [currentTheme, setCurrentTheme] = useRecoilState(currentThemeState);
  const [customThemes, setCustomThemes] = useRecoilState(customThemesState);

  const applyTheme = useCallback((theme: Theme) => {
    const root = document.documentElement;

    const colors = theme.colors;

    root.style.setProperty('--color-primary', colors.primary);
    const hex = colors.primary.replace('#', '');
    const rgb = hex.length === 3 ? hex.split('').map(c => parseInt(c + c, 16)) : [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const luminance = rgb.reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i] * (c / 255 <= 0.04045 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4)), 0);
    root.style.setProperty('--color-on-primary', luminance > 0.179 ? '#222222' : '#ffffff');
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-danger', colors.danger);
    root.style.setProperty('--color-danger-light', colors.dangerLight);

    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.text;
  }, []);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  useEffect(() => {
    let current = true;
    void resolveFont(workspace.fontFamily).then(font => { if (current) document.documentElement.style.setProperty('--app-font-family', font); });
    return () => { current = false; };
  }, [workspace.fontFamily]);

  const selectTheme = (themeId: string) => {
    const allThemes = [...predefinedThemes, ...customThemes];
    const theme = allThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  };

  const createCustomTheme = (theme: Theme) => {
    setCustomThemes(prev => [...prev, theme]);
    setCurrentTheme(theme);
  };

  const updateCustomTheme = (themeId: string, updates: Partial<Theme>) => {
    setCustomThemes(prev =>
      prev.map(theme =>
        theme.id === themeId ? { ...theme, ...updates } : theme
      )
    );
    if (currentTheme.id === themeId) setCurrentTheme(theme => ({ ...theme, ...updates }));
  };

  const deleteCustomTheme = (themeId: string) => {
    setCustomThemes(prev => prev.filter(theme => theme.id !== themeId));
    if (currentTheme.id === themeId) {
      setCurrentTheme(predefinedThemes[0]);
    }
  };

  // 실시간 미리보기를 위한 임시 테마 적용 함수
  const previewTheme = useCallback((colors: Theme['colors']) => {
    const tempTheme: Theme = {
      id: 'preview',
      name: 'Preview',
      colors
    };
    applyTheme(tempTheme);
  }, [applyTheme]);

  // 미리보기 종료 시 원래 테마로 복원
  const resetPreview = useCallback(() => {
    applyTheme(currentTheme);
  }, [applyTheme, currentTheme]);

  return {
    currentTheme,
    allThemes: [...predefinedThemes, ...customThemes],
    selectTheme,
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    previewTheme,
    resetPreview
  };
};
