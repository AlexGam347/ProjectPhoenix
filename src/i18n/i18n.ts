// Textos de la interfaz (inglés).
import en from '../data/strings.en.json';

const dict: Record<string, string> = en as Record<string, string>;

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const s = dict[key] ?? key;
  return fill(s, vars);
}

export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
