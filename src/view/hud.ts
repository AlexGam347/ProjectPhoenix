// HUD: 4 barras (reserva, tope y meta), reloj de la noche, tripulación y estado de YANA.
import { CONFIG } from '../data';
import { RES, type Res, type Vec } from '../rules/types';
import { t } from '../i18n/i18n';
import { fmt, h } from './dom';
import { RES_COLOR, resIcon, spillIcon } from './icons';

export interface HudState {
  values: Vec;
  caps: Vec;
  goal: Vec | null;
  over?: Partial<Record<Res, boolean>>;
  label: string;
  clock?: number | null; // horas de juego 0..6
  signal: boolean;
}

export class Hud {
  el: HTMLElement;
  private rows = {} as Record<Res, { row: HTMLElement; cap: HTMLElement; fill: HTMLElement; goal: HTMLElement; val: HTMLElement }>;
  private clockEl: HTMLElement;
  private hourBar: HTMLElement;
  private yanaSt: HTMLElement;

  constructor() {
    const bars = h('div', { class: 'bars', role: 'group', 'aria-label': 'Recursos' });
    for (const r of RES) {
      const cap = h('div', { class: 'cap' });
      const fill = h('div', { class: 'fill', style: `background:${RES_COLOR[r]}` });
      const goal = h('div', { class: 'goal', title: 'meta de la noche' });
      const spill = h('span', { html: spillIcon(r) });
      const val = h('div', { class: 'val' });
      const row = h('div', { class: 'bar', 'data-res': r, role: 'meter', 'aria-label': t(`res.${r}`) },
        h('div', { class: 'name', html: `${resIcon(r)}<span>${t(`res.${r}`)}</span>` }),
        h('div', { class: 'track' }, cap, fill, goal, spill), val);
      this.rows[r] = { row, cap, fill, goal, val };
      bars.append(row);
    }
    this.clockEl = h('div', { class: 'clock' });
    this.hourBar = h('div', { class: 'hourbar' }, h('i'));
    this.yanaSt = h('span', { class: 'yana-st' }, h('i'), h('span'));
    this.el = h('div', { class: 'hud' }, bars,
      h('div', { class: 'side' }, this.clockEl, this.hourBar, h('div', { class: 'meta' }, h('span', {}, `👥 ${t('hud.crew')}: ${CONFIG.crew}`), this.yanaSt)));
  }

  update(s: HudState) {
    const max = CONFIG.barMax;
    for (const r of RES) {
      const o = this.rows[r];
      const v = Math.max(0, s.values[r]);
      const capW = (s.caps[r] / max) * 100;
      o.cap.style.width = `${capW}%`;
      o.fill.style.width = `calc(${Math.min(v, s.caps[r]) / max * 100}% - 8 * var(--u))`;
      o.fill.style.minWidth = '0';
      const spill = o.row.querySelector('.spill') as HTMLElement | null;
      if (spill) spill.style.left = `${capW}%`;
      if (s.goal) { o.goal.style.display = ''; o.goal.style.left = `${(s.goal[r] / max) * 100}%`; } else o.goal.style.display = 'none';
      const ok = s.goal ? v >= s.goal[r] - 1e-9 : true;
      o.row.classList.toggle('ok', !!s.goal && ok);
      o.row.classList.toggle('low', !!s.goal && !ok);
      o.row.classList.toggle('over', !!s.over?.[r]);
      o.val.innerHTML = `${fmt(v)} / ${s.caps[r]}${s.goal ? `<small>${ok ? '✓ ' : ''}${t('hud.goal', { v: s.goal[r] })}</small>` : ''}`;
      o.row.setAttribute('aria-valuenow', String(Math.round(v)));
      o.row.setAttribute('aria-valuemax', String(s.caps[r]));
      o.row.setAttribute('aria-valuetext', `${t(`res.${r}`)}: ${fmt(v)} de ${s.caps[r]}${s.goal ? `, meta ${s.goal[r]}` : ''}`);
    }
    if (s.clock !== null && s.clock !== undefined) {
      const hh = Math.floor(s.clock), mm = Math.floor((s.clock - hh) * 60);
      this.clockEl.innerHTML = `<small>${s.label}</small>${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      (this.hourBar.firstChild as HTMLElement).style.width = `${(s.clock / CONFIG.hours) * 100}%`;
      this.hourBar.style.display = '';
    } else {
      this.clockEl.innerHTML = `<small></small>${s.label}`;
      this.hourBar.style.display = 'none';
    }
    this.yanaSt.classList.toggle('off', !s.signal);
    (this.yanaSt.lastChild as HTMLElement).textContent = s.signal ? t('hud.yana.ok') : t('hud.yana.off');
  }

  highlight(what: 'hud' | 'clock' | null) {
    this.el.classList.toggle('hl', what === 'hud');
    this.clockEl.classList.toggle('hl', what === 'clock');
  }
}
