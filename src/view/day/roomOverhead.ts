// Vista cenital de una sala para el día (renders «dia» del equipo), como la vista de sala de FNAF 6:
// el render de la sala con las mejoras compradas y un marcador en cada hueco (centro_px de huecos.json).
import { UPGRADES } from '../../data';
import type { RoomId, Upgrade } from '../../rules/types';
import { h } from '../dom';
import type { Manifest } from '../room/roomView';
import { ROOMS } from '../room/roomView';
import { px } from '../pixelIcons';
import type { SlotState } from './blueprint';

export const OVERHEAD_ROOMS: RoomId[] = ['control', 'agua', 'oxi', 'com', 'ene'];

/** Prefijo de los renders de cada sala (C2_AGUA…). */
const camOf = (r: RoomId) => ROOMS[r].layers.base.replace(/_base$/, '');

/** Mejoras sin hueco a la vista (x, y en 0..1). Con dir, el hueco cae fuera del encuadre y se marca con una flecha hacia fuera. */
const EDGE: Record<string, { x: number; y: number; dir: 'up' | 'down' | 'left' | 'right' | null }> = {
  // Prefiltros: no tiene capa propia; su marcador va en el suelo de Control.
  pre1: { x: 0.5, y: 0.6, dir: null },
  // Encima de Paneles I, que está en el borde de arriba: se aparta para que no se tapen.
  pan2: { x: 0.62, y: 0.09, dir: 'up' },
};

export function hasOverhead(manifest: Manifest | null): boolean {
  return OVERHEAD_ROOMS.every((r) => !!manifest?.images[`day/${camOf(r)}_base`]);
}

const MARKER = '<svg viewBox="0 0 40 48" class="marker"><path d="M20 2l10 14-10 14-10-14z"/><ellipse cx="20" cy="40" rx="13" ry="5" fill="none" stroke-width="3"/><ellipse cx="20" cy="40" rx="5" ry="2"/></svg>';

export function roomOverhead(opts: {
  manifest: Manifest;
  room: RoomId;
  owned: string[];
  state: (u: Upgrade) => SlotState;
  fresh?: string | null;
  onSlot: (u: Upgrade) => void;
}): HTMLElement {
  const { manifest, room } = opts;
  const cam = camOf(room);
  const pick = (name: string) => manifest.images[`day/${name}`];
  const base = pick(`${cam}_base`)!;
  const view = h('div', { class: 'ov-view', 'data-room': room });
  const img = (src: string, srcset: string | undefined, cls: string) =>
    h('img', { class: cls, src, srcset, sizes: '100vw', alt: '', draggable: 'false', decoding: 'async' });
  view.append(img(base.src, base.srcset, 'base'));
  const list = UPGRADES.filter((u) => u.room === room);
  for (const u of list) {
    if (!opts.owned.includes(u.id)) continue;
    const e = pick(u.layer);
    if (e) view.append(img(e.src, e.srcset, `upg${u.id === opts.fresh ? ' new' : ''}`));
  }
  for (const u of list) {
    const e = pick(u.layer);
    const c = e?.center;
    let x: number, y: number, dir: string | null = null;
    if (EDGE[u.id]) ({ x, y, dir } = EDGE[u.id]);
    else if (c && c[0] >= 0 && c[0] <= base.w && c[1] >= 0 && c[1] <= base.h) { x = c[0] / base.w; y = Math.max(0.07, c[1] / base.h); }
    else if (c) {
      // Hueco fuera del encuadre (Paneles II, Robot): al borde más cercano.
      x = Math.min(0.95, Math.max(0.05, c[0] / base.w)); y = Math.min(0.92, Math.max(0.08, c[1] / base.h));
      dir = c[1] < 0 ? 'up' : c[1] > base.h ? 'down' : c[0] < 0 ? 'left' : 'right';
    } else continue;
    const st = opts.state(u);
    const inner = (st === 'owned' ? `<span class="ok">${px('check')}</span>` : MARKER)
      + (st === 'locked' ? `<span class="lock">${px('lock')}</span>` : '')
      + (dir ? `<span class="edge ${dir}">${px(dir)}</span>` : '');
    view.append(h('button', {
      class: `slot ov ${st}${u.id === opts.fresh ? ' fresh' : ''}${dir ? ' off' : ''}`,
      style: `left:${x * 100}%;top:${y * 100}%`, 'aria-label': u.name, title: u.name,
      onclick: () => opts.onSlot(u), html: inner,
    }));
  }
  return view;
}
