// Miniatura de cada mejora: render de Blender (UPG_{id}) si existe en el manifiesto; si no, icono SVG.
import type { Res, Upgrade } from '../../rules/types';
import { RES_COLOR, resIcon } from '../icons';
import { px } from '../pixelIcons';
import type { Manifest } from '../room/roomView';

const TYPE_SHAPE: Record<Upgrade['type'], (c: string) => string> = {
  // Almacén: depósito
  C: (c) => `<rect x="18" y="10" width="28" height="44" rx="8" fill="none" stroke="${c}" stroke-width="3"/><path d="M18 24h28M18 40h28" stroke="${c}" stroke-width="2" opacity=".6"/>`,
  // Máquina: engranaje
  P: (c) => `<circle cx="32" cy="32" r="12" fill="none" stroke="${c}" stroke-width="3"/>${Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4, x1 = 32 + Math.cos(a) * 14, y1 = 32 + Math.sin(a) * 14, x2 = 32 + Math.cos(a) * 21, y2 = 32 + Math.sin(a) * 21;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  }).join('')}`,
  // Protección: escudo
  Pr: (c) => `<path d="M32 8l20 8v14c0 13-9 22-20 26-11-4-20-13-20-26V16z" fill="none" stroke="${c}" stroke-width="3"/>`,
};

export const LEVEL: Record<string, number> = {};
export function level(u: Upgrade) { return Number(u.id.slice(-1)) || 1; }

export function upgradeRes(u: Upgrade): Res | null {
  const p = u.cap ?? u.prod;
  if (p) return Object.keys(p)[0] as Res;
  if (u.nuc || u.flag === 'robot') return 'ene';
  return null;
}

export function upgradeArt(u: Upgrade, manifest: Manifest | null, size = 'md'): string {
  const img = manifest?.images[`UPG_${u.id}`];
  if (img) return `<img class="thumb ${size}" src="${img.src}" alt="">`;
  const r = upgradeRes(u);
  const c = r ? RES_COLOR[r] : '#6dff9a';
  return `<span class="thumb ${size} svg"><svg viewBox="0 0 64 64" aria-hidden="true">${TYPE_SHAPE[u.type](c)}</svg>${r ? `<span class="badge">${resIcon(r)}</span>` : ''}</span>`;
}

export const TYPE_ICON: Record<Upgrade['type'], string> = { C: px('tank'), P: px('gear'), Pr: px('shield') };
