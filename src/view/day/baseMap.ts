// Mapa del día: las 5 vistas cenitales del equipo (renders «dia») unidas en una sola tira de la base,
// que se arrastra con el ratón o el dedo como un mapa. Cada sala lleva sus mejoras compradas como capas
// y un marcador en cada hueco (centro_px de huecos.json).
import { UPGRADES } from '../../data';
import type { RoomId, Upgrade } from '../../rules/types';
import { h } from '../dom';
import type { Manifest } from '../room/roomView';
import { ROOMS } from '../room/roomView';
import { px } from '../pixelIcons';
import type { SlotState } from './blueprint';

/** Tamaño del mapa en píxeles de render (cada vista mide 1920×1080). */
const W = 5440, H = 1044;

/** Dónde va cada vista en el mapa y desde dónde se funde con la de su izquierda (píxeles de la vista).
 *  Energía y Agua, y Oxígeno e Invernadero, se solapan de verdad (mismo encuadre desplazado, medido por correlación);
 *  Control va en medio. Se recortan 36 px arriba para que todas cubran el alto. */
const TILES: { room: RoomId; x: number; y: number; fade?: [number, number] }[] = [
  { room: 'ene', x: 0, y: 0 },
  { room: 'agua', x: 660, y: -36, fade: [150, 450] },
  { room: 'control', x: 1760, y: -36, fade: [350, 560] },
  { room: 'oxi', x: 2860, y: -36, fade: [300, 500] },
  { room: 'com', x: 3520, y: -36, fade: [150, 450] },
];

/** Mejoras sin hueco a la vista, en píxeles de su vista. Con dir, el hueco cae fuera del encuadre. */
const EDGE: Record<string, { x: number; y: number; dir: 'up' | null }> = {
  pre1: { x: 960, y: 640, dir: null }, // prefiltros: sin capa propia, en el suelo de Control
  pan2: { x: 1190, y: 70, dir: 'up' }, // al lado de Paneles I, que está en el borde de arriba
};

const camOf = (r: RoomId) => ROOMS[r].layers.base.replace(/_base$/, '');

export function hasBaseMap(manifest: Manifest | null): boolean {
  return TILES.every((t) => !!manifest?.images[`day/${camOf(t.room)}_base`]);
}

/** Centro de cada sala en el mapa (para abrir el catálogo de la sala que se está mirando). */
export const roomCenter = (r: RoomId) => TILES.find((t) => t.room === r)!.x + 960;

const MARKER = '<svg viewBox="0 0 40 48" class="marker"><path d="M20 2l10 14-10 14-10-14z"/><ellipse cx="20" cy="40" rx="13" ry="5" fill="none" stroke-width="3"/><ellipse cx="20" cy="40" rx="5" ry="2"/></svg>';

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export interface BaseMap {
  el: HTMLElement;
  /** Desplazamiento actual: borde izquierdo de la vista, en píxeles de render. */
  scroll(): number;
  /** Sala más cercana al centro de la vista. */
  roomInView(): RoomId;
  pan(dx: number): void;
  destroy(): void;
}

