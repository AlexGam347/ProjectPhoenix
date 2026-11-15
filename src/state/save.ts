// Guardado en localStorage, siempre envuelto en try/catch (modo privado, almacenamiento bloqueado…).
import type { Game } from './game';

const KEY = 'phoenix.save.v1';
const SETTINGS = 'phoenix.settings.v1';

export function save(g: Game) {
  try {
    // Una noche a medias se retoma desde su inicio.
    const phase = g.phase === 'report' ? 'night' : g.phase;
    const snap: Game = phase === 'night' ? { ...g, phase, base: g.preNight } : { ...g, phase };
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch { /* sin guardado */ }
}

export function load(): Game | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Game;
    if (g.version !== 1 || ['menu', 'ending', 'credits'].includes(g.phase)) return null;
    return g;
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
}

export interface Settings { volume: number; reduceFlash: boolean; bigText: boolean; lang: 'es' }
export const DEFAULT_SETTINGS: Settings = { volume: 0.7, reduceFlash: false, bigText: false, lang: 'es' };

export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS) || '{}');
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return { ...DEFAULT_SETTINGS, reduceFlash: reduce, ...s };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS, JSON.stringify(s)); } catch { /* nada */ }
}
