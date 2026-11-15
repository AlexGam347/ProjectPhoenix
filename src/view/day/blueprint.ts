// Plano de la base visto desde arriba (geometría de plan() del dossier, en metros) con un marcador por mejora.
import { UPGRADES } from '../../data';
import type { RoomId, Upgrade } from '../../rules/types';
import { h } from '../dom';
import { RES_COLOR } from '../icons';
import type { Manifest } from '../room/roomView';
import { upgradeArt } from './upgradeArt';
import { px } from '../pixelIcons';

const VB = { x: -46, y: -22, w: 112, h: 63 };

/** Salas jugables (rectángulos en metros). */
export const BP_ROOMS: Record<RoomId, [number, number, number, number]> = {
  control: [-7.5, -7, 7.5, 6], agua: [-25, -12.5, -13, 0], oxi: [13, -13, 25, 0], ene: [-26, 4, -13, 16], com: [13, 3, 25.5, 15.5],
};
const HALLS: [number, number, number, number][] = [[-44, -18, -25, 0], [25, -18, 44, 0], [25.5, 3, 66, 36], [26, 41, 39, 54], [54, 41, 68, 54], [-16, 23, 17.5, 64]];
const FIELD: [number, number, number, number] = [-46, 4, -26, 18];
const CORR: [string, number][] = [['-7.5,-5.2 -13,-5.2', 2.5], ['-7.5,-2.4 -10.5,-2.4 -10.5,7 -13,7', 2.5], ['7.5,-5.2 13,-5.2', 2.5],
  ['7.5,-2.4 10.5,-2.4 10.5,8 13,8', 2.5], ['0,6 0,23', 3.5]];

/** Posición (metros) del marcador de cada mejora, en su sala o en la nave que la contiene. */
export const SLOTS: Record<string, [number, number]> = {
  rec1: [-21, -6], dep1: [-40, -6], dep2: [-36, -6], dep3: [-32, -6], tal1: [-38, -13], tal2: [-32, -13],
  ele1: [15.8, -5], ele2: [18.6, -5], mox1: [22.4, -5], tan1: [29, -10], tan2: [33, -10], tan3: [37, -10],
  des1: [20, 7.5], des2: [23, 7.5], led1: [16, 11], led2: [19, 11], est1: [35, 26], est2: [45, 26],
  bat1: [-23, 12], bat2: [-20, 12], rea1: [-16, 13.5], pan1: [-42, 11], pan2: [-36, 11], rob1: [-30, 15],
  bli1: [5, -3.5], pre1: [-5, -3.5],
};

const pct = (x: number, y: number) => `left:${((x - VB.x) / VB.w) * 100}%;top:${((y - VB.y) / VB.h) * 100}%`;
const rect = ([x0, y0, x1, y1]: number[], cls: string, extra = '') =>
  `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" class="${cls}" ${extra}/>`;

const ROOM_COLOR: Record<RoomId, string> = { control: '#6dff9a', agua: RES_COLOR.agua, oxi: RES_COLOR.oxi, com: RES_COLOR.com, ene: RES_COLOR.ene };
const ROOM_LABEL: Record<RoomId, string> = { control: 'CONTROL', agua: 'WATER', oxi: 'OXYGEN', com: 'GREENHOUSE', ene: 'ENERGY' };

export type SlotState = 'owned' | 'open' | 'locked';

export function blueprint(opts: {
  manifest: Manifest | null;
  state: (u: Upgrade) => SlotState;
  fresh?: string | null;
  onSlot: (u: Upgrade) => void;
  onRoom: (r: RoomId) => void;
}): HTMLElement {
  const bg = opts.manifest?.images.BLUEPRINT_base;
  let svg = `<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs><pattern id="bp-grid" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M2 0H0V2" fill="none" stroke="#1d4a7a" stroke-width=".08"/></pattern>
    <pattern id="bp-grid10" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#2a6cb0" stroke-width=".14"/></pattern></defs>
    <rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" fill="${bg ? 'transparent' : '#071a33'}"/>
    <rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" fill="url(#bp-grid)"/><rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" fill="url(#bp-grid10)"/>`;
  svg += rect(FIELD, 'bp-field');
  for (let i = 0; i < 4; i++) svg += rect([-44, 6 + i * 3, -28, 7.6 + i * 3], 'bp-pv');
  for (const hh of HALLS) svg += rect(hh, 'bp-hall');
  for (const [p, w] of CORR) svg += `<polyline points="${p}" class="bp-corr" stroke-width="${w}"/>`;
  for (const [id, r] of Object.entries(BP_ROOMS) as [RoomId, number[]][]) {
    svg += rect(r, 'bp-room', `style="stroke:${ROOM_COLOR[id]}" data-room="${id}"`);
    svg += `<text x="${(r[0] + r[2]) / 2}" y="${r[1] + 2.4}" class="bp-label" style="fill:${ROOM_COLOR[id]}">${ROOM_LABEL[id]}</text>`;
  }
  svg += '</svg>';
  const map = h('div', { class: 'bp-map', html: svg });
  if (bg) map.style.backgroundImage = `url(${bg.src})`;
  map.querySelectorAll<SVGRectElement>('rect.bp-room').forEach((el) => {
    el.addEventListener('click', () => opts.onRoom(el.dataset.room as RoomId));
  });
  for (const u of UPGRADES) {
    const pos = SLOTS[u.id];
    if (!pos) continue;
    const st = opts.state(u);
    const inner = st === 'owned'
      ? upgradeArt(u, opts.manifest, 'sm')
      : `<svg viewBox="0 0 40 48" class="marker"><path d="M20 2l10 14-10 14-10-14z"/><ellipse cx="20" cy="40" rx="13" ry="5" fill="none" stroke-width="3"/><ellipse cx="20" cy="40" rx="5" ry="2"/></svg>${st === 'locked' ? `<span class="lock">${px('lock')}</span>` : ''}`;
    map.append(h('button', {
      class: `slot ${st}${u.id === opts.fresh ? ' fresh' : ''}`, style: pct(pos[0], pos[1]), 'aria-label': u.name, title: u.name,
      onclick: () => opts.onSlot(u), html: inner,
    }));
  }
  return map;
}
