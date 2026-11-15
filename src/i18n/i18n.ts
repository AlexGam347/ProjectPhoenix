// Textos de la interfaz. Para añadir inglés: strings.en.json y cambiar el idioma en Opciones.
import es from '../data/strings.es.json';

const dict: Record<string, string> = es as Record<string, string>;

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const s = dict[key] ?? key;
  return fill(s, vars);
}

export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
