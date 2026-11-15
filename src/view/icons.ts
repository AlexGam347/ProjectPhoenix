// Iconos SVG en línea: cada recurso tiene forma propia, no solo color (accesibilidad).
import type { Res } from '../rules/types';

export const RES_COLOR: Record<Res, string> = { agua: '#5aa8f0', oxi: '#3cc6c1', com: '#6cc566', ene: '#f0b640' };

const ICONS: Record<Res, string> = {
  agua: '<path d="M12 2C9 7 5 10.5 5 14.5a7 7 0 0 0 14 0C19 10.5 15 7 12 2z" fill="currentColor"/>',
  oxi: '<circle cx="8" cy="12" r="5.2" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="16.5" cy="12" r="5.2" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  com: '<path d="M20 3C10 3 4 8 4 15c0 2 .6 3.6 1.6 5C7 13 12 9 16 8c-4 2.5-7.5 6-9 12.5 1 .3 2 .5 3 .5 7 0 11-6 10-18z" fill="currentColor"/>',
  ene: '<path d="M13.5 2L4 14h6.5L9 22l11-13h-7z" fill="currentColor"/>',
};

export const resIcon = (r: Res, color = RES_COLOR[r]) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" style="color:${color}">${ICONS[r]}</svg>`;

export const spillIcon = (r: Res) =>
  `<svg class="spill" viewBox="0 0 24 24" aria-hidden="true" style="color:${RES_COLOR[r]}">${ICONS[r]}</svg>`;

export const FX_ICONS: Record<string, string> = {
  valve: '<svg viewBox="0 0 40 40" class="icon-svg"><circle cx="20" cy="20" r="15" fill="none" stroke="#c0392b" stroke-width="4"/><path d="M20 5v30M5 20h30M9.5 9.5l21 21M30.5 9.5l-21 21" stroke="#c0392b" stroke-width="3"/><circle cx="20" cy="20" r="5" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/></svg>',
  filter: '<svg viewBox="0 0 40 40"><rect x="5" y="6" width="30" height="28" rx="3" fill="#8e9aa4" stroke="#2a333c" stroke-width="2"/><path d="M9 12h22M9 17h22M9 22h22M9 27h22" stroke="#4a545e" stroke-width="2.5"/></svg>',
};
