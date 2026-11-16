// Vista de una sala: capas (render real o boceto provisional), efectos 2D y zonas clicables.
import controlJson from '../../data/rooms/control.json';
import aguaJson from '../../data/rooms/agua.json';
import oxiJson from '../../data/rooms/oxi.json';
import comJson from '../../data/rooms/com.json';
import eneJson from '../../data/rooms/ene.json';
import scenes from './placeholder/rooms.js';
import { CONFIG, UPGRADES } from '../../data';
import type { ProdRoom, RoomId } from '../../rules/types';
import { bbox, centroid, h, polyToClip } from '../dom';
import { FX_ICONS } from '../icons';
import { px } from '../pixelIcons';
import { t } from '../../i18n/i18n';

export interface ZoneDef { id: string; label: string; poly: number[][]; nav?: ProdRoom; special?: 'kiosk' | 'earth' | 'yana'; icon?: string }
export interface RoomDef {
  id: RoomId; cam: string; name: string; short: string; resource?: ProdRoom; placeholder: string;
  image: { w: number; h: number }; layers: { base: string; solar?: string; night?: string };
  restartZone?: string; clogZone?: string; zones: ZoneDef[]; anchors: Record<string, unknown>; art: string;
  /** Zonas y anclas para la cámara de los renders de Blender (los bocetos usan zones/anchors). */
  render?: { zones: ZoneDef[]; anchors: Record<string, unknown> };
}
export const ROOMS: Record<RoomId, RoomDef> = {
  control: controlJson as unknown as RoomDef, agua: aguaJson as unknown as RoomDef, oxi: oxiJson as unknown as RoomDef,
  com: comJson as unknown as RoomDef, ene: eneJson as unknown as RoomDef,
};

export interface ImageEntry { w: number; h: number; src: string; srcset?: string; rect?: number[]; center?: number[] }
export interface Manifest { images: Record<string, ImageEntry> }

export interface RoomVisual {
  mode: 'day' | 'night';
  storm: null | 'sand' | 'solar';
  owned: string[];
  newUpgrade?: string | null;
  problem?: { zone: string; fx: string; off: boolean } | null;
  doors?: Partial<Record<ProdRoom, 'ok' | 'red' | 'dead'>>;
  earth?: 'normal' | 'flare' | 'nosignal';
  flare?: { classType: string; peakTime: string } | null;
  alertZones?: string[];
}

/** Qué mejora muestra cada grupo de capas del boceto provisional (en orden de aparición en el SVG). */
const PLACEHOLDER_LAYERS: Record<string, { up: string[]; base: string[] }> = {
  control: { up: ['bli1'], base: ['bli1'] },
  agua: { up: ['tal1', 'dep1', 'rec1'], base: ['rec1'] },
  oxigeno: { up: ['tan1', 'ele1', 'mox1'], base: ['mox1|ele1'] },
  invernadero: { up: ['est1', 'est2', 'est1', 'est2', 'led1|des1|est1'], base: ['est1'] },
  energia: { up: ['pan1|rob1', 'bat1', 'rea1'], base: ['rea1'] },
};

const sceneCache: Record<string, string> = {};
function placeholderSvg(key: string): string {
  if (!sceneCache[key]) sceneCache[key] = (scenes as Record<string, () => string>)[key]();
  return sceneCache[key];
}

export class RoomView {
  el: HTMLElement;
  private scene: HTMLElement;
  private art: HTMLElement;
  private fx: HTMLElement;
  private zonesSvg: SVGSVGElement;
  private label: HTMLElement;
  private chips: HTMLElement;
  private earthEl: HTMLElement | null = null;
  private noiseRaf = 0;
  private hl: string | null = null;
  private lastKey = '';
  private panX = 0;
  private usingImages: boolean;
  /** Zonas y anclas de la imagen que se está mostrando (render o boceto). */
  private zones: ZoneDef[];
  private anchors: Record<string, unknown>;

  constructor(public def: RoomDef, private manifest: Manifest | null, private onZone: (z: ZoneDef) => void) {
    this.el = h('div', { class: 'room', 'data-room': def.id });
    this.scene = h('div', { class: 'scene' });
    this.art = h('div', { class: 'art' });
    this.fx = h('div', { class: 'fx' });
    this.label = h('div', { class: 'zone-label' });
    this.chips = h('div', { class: 'upg-chips' });
    // De noche se usan los renders de la sala vista desde dentro (juego «night/»); Control aún no tiene y sigue con el boceto.
    const base = manifest?.images[`night/${def.layers.base}`];
    this.usingImages = !!base;
    this.zones = this.usingImages && def.render ? def.render.zones : def.zones;
    this.anchors = this.usingImages && def.render ? def.render.anchors : def.anchors;
    this.el.classList.toggle('has-render', this.usingImages);
    const aspect = base ? base.w / base.h : 16 / 9;
    if (aspect > 16 / 9 + 0.01) {
      // Render panorámico: la escena es más ancha que la pantalla y la vista gira (desplaza) con el puntero.
      this.scene.style.width = `${(aspect / (16 / 9)) * 100}%`;
      this.el.addEventListener('pointermove', (e) => this.pan(e));
    }
    this.zonesSvg = this.buildZones();
    this.scene.append(this.art, this.fx, this.zonesSvg, this.label);
    this.el.append(this.scene, this.chips);
  }

