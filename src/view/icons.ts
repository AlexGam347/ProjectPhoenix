// Iconos de recurso: forma propia (gota, O₂, hoja, rayo) además del color, para no depender solo del color.
import type { Res } from '../rules/types';
import { px } from './pixelIcons';

export const RES_COLOR: Record<Res, string> = { agua: '#5aa8f0', oxi: '#3cc6c1', com: '#6cc566', ene: '#f0b640' };
const RES_PX: Record<Res, string> = { agua: 'drop', oxi: 'o2', com: 'leaf', ene: 'bolt' };

export const resIcon = (r: Res, color = RES_COLOR[r]) => `<span class="ri" style="color:${color}">${px(RES_PX[r])}</span>`;

export const spillIcon = (r: Res) => `<span class="spill" style="color:${RES_COLOR[r]}">${px(RES_PX[r])}</span>`;

/** Objetos que no están dibujados en el boceto provisional (válvula, filtro de aire). */
export const FX_ICONS: Record<string, string> = {
  valve: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#c0392b" stroke-width="4"/><path d="M20 5v30M5 20h30M9.5 9.5l21 21M30.5 9.5l-21 21" stroke="#c0392b" stroke-width="3"/><circle cx="20" cy="20" r="5" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/></svg>',
  filter: '<svg viewBox="0 0 40 40"><rect x="5" y="6" width="30" height="28" fill="#8e9aa4" stroke="#2a333c" stroke-width="2"/><path d="M9 12h22M9 17h22M9 22h22M9 27h22" stroke="#4a545e" stroke-width="2.5"/></svg>',
};
