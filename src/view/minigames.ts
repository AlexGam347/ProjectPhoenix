// Panel de acción: lista lo que se puede hacer con un objeto y lanza el minijuego (1–2 clics o mantener pulsado).
import type { Res, Step, Vec } from '../rules/types';
import { RES } from '../rules/types';
import { t } from '../i18n/i18n';
import { sfx } from '../audio/audio';
import { h } from './dom';
import { resIcon } from './icons';

export interface ActionOption {
  kind: 'task' | 'repair';
  title: string;
  plus?: Partial<Vec>;
  minus?: Partial<Vec>;
  steps: Step[];
  disabled?: string;
  run: () => void;
}

export function effectChips(plus: Partial<Vec> = {}, minus: Partial<Vec> = {}, withTime = true): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const r of RES) if (plus[r]) out.push(h('span', { class: 'chip plus', html: `+${plus[r]} ${resIcon(r as Res)} ${t(`res.${r}.low`)}` }));
  for (const r of RES) if (minus[r]) out.push(h('span', { class: 'chip minus', html: `−${minus[r]} ${resIcon(r as Res)} ${t(`res.${r}.low`)}` }));
  if (withTime) out.push(h('span', { class: 'chip time' }, `⏱ ${t('action.hour')}`));
  return out;
}

export class ActionPanel {
  el: HTMLElement | null = null;
  onClose: () => void = () => {};

  constructor(private host: HTMLElement) {}

  get open() { return !!this.el; }

  show(title: string, options: ActionOption[], emptyText?: string) {
    this.close(false);
    const body = h('div');
    const close = h('button', { class: 'btn small ghost', onclick: () => this.close(), 'aria-label': t('action.close') }, '✕');
    const el = h('div', { class: 'action panel', role: 'dialog', 'aria-label': title }, h('header', {}, h('h3', {}, title), close), body);
    if (!options.length) body.append(h('p', { class: 'why' }, emptyText ?? t('action.allGood')));
    for (const o of options) {
      const btn = h('button', { class: `btn ${o.kind === 'repair' ? 'danger' : 'primary'}`, disabled: !!o.disabled, onclick: () => this.play(o, body) },
        o.kind === 'repair' ? t('action.repair') : t('action.do'));
      body.append(h('div', { class: `card ${o.kind}` },
        h('div', {}, h('div', { class: 't' }, o.title), h('div', { class: 'eff' }, ...effectChips(o.plus, o.minus)), o.disabled ? h('div', { class: 'why' }, o.disabled) : null),
        btn));
    }
    this.host.append(el);
    this.el = el;
    (el.querySelector('.card .btn:not(:disabled)') as HTMLElement | null)?.focus();
  }

  private play(o: ActionOption, body: HTMLElement) {
    sfx.click();
    let i = 0;
    const next = () => {
      if (i >= o.steps.length) { this.close(false); o.run(); return; }
      const st = o.steps[i];
      const n = o.steps.length;
      const lbl = h('div', { class: 'lbl' }, st.label);
      const head = h('div', { class: 'muted' }, t('action.step', { i: i + 1, n }));
      i++;
      if (st.kind === 'hold') {
        const prog = h('i', { class: 'prog' });
        const btn = h('button', { class: 'btn primary hold' }, prog, h('span', {}, `✋ ${t('action.hold')}`));
        holdButton(btn, prog, st.ms ?? 1200, () => { sfx.ok(); next(); });
        body.replaceChildren(h('div', { class: 'step' }, head, lbl, btn));
        btn.focus();
      } else {
        const btn = h('button', { class: 'btn primary', onclick: () => { sfx.click(); next(); } }, `👆 ${st.label}`);
        body.replaceChildren(h('div', { class: 'step' }, head, btn));
        btn.focus();
      }
    };
    next();
  }

  close(notify = true) {
    this.el?.remove();
    this.el = null;
    if (notify) this.onClose();
  }
}

/** Botón de mantener pulsado (ratón, dedo o teclado). */
function holdButton(btn: HTMLElement, prog: HTMLElement, ms: number, done: () => void) {
  let start = 0, raf = 0, finished = false;
  const step = () => {
    const p = Math.min(1, (performance.now() - start) / ms);
    prog.style.width = `${p * 100}%`;
    if (p >= 1) { finished = true; stop(); done(); return; }
    raf = requestAnimationFrame(step);
  };
  const begin = (e: Event) => { e.preventDefault(); if (finished || start) return; start = performance.now(); raf = requestAnimationFrame(step); sfx.work(); };
  const stop = () => { cancelAnimationFrame(raf); if (!finished) prog.style.width = '0'; start = 0; };
  btn.addEventListener('pointerdown', begin);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) begin(e); });
  btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
}