  private pan(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width; // 0..1
    const extra = this.scene.offsetWidth - r.width;
    const target = -extra * Math.min(1, Math.max(0, (rel - 0.15) / 0.7));
    this.panX = target;
    this.scene.style.transform = `translateX(${this.panX}px)`;
  }

  private buildZones(): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'zones');
    svg.setAttribute('viewBox', '0 0 1 1');
    svg.setAttribute('preserveAspectRatio', 'none');
    for (const z of this.zones) {
      const p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', z.poly.map((q) => q.join(',')).join(' '));
      p.setAttribute('data-zone', z.id);
      p.setAttribute('tabindex', '0');
      p.setAttribute('role', 'button');
      p.setAttribute('aria-label', z.label);
      const fire = () => this.onZone(z);
      p.addEventListener('click', fire);
      p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
      p.addEventListener('pointerenter', () => this.showLabel(z));
      p.addEventListener('focus', () => this.showLabel(z));
      p.addEventListener('pointerleave', () => this.label.classList.remove('on'));
      p.addEventListener('blur', () => this.label.classList.remove('on'));
      svg.appendChild(p);
    }
    return svg;
  }

  private showLabel(z: ZoneDef) {
    const b = bbox(z.poly);
    this.label.textContent = z.label;
    this.label.style.left = `${((b.x0 + b.x1) / 2) * 100}%`;
    this.label.style.top = `${Math.max(0.04, b.y0) * 100}%`;
    this.label.classList.add('on');
  }

  zone(id: string) { return this.zones.find((z) => z.id === id); }

  highlight(id: string | null) {
    this.hl = id;
    this.zonesSvg.querySelectorAll('polygon').forEach((p) => p.classList.toggle('hl', p.getAttribute('data-zone') === id));
  }

  private renderArt(v: RoomVisual) {
    const mine = UPGRADES.filter((u) => u.room === this.def.id && v.owned.includes(u.id));
    const key = `${v.storm}|${mine.map((u) => u.id).join(',')}`;
    if (key === this.lastKey && !v.newUpgrade) return;
    this.lastKey = key;
    if (this.usingImages) {
      const imgs: HTMLElement[] = [];
      const pick = (name?: string) => (name ? this.manifest!.images[`night/${name}`] : undefined);
      // Tormentas con render propio (arena en Energía, solar en Control); si no, el fondo de noche con el efecto CSS.
      const storm = v.storm ? pick(this.def.layers.base.replace(/_base$/, `_${v.storm}`)) : undefined;
      this.el.classList.toggle('sand-render', !!storm && v.storm === 'sand');
      this.el.classList.toggle('solar-render', !!storm && v.storm === 'solar');
      imgs.push(this.img(storm ?? pick(this.def.layers.base)!, 'base'));
      for (const u of mine) {
        // Nivel II/III sin capa propia: se usa la del nivel I (la insignia lo indica).
        const e = pick(u.layer) ?? pick(u.layer.replace(/\d$/, '1'));
        if (e) imgs.push(this.img(e, `upg${u.id === v.newUpgrade ? ' new' : ''}`));
      }
      this.art.replaceChildren(...imgs);
    } else {
      this.art.innerHTML = placeholderSvg(this.def.placeholder);
      // Cada grupo .up / .base-only del boceto del dossier se asocia a su mejora.
      const owned = new Set(mine.map((u) => u.id));
      const on = (spec: string) => spec === '*' ? owned.size > 0 : spec.split('|').some((id) => owned.has(id));
      const map = PLACEHOLDER_LAYERS[this.def.placeholder] ?? { up: [], base: [] };
      this.art.querySelectorAll<SVGGElement>('svg .up').forEach((g, i) => { g.style.display = on(map.up[i] ?? '*') ? '' : 'none'; });
      this.art.querySelectorAll<SVGGElement>('svg .base-only').forEach((g, i) => { g.style.display = on(map.base[i] ?? '*') ? 'none' : ''; });
      if (v.newUpgrade && mine.some((u) => u.id === v.newUpgrade)) {
        this.art.classList.remove('flash-up');
        void this.art.offsetWidth;
        this.art.classList.add('flash-up');
      }
    }
    // Con renders, la lista solo enseña las mejoras que no tienen capa propia (por ejemplo, los prefiltros).
    const listed = this.usingImages ? mine.filter((u) => !this.manifest?.images[`night/${u.layer}`]) : mine;
    this.chips.replaceChildren(...listed.map((u) => h('span', { class: u.id === v.newUpgrade ? 'new' : '' }, u.name)));
  }

  private img(e: ImageEntry, cls: string) {
    return h('img', { class: cls, src: e.src, srcset: e.srcset, sizes: '100vw', alt: '', draggable: 'false', decoding: 'async' });
  }

  update(v: RoomVisual) {
    this.renderArt(v);
    this.el.classList.toggle('is-night', v.mode === 'night');
    const fx: HTMLElement[] = [];
    if (v.mode === 'night') fx.push(h('div', { class: 'night' }));
    if (v.storm === 'sand') fx.push(...(this.el.classList.contains('sand-render') ? [] : [h('div', { class: 'sand' })]), h('div', { class: 'sand-dust' }));
    for (const z of this.zones) {
      if (!z.icon || !FX_ICONS[z.icon]) continue;
      const [cx, cy] = centroid(z.poly);
      fx.push(h('div', { class: 'icon', style: `left:${cx * 100}%;top:${cy * 100}%`, html: FX_ICONS[z.icon] }));
    }
    if (v.problem) {
      const z = this.zone(v.problem.zone);
      if (z) {
        const [cx, cy] = centroid(z.poly);
        const clip = polyToClip(z.poly);
        if (v.problem.off) fx.push(h('div', { class: 'poly off', style: `clip-path:${clip}` }));
        if (v.problem.fx) fx.push(h('div', { class: `poly ${v.problem.fx}`, style: `clip-path:${clip};--cx:${cx * 100}%;--cy:${cy * 100}%` }));
        if (v.storm !== 'solar') fx.push(h('div', { class: 'glow', style: `left:${cx * 100}%;top:${cy * 100}%` }));
        fx.push(h('div', { class: `tag${v.problem.off ? '' : ' warn'}`, style: `left:${cx * 100}%;top:${Math.max(0.12, bbox(z.poly).y0 - 0.03) * 100}%`,
          html: `${px('warn')}${v.problem.off ? ` ${t('down.off').toLowerCase()}` : ''}` }));
      }
    }
    if (v.doors) {
      for (const [room, st] of Object.entries(v.doors)) {
        const a = this.anchors[`door.${room}`] as number[] | undefined;
        if (a) fx.push(h('div', { class: `doorlight ${st === 'ok' ? '' : st}`, style: `left:${a[0] * 100}%;top:${a[1] * 100}%` }));
      }
    }
    if (v.storm === 'solar') fx.push(...(this.el.classList.contains('solar-render') ? [] : [h('div', { class: 'solar' })]), h('div', { class: 'solar-v' }));
    this.fx.replaceChildren(...fx);
    this.zonesSvg.querySelectorAll('polygon').forEach((p) => p.classList.toggle('alert', !!v.alertZones?.includes(p.getAttribute('data-zone')!)));
    if (this.hl) this.highlight(this.hl);
    this.renderEarth(v);
  }

  private renderEarth(v: RoomVisual) {
    const poly = this.anchors.earth as number[][] | undefined;
    if (!poly || !v.earth || v.earth === 'normal') {
      this.earthEl?.remove();
      this.earthEl = null;
      cancelAnimationFrame(this.noiseRaf);
      return;
    }
    const b = bbox(poly);
    const mode = v.earth;
    if (this.earthEl?.dataset.mode === mode) return;
    this.earthEl?.remove();
    cancelAnimationFrame(this.noiseRaf);
    // El texto escala con el tamaño de la pantalla (en los renders es mucho más pequeña que en el boceto).
    const fs = (b.x1 - b.x0) * 1920 * 0.055;
    const el = h('div', { class: 'screen-earth', 'data-mode': mode, style: `left:${b.x0 * 100}%;top:${b.y0 * 100}%;width:${(b.x1 - b.x0) * 100}%;height:${(b.y1 - b.y0) * 100}%;font-size:calc(${fs.toFixed(1)} * var(--u))` });
    if (mode === 'flare' && v.flare) {
      // La llamarada es real (NASA DONKI): en la historia pasa en 2071, el mismo día y mes; debajo, la fecha real.
      const d = new Date(v.flare.peakTime.replace('Z', ':00Z'));
      const ok = !isNaN(+d);
      const inGame = ok ? `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} ${CONFIG.gameYear}` : String(CONFIG.gameYear);
      const real = ok ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : v.flare.peakTime.slice(0, 10);
      el.style.background = '#03060b';
      el.append(h('div', { class: 'flare' }, h('b', {}, v.flare.classType), t('flare.title'), h('br'), inGame, h('br'), h('small', {}, t('flare.src', { date: real }))));
    } else {
      const c = h('canvas', { width: 160, height: 90 }) as HTMLCanvasElement;
      el.append(c, h('div', { class: 'nosig' }, t('nosignal')));
      const g = c.getContext('2d');
      const still = document.documentElement.classList.contains('reduce-flash');
      const draw = () => {
        if (!g) return;
        const img = g.createImageData(160, 90);
        for (let i = 0; i < img.data.length; i += 4) { const n = Math.random() * 200; img.data[i] = n; img.data[i + 1] = n * 0.9; img.data[i + 2] = n * 0.9; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        if (!still) this.noiseRaf = requestAnimationFrame(() => setTimeout(draw, 60));
      };
      draw();
    }
    this.earthEl = el;
    this.scene.append(el);
  }

  destroy() { cancelAnimationFrame(this.noiseRaf); this.el.remove(); }
}
