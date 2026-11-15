// Mapa del día: la base entera vista desde arriba (las 5 vistas cenitales del equipo unidas por
// scripts/make-map.mjs, con suelo de Marte alrededor), que se arrastra en todas direcciones como un mapa.
// Encima van las mejoras compradas como capas y un marcador en cada hueco (centro_px de huecos.json).
import { UPGRADES } from '../../data';
import type { RoomId, Upgrade } from '../../rules/types';
import { h } from '../dom';
import type { Manifest } from '../room/roomView';
import { px } from '../pixelIcons';
import type { SlotState } from './blueprint';

/** Márgenes de suelo alrededor de la base y posición de cada vista: igual que MAP en scripts/make-map.mjs. */
const M = { l: 640, t: 480 };
const TILES: { room: RoomId; x: number; y: number }[] = [
  { room: 'ene', x: 0, y: 0 },
  { room: 'agua', x: 660, y: -36 },
  { room: 'control', x: 1760, y: -36 },
  { room: 'oxi', x: 2860, y: -36 },
  { room: 'com', x: 3520, y: -36 },
];
/** Alto de la base (píxeles de render) que se ve de una vez: algo menos que el mapa entero, para que haya que moverse. */
const VIEW_H = 1000;

/** Mejoras sin hueco a la vista, en píxeles de su vista. Con dir, el hueco cae fuera del encuadre. */
const EDGE: Record<string, { x: number; y: number; dir: 'up' | null }> = {
  pre1: { x: 960, y: 640, dir: null }, // prefiltros: sin capa propia, en el suelo de Control
  pan2: { x: 1190, y: 70, dir: 'up' }, // al lado de Paneles I, que está en el borde de arriba
};


export function hasBaseMap(manifest: Manifest | null): boolean {
  return !!manifest?.images['day/MAP_base'];
}

/** Centro de cada sala en el mapa, en píxeles del mapa. */
export const roomCenter = (r: RoomId) => { const t = TILES.find((x) => x.room === r)!; return { x: M.l + t.x + 960, y: M.t + t.y + 560 }; };

const MARKER = '<svg viewBox="0 0 40 48" class="marker"><path d="M20 2l10 14-10 14-10-14z"/><ellipse cx="20" cy="40" rx="13" ry="5" fill="none" stroke-width="3"/><ellipse cx="20" cy="40" rx="5" ry="2"/></svg>';

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export interface MapPos { x: number; y: number }
export interface BaseMap {
  el: HTMLElement;
  /** Sala más cercana al centro de la vista. */
  roomInView(): RoomId;
  /** Desplaza la vista una fracción de su tamaño (flechas del teclado). */
  pan(dx: number, dy: number): void;
  destroy(): void;
}

