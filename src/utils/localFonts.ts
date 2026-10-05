interface LocalFont { family: string; fullName: string; postscriptName: string; style: string; blob(): Promise<Blob> }
let flight: Promise<LocalFont[]> | undefined;
let aliasSequence = 0;
const loaded = new Map<string, Promise<string>>();
export function localFonts(refresh = false): Promise<LocalFont[]> {
  const query = (window as unknown as { queryLocalFonts?: () => Promise<LocalFont[]> }).queryLocalFonts;
  if (!query) return Promise.resolve([]);
  if (refresh) flight = undefined;
  return flight ??= query.call(window).catch(error => { flight = undefined; throw error; });
}
export async function installedFonts(refresh = false): Promise<string[]> {
  try {
    const fonts = await localFonts(refresh);
    if (fonts.length) return [...new Set(fonts.map(f => f.family))].sort((a,b) => a.localeCompare(b));
  } catch { /* Older systems can still resolve CSS local family names. */ }
  return window.electronAPI.system.fonts();
}
export async function loadInstalledFace(font: LocalFont, alias: string): Promise<FontFace> {
  // Native loading supports legacy Windows fonts and TTC collections which
  // Chromium's downloadable-font sanitizer may reject as raw binary blobs.
  try {
    return await new FontFace(alias, `local(${JSON.stringify(font.fullName)}), local(${JSON.stringify(font.postscriptName)})`).load();
  } catch {
    return new FontFace(alias, await (await font.blob()).arrayBuffer()).load();
  }
}
export function resolveFont(family: string): Promise<string> {
  if (!family) return Promise.resolve('system-ui, "Malgun Gothic", sans-serif');
  if (!loaded.has(family)) { const alias = `TomoInstalled${++aliasSequence}`; loaded.set(family, (async () => {
    const fonts = await localFonts().catch(() => []);
    const candidates = fonts.filter(f => [f.family, f.fullName, f.postscriptName].some(n => n.toLocaleLowerCase() === family.toLocaleLowerCase()));
    const selected = candidates.find(f => /regular|normal|보통/i.test(f.style)) || candidates[0];
    if (selected) {
      document.fonts.add(await loadInstalledFace(selected, alias));
      return `"${alias}", "Malgun Gothic", system-ui, sans-serif`;
    }
    return `${JSON.stringify(family)}, "Malgun Gothic", system-ui, sans-serif`;
  })().catch(() => `${JSON.stringify(family)}, "Malgun Gothic", system-ui, sans-serif`)); }
  return loaded.get(family)!;
}
