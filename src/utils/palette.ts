import type { Theme } from '../types';
const rgb = (hex: string) => { const h = hex.slice(1); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)); };
const hex = (values: number[]) => '#' + values.map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
export const mixColor = (a: string, b: string, weight: number) => hex(rgb(a).map((v,i) => v * (1-weight) + rgb(b)[i] * weight));
const luminance = (color: string) => rgb(color).map(v => v/255).reduce((sum,v,i) => sum + [0.2126,0.7152,0.0722][i] * (v <= .04045 ? v/12.92 : Math.pow((v+.055)/1.055,2.4)),0);
export const contrast = (a: string, b: string) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
export function recommendPalettes(base: string): { name: string; colors: Theme['colors'] }[] {
  if (!/^#[\da-f]{6}$/i.test(base)) return [];
  return [false,true].map(dark => {
    const surface = dark ? mixColor(base,'#15151b',.94) : '#ffffff';
    const background = dark ? mixColor(base,'#101017',.95) : mixColor(base,'#ffffff',.95);
    const text = dark ? '#f7f7fb' : '#24242c';
    let textSecondary = mixColor(text,surface,.35);
    if (contrast(textSecondary,surface) < 4.5) textSecondary = text;
    return { name: dark ? '차분한 다크' : '부드러운 라이트', colors: {
      primary: base, secondary: mixColor(base,dark ? '#ffffff' : '#333344',.22),
      accent: mixColor(base,surface,dark ? .75 : .85), background, surface, text, textSecondary,
      border: mixColor(base,surface,.70), danger: dark ? '#ff929f' : '#b83249',
      dangerLight: mixColor('#e35268',surface,.87),
    } };
  });
}