export function baseMap(opts: {
  manifest: Manifest;
  owned: string[];
  state: (u: Upgrade) => SlotState;
  fresh?: string | null;
  /** Centro de la vista al empezar, en píxeles del mapa (null: Control). */
  start: MapPos | null;
  onSlot: (u: Upgrade) => void;
  /** Centro de la vista tras moverse (para conservarlo al volver del catálogo). */
  onMove: (c: MapPos) => void;
  onFirstDrag: () => void;
}): BaseMap {
  const { manifest } = opts;
  const map = manifest.images['day/MAP_base'];
  const W = map.w, H = map.h;
  const world = h('div', { class: 'map-world', style: `width:${W}px;height:${H}px` });
  const img = (src: string, srcset: string | undefined, cls: string, style = '') =>
    h('img', { class: cls, src, srcset, sizes: `${W}px`, alt: '', draggable: 'false', decoding: 'async', style });
  world.append(img(map.src, map.srcset, 'map-base'));
  const marks = h('div', { class: 'map-marks' });

  for (const t of TILES) {
    const pick = (name: string) => manifest.images[`day/${name}`];
    const ox = M.l + t.x, oy = M.t + t.y;
    const list = UPGRADES.filter((u) => u.room === t.room);
    for (const u of list) {
      if (!opts.owned.includes(u.id)) continue;
      const e = pick(u.layer);
      if (e) world.append(img(e.src, e.srcset, `upg${u.id === opts.fresh ? ' new' : ''}`, `left:${ox}px;top:${oy}px;width:1920px;height:1080px`));
    }
    for (const u of list) {
      const c = pick(u.layer)?.center;
      let x: number, y: number, dir: string | null = null;
      if (EDGE[u.id]) ({ x, y, dir } = EDGE[u.id]);
      else if (c && c[1] >= 0) { x = c[0]; y = c[1]; }
      else if (c) { x = c[0]; y = 0; dir = 'up'; } // Robot: su hueco cae por encima del encuadre
      else continue;
      const mx = ox + x, my = Math.max(M.t + (dir ? 62 : 46), oy + y);
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

  // ---------- arrastre en las dos direcciones ----------
  // pos: esquina superior izquierda de la vista, en píxeles del mapa.
  const pos = { x: 0, y: 0 };
  let ready = false, raf = 0;
  const vel = { x: 0, y: 0 };
  const scale = () => (el.clientHeight || 1) / VIEW_H; // píxeles de pantalla por píxel del mapa
  const viewW = () => el.clientWidth / scale(), viewH = () => el.clientHeight / scale();
  const apply = (notify = true) => {
    pos.x = Math.min(W - viewW(), Math.max(0, pos.x));
    pos.y = Math.min(H - viewH(), Math.max(0, pos.y));
    world.style.transform = `translate3d(${-pos.x * scale()}px,${-pos.y * scale()}px,0) scale(${scale()})`;
    world.style.setProperty('--inv', String(1 / scale())); // los marcadores mantienen su tamaño en pantalla
    if (notify) opts.onMove({ x: pos.x + viewW() / 2, y: pos.y + viewH() / 2 });
  };
  const center = (c: MapPos) => { pos.x = c.x - viewW() / 2; pos.y = c.y - viewH() / 2; };
  const ro = new ResizeObserver(() => {
    if (!el.clientHeight) return;
    if (!ready) { ready = true; center(opts.start ?? roomCenter('control')); apply(false); return; }
    apply();
  });
  ro.observe(el);

  let down: { px: number; py: number; x: number; y: number } | null = null, dragged = false, first = true;
  let samples: { px: number; py: number; t: number }[] = [];
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(raf);
    down = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    dragged = false;
    samples = [{ px: e.clientX, py: e.clientY, t: e.timeStamp }];
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.px, dy = e.clientY - down.py;
    if (!dragged && Math.hypot(dx, dy) > 6) {
      dragged = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      if (first) { first = false; opts.onFirstDrag(); }
    }
    if (!dragged) return;
    pos.x = down.x - dx / scale();
    pos.y = down.y - dy / scale();
    apply();
    samples.push({ px: e.clientX, py: e.clientY, t: e.timeStamp });
    if (samples.length > 5) samples.shift();
  });
  const up = (e: PointerEvent) => {
    if (!down) return;
    down = null;
    el.classList.remove('dragging');
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (!dragged) return;
    // Inercia: sigue un poco con la velocidad del final del arrastre.
    const a = samples[0], b = samples[samples.length - 1], dt = b.t - a.t;
    vel.x = dt > 0 ? -((b.px - a.px) / dt) / scale() : 0;
    vel.y = dt > 0 ? -((b.py - a.py) / dt) / scale() : 0;
    let last = performance.now();
    const step = (now: number) => {
      const d = Math.min(40, now - last); last = now;
      const bx = pos.x, by = pos.y;
      pos.x += vel.x * d; pos.y += vel.y * d;
      const k = Math.pow(0.992, d); vel.x *= k; vel.y *= k;
      apply();
      const moving = Math.hypot(vel.x, vel.y) > 0.02 && (pos.x !== bx || pos.y !== by);
      if (moving) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  // Tras arrastrar no se abre el marcador sobre el que se suelta.
  el.addEventListener('click', (e) => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
  // Rueda o panel táctil: desplaza (con Mayús, la rueda va de lado).
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    const sideways = e.shiftKey && !e.deltaX;
    pos.x += (sideways ? e.deltaY : e.deltaX) / scale();
    pos.y += (sideways ? 0 : e.deltaY) / scale();
    apply();
  }, { passive: false });

  const glide = (dx: number, dy: number) => {
    cancelAnimationFrame(raf);
    const fx = pos.x, fy = pos.y, tx = fx + dx, ty = fy + dy, t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 260), e = 1 - (1 - k) ** 3;
      pos.x = fx + (tx - fx) * e; pos.y = fy + (ty - fy) * e;
      apply();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  return {
    el,
    roomInView: () => {
      const mx = pos.x + viewW() / 2;
      return TILES.reduce((best, t) => (Math.abs(M.l + t.x + 960 - mx) < Math.abs(M.l + best.x + 960 - mx) ? t : best)).room;
    },
    pan: (dx: number, dy: number) => glide(dx * viewW() * 0.4, dy * viewH() * 0.4),
    destroy: () => { ro.disconnect(); cancelAnimationFrame(raf); },
  };
}