export function baseMap(opts: {
  manifest: Manifest;
  owned: string[];
  state: (u: Upgrade) => SlotState;
  fresh?: string | null;
  /** Desplazamiento inicial (null: centrado en Control). */
  start: number | null;
  onSlot: (u: Upgrade) => void;
  onScroll: (x: number) => void;
  onFirstDrag: () => void;
}): BaseMap {
  const { manifest } = opts;
  const world = h('div', { class: 'map-world', style: `aspect-ratio:${W}/${H}` });
  const marks = h('div', { class: 'map-marks' });
  const img = (src: string, srcset: string | undefined, cls: string) =>
    h('img', { class: cls, src, srcset, sizes: '100vw', alt: '', draggable: 'false', decoding: 'async' });

  for (const t of TILES) {
    const cam = camOf(t.room);
    const pick = (name: string) => manifest.images[`day/${name}`];
    const base = pick(`${cam}_base`)!;
    const tile = h('div', {
      class: 'map-tile', 'data-room': t.room,
      style: `left:${pct(t.x, W)};top:${pct(t.y, H)};width:${pct(1920, W)};height:${pct(1080, H)}`,
    });
    if (t.fade) {
      const m = `linear-gradient(to right, transparent ${pct(t.fade[0], 1920)}, #000 ${pct(t.fade[1], 1920)})`;
      tile.style.maskImage = m;
      tile.style.setProperty('-webkit-mask-image', m);
    }
    tile.append(img(base.src, base.srcset, 'base'));
    const list = UPGRADES.filter((u) => u.room === t.room);
    for (const u of list) {
      if (!opts.owned.includes(u.id)) continue;
      const e = pick(u.layer);
      if (e) tile.append(img(e.src, e.srcset, `upg${u.id === opts.fresh ? ' new' : ''}`));
    }
    world.append(tile);
    // Marcadores: fuera de las vistas (las máscaras los taparían), en coordenadas del mapa.
    for (const u of list) {
      const c = pick(u.layer)?.center;
      let x: number, y: number, dir: string | null = null;
      if (EDGE[u.id]) ({ x, y, dir } = EDGE[u.id]);
      else if (c && c[1] >= 0) { x = c[0]; y = c[1]; }
      else if (c) { x = c[0]; y = 0; dir = 'up'; } // Robot: su hueco cae por encima del encuadre
      else continue;
      const mx = t.x + x, my = Math.min(H - 50, Math.max(dir ? 62 : 46, t.y + y));
      const st = opts.state(u);
      const inner = (st === 'owned' ? `<span class="ok">${px('check')}</span>` : MARKER)
        + (st === 'locked' ? `<span class="lock">${px('lock')}</span>` : '')
        + (dir ? `<span class="edge ${dir}">${px(dir)}</span>` : '');
      marks.append(h('button', {
        class: `slot ov ${st}${u.id === opts.fresh ? ' fresh' : ''}${dir ? ' off' : ''}`,
        style: `left:${pct(mx, W)};top:${pct(my, H)}`, 'aria-label': u.name, title: u.name,
        onclick: () => opts.onSlot(u), html: inner,
      }));
    }
  }
  world.append(marks);
  const el = h('div', { class: 'map-view' }, world);

  // ---------- arrastre ----------
  let x = opts.start ?? -1; // píxeles de render
  let raf = 0, vel = 0;
  const scale = () => (el.clientHeight || 1) / H; // píxeles de pantalla por píxel de render
  const maxX = () => Math.max(0, W - el.clientWidth / scale());
  const apply = () => {
    x = Math.min(maxX(), Math.max(0, x));
    world.style.transform = `translate3d(${-x * scale()}px,0,0)`;
    opts.onScroll(x);
  };
  const ro = new ResizeObserver(() => {
    if (x < 0) x = roomCenter('control') - el.clientWidth / scale() / 2;
    apply();
  });
  ro.observe(el);

  let down: { px: number; x: number; t: number } | null = null, dragged = false, first = true;
  let samples: { px: number; t: number }[] = [];
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(raf);
    down = { px: e.clientX, x, t: e.timeStamp };
    dragged = false;
    samples = [{ px: e.clientX, t: e.timeStamp }];
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) return;
    const d = e.clientX - down.px;
    if (!dragged && Math.abs(d) > 6) {
      dragged = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      if (first) { first = false; opts.onFirstDrag(); }
    }
    if (!dragged) return;
    x = down.x - d / scale();
    apply();
    samples.push({ px: e.clientX, t: e.timeStamp });
    if (samples.length > 5) samples.shift();
  });
  const up = (e: PointerEvent) => {
    if (!down) return;
    down = null;
    el.classList.remove('dragging');
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (!dragged) return;
    // Inercia: sigue un poco con la velocidad del final del arrastre.
    const a = samples[0], b = samples[samples.length - 1];
    vel = b.t > a.t ? -((b.px - a.px) / (b.t - a.t)) / scale() : 0; // px de render por ms
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(40, now - last); last = now;
      x += vel * dt; vel *= Math.pow(0.992, dt);
      apply();
      if (Math.abs(vel) > 0.02 && x > 0 && x < maxX()) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  // Tras arrastrar no se abre el marcador sobre el que se suelta.
  el.addEventListener('click', (e) => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    x += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / scale();
    apply();
  }, { passive: false });

  const pan = (dx: number) => {
    cancelAnimationFrame(raf);
    const from = x, to = Math.min(maxX(), Math.max(0, x + dx)), t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 260);
      x = from + (to - from) * (1 - (1 - k) ** 3);
      apply();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  return {
    el,
    scroll: () => x,
    roomInView: () => {
      const mid = x + el.clientWidth / scale() / 2;
      return TILES.reduce((best, t) => (Math.abs(t.x + 960 - mid) < Math.abs(best.x + 960 - mid) ? t : best)).room;
    },
    pan: (dir: number) => pan(dir * (el.clientWidth / scale()) * 0.4),
    destroy: () => { ro.disconnect(); cancelAnimationFrame(raf); },
  };
}
