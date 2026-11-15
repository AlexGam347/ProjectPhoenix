// HUD de la noche, superpuesto arriba a la derecha: noche y hora como en FNAF 3, las 4 barras y la señal.
import { CONFIG } from '../data';
import { RES, type Res, type Vec } from '../rules/types';
import { t } from '../i18n/i18n';
import { fmt, h } from './dom';
import { RES_COLOR, resIcon, spillIcon } from './icons';
import { px } from './pixelIcons';

export interface HudState {
  values: Vec;
  caps: Vec;
  goal: Vec | null;
  over?: Partial<Record<Res, boolean>>;
  /** Ritmo neto por hora: flecha arriba o abajo junto al número. */
  trend?: Vec | null;
  label: string;
  clock?: number | null; // horas de juego 0..6
  signal: boolean;
}

export class Hud {
  el: HTMLElement;
  private rows = {} as Record<Res, { row: HTMLElement; cap: HTMLElement; fill: HTMLElement; goal: HTMLElement; val: HTMLElement; trend: HTMLElement; dir: string }>;
  private night: HTMLElement;
  private clockEl: HTMLElement;
  private sig: HTMLElement;

  constructor() {
    const bars = h('div', { class: 'hbars', role: 'group', 'aria-label': 'Resources' });
    for (const r of RES) {
      const cap = h('i', { class: 'cap' });
      const fill = h('i', { class: 'fill', style: `background:${RES_COLOR[r]}` });
      const goal = h('i', { class: 'goal' });
      const val = h('b', { class: 'val' });
      const trend = h('span', { class: 'trend' });
      const row = h('div', { class: 'hrow', 'data-res': r, role: 'meter', 'aria-label': t(`res.${r}`) },
        h('span', { html: resIcon(r) }), h('div', { class: 'htrack' }, cap, fill, goal, h('span', { html: spillIcon(r) })), trend, val);
      this.rows[r] = { row, cap, fill, goal, val, trend, dir: '' };
      bars.append(row);
    }
    this.night = h('span', { class: 'hnight' });
    this.clockEl = h('span', { class: 'hclock' });
    this.sig = h('div', { class: 'hsig' });
    this.el = h('div', { class: 'hud' }, h('div', { class: 'htime' }, this.night, this.clockEl), bars, this.sig);
  }

  update(s: HudState) {
    const max = CONFIG.barMax;
    for (const r of RES) {
      const o = this.rows[r];
      const v = Math.max(0, s.values[r]);
      const capW = (s.caps[r] / max) * 100;
      o.cap.style.width = `${capW}%`;
      o.fill.style.width = `${(Math.min(v, s.caps[r]) / max) * 100}%`;
      const spill = o.row.querySelector('.spill') as HTMLElement | null;
      if (spill) spill.style.left = `${capW}%`;
      if (s.goal) { o.goal.style.display = ''; o.goal.style.left = `${(s.goal[r] / max) * 100}%`; } else o.goal.style.display = 'none';
      const ok = s.goal ? v >= s.goal[r] - 1e-9 : true;
      o.row.classList.toggle('ok', !!s.goal && ok);
      o.row.classList.toggle('low', !!s.goal && !ok);
      o.row.classList.toggle('over', !!s.over?.[r]);
      o.val.textContent = fmt(v);
      // Tendencia: sube, baja o estable (ritmo casi 0, o barra llena sin poder subir).
      const rate = s.trend?.[r] ?? 0;
      const full = v >= s.caps[r] - 1e-6 && rate > 0;
      const dir = !s.trend || Math.abs(rate) < 0.05 || full ? '' : rate > 0 ? 'up' : 'down';
      if (dir !== o.dir) {
        o.dir = dir;
        o.trend.className = `trend ${dir}`;
        o.trend.innerHTML = dir ? px(dir) : '';
        o.trend.setAttribute('aria-label', dir === 'up' ? 'rising' : dir === 'down' ? 'falling' : 'steady');
      }
      o.row.setAttribute('aria-valuenow', String(Math.round(v)));
      o.row.setAttribute('aria-valuemax', String(s.caps[r]));
      o.row.setAttribute('aria-valuetext', `${t(`res.${r}`)} ${fmt(v)} of ${s.caps[r]}${s.goal ? `, goal ${s.goal[r]}` : ''}`);
    }
    this.night.textContent = s.label.toLowerCase();
    if (s.clock !== null && s.clock !== undefined) {
      // Como en FNAF 3: solo la hora en punto. 12 AM, 1 AM … 6 AM.
      const hh = Math.min(6, Math.floor(s.clock + 1e-9));
      this.clockEl.textContent = `${hh === 0 ? 12 : hh} am`;
    } else this.clockEl.textContent = '';
    this.sig.textContent = s.signal ? t('hud.ok').toLowerCase() : t('hud.off').toLowerCase();
    this.sig.classList.toggle('off', !s.signal);
  }

  highlight(what: 'hud' | 'clock' | null) {
    this.el.classList.toggle('hl', what === 'hud');
    this.clockEl.classList.toggle('hl', what === 'clock');
  }
}
