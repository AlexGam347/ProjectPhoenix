// Tablet de mantenimiento estilo FNAF 3: sube desde la barra inferior izquierda y es donde se hacen las tareas.
// Lista en minúsculas con cursor >>>, teclado (flechas, Enter, Esc, M) y los pasos del minijuego dentro.
import type { Res, Step, Vec } from '../rules/types';
import { RES } from '../rules/types';
import { t } from '../i18n/i18n';
import { sfx } from '../audio/audio';
import { h } from './dom';
import { resIcon } from './icons';
import { px } from './pixelIcons';

export interface TabletEntry {
  id: string;
  label: string;
  kind: 'task' | 'repair' | 'nav' | 'wait';
  plus?: Partial<Vec>;
  minus?: Partial<Vec>;
  hour?: boolean;
  steps?: Step[];
  disabled?: boolean;
  alert?: boolean;
  /** Zona de la sala asociada: el clic en el objeto selecciona esta entrada. */
  zone?: string;
  run: () => void;
}

/** Efecto en iconos y números, sin palabras (el nombre va en aria-label). */
export function effectChips(plus: Partial<Vec> = {}, minus: Partial<Vec> = {}, hour = true): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const r of RES) if (plus[r]) out.push(h('span', { class: 'eff plus', 'aria-label': `plus ${plus[r]} ${t(`res.${r}.low`)}`, html: `+${plus[r]}${resIcon(r as Res)}` }));
  for (const r of RES) if (minus[r]) out.push(h('span', { class: 'eff minus', 'aria-label': `minus ${minus[r]} ${t(`res.${r}.low`)}`, html: `−${minus[r]}${resIcon(r as Res)}` }));
  if (hour) out.push(h('span', { class: 'eff time', 'aria-label': 'one hour', html: `${px('clock')}1h` }));
  return out;
}

export class Tablet {
  el: HTMLElement;
  private panel: HTMLElement;
  private bar: HTMLElement;
  private head: HTMLElement;
  private list: HTMLElement;
  private title = '';
  private entries: TabletEntry[] = [];
  private sel = 0;
  private mode: 'list' | 'steps' | 'busy' = 'list';
  open = false;
  private shownAt = 0;
  onToggle: (open: boolean) => void = () => {};

  constructor() {
    this.head = h('div', { class: 'tb-head' });
    this.list = h('div', { class: 'tb-list', role: 'menu' });
    this.panel = h('div', { class: 'tb-panel', role: 'dialog', 'aria-label': 'Maintenance tablet' }, this.head, this.list);
    this.bar = h('button', { class: 'tb-bar', 'aria-label': 'Open the tablet (M)', html: `${px('up')}${px('up')}${px('up')}` });
    // Como en FNAF 3, pasar el ratón por la barra la sube o la baja (una vez por entrada).
    // Un clic justo después del sobrevuelo no la deshace.
    let hoverAt = 0;
    this.bar.addEventListener('pointerenter', (e) => { if ((e as PointerEvent).pointerType === 'mouse') { hoverAt = performance.now(); this.toggle(); } });
    this.bar.addEventListener('click', () => { if (performance.now() - hoverAt > 500) this.toggle(); });
    this.el = h('div', { class: 'tablet' }, this.panel, this.bar);
    this.render();
  }

  /** Teclado: la pantalla de noche reenvía aquí sus teclas. Devuelve true si la tecla se usó. */
  key(e: KeyboardEvent): boolean {
    if (e.key === 'm' || e.key === 'M') { this.toggle(); return true; }
    if (!this.open) return false;
    if (e.key === 'Escape') { this.hide(); return true; }
    if (this.mode !== 'list') return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const n = this.entries.length;
      if (!n) return true;
      this.sel = (this.sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      sfx.tick();
      this.paintCursor();
      return true;
    }
    if (e.key === 'Enter') { this.exec(this.sel); return true; }
    return false;
  }

  set(title: string, entries: TabletEntry[], selectId?: string) {
    const prev = this.entries[this.sel]?.id;
    this.title = title;
    this.entries = entries;
    const want = selectId ?? prev;
    const i = entries.findIndex((x) => x.id === want);
    this.sel = i >= 0 ? i : 0;
    if (this.mode === 'list') this.render();
  }

  show(selectId?: string) {
    if (selectId) { const i = this.entries.findIndex((x) => x.id === selectId || `zone.${x.zone}` === selectId); if (i >= 0) this.sel = i; }
    if (this.mode !== 'busy') this.mode = 'list';
    this.render();
    if (!this.open) { this.open = true; this.shownAt = performance.now(); this.el.classList.add('open'); sfx.door(); this.onToggle(true); }
  }

  hide() {
    if (!this.open || this.mode === 'busy') return;
    this.open = false;
    this.mode = 'list';
    this.el.classList.remove('open');
    sfx.click();
    this.onToggle(false);
  }

  toggle() { if (this.open) this.hide(); else this.show(); }

  /** Animación del salto de hora dentro de la tablet. */
  working(clock: string) {
    this.mode = 'busy';
    this.head.textContent = `${this.title} >>>`;
    this.list.replaceChildren(h('div', { class: 'tb-busy' }, `>>> working`, h('span', { class: 'dots' }), h('b', {}, clock)));
  }

  done() { this.mode = 'list'; this.render(); }

  highlight(what: 'bar' | string | null) {
    this.bar.classList.toggle('hl', what === 'bar');
    this.list.querySelectorAll<HTMLElement>('.tb-item').forEach((el) => el.classList.toggle('hl', !!what && (el.dataset.id === what || `zone.${el.dataset.zone}` === what)));
  }

  private render() {
    this.head.textContent = `${this.title} >>>`;
    this.list.replaceChildren(...this.entries.map((e, i) => {
      const item = h('button', {
        class: `tb-item ${e.kind}${e.alert ? ' alert' : ''}`, role: 'menuitem', 'data-id': e.id, 'data-zone': e.zone, disabled: !!e.disabled,
        onclick: () => this.exec(i),
        // Mientras la tablet sube por debajo del cursor, el sobrevuelo no cambia la selección.
        onpointerenter: () => { if (performance.now() - this.shownAt > 450 && this.sel !== i) { this.sel = i; sfx.tick(); this.paintCursor(); } },
      },
      h('span', { class: 'cur' }, '>>>'),
      h('span', { class: 'lbl' }, e.alert ? h('i', { class: 'bang', 'aria-label': 'alert' }, '!') : null, e.label),
      h('span', { class: 'fxs' }, ...(e.kind === 'task' || e.kind === 'repair' ? effectChips(e.plus, e.minus, e.hour !== false) : [])));
      return item;
    }));
    this.paintCursor();
  }

  private paintCursor() {
    this.list.querySelectorAll('.tb-item').forEach((el, i) => el.classList.toggle('on', i === this.sel));
    if (this.open) (this.list.children[this.sel] as HTMLElement | undefined)?.focus({ preventScroll: true });
  }

  private exec(i: number) {
    const e = this.entries[i];
    if (!e || e.disabled || this.mode !== 'list') return;
    sfx.click();
    if (!e.steps?.length) { e.run(); return; }
    this.mode = 'steps';
    let k = 0;
    const next = () => {
      if (k >= e.steps!.length) { this.mode = 'list'; e.run(); return; }
      const st = e.steps![k++];
      const lines = e.steps!.map((s, j) => h('div', { class: `tb-step${j < k - 1 ? ' done' : j === k - 1 ? ' now' : ''}` }, j < k - 1 ? '[ok] ' : '', s.label));
      const back = h('button', { class: 'tb-item nav small', onclick: () => { this.mode = 'list'; this.render(); } }, h('span', { class: 'cur' }, '>>>'), h('span', { class: 'lbl' }, 'cancel'));
      let action: HTMLElement;
      if (st.kind === 'hold') {
        const cells = Array.from({ length: 10 }, () => h('i'));
        action = h('button', { class: 'tb-item hold on' }, h('span', { class: 'cur' }, '>>>'), h('span', { class: 'lbl' }, 'hold'), h('span', { class: 'blocks' }, ...cells));
        holdButton(action, cells, st.ms ?? 1200, () => { sfx.ok(); next(); });
      } else {
        action = h('button', { class: 'tb-item on', onclick: () => { sfx.click(); next(); } }, h('span', { class: 'cur' }, '>>>'), h('span', { class: 'lbl' }, '[ ok ]'));
      }
      this.head.textContent = `${e.label} >>>`;
      this.list.replaceChildren(...lines, action, back);
      action.focus();
    };
    next();
  }
}

/** Mantener pulsado (ratón, dedo o teclado): los bloques se llenan. */
function holdButton(btn: HTMLElement, cells: HTMLElement[], ms: number, done: () => void) {
  let start = 0, raf = 0, finished = false;
  const paint = (p: number) => cells.forEach((c, i) => c.classList.toggle('on', i < Math.round(p * cells.length)));
  const step = () => {
    const p = Math.min(1, (performance.now() - start) / ms);
    paint(p);
    if (p >= 1) { finished = true; stop(); done(); return; }
    raf = requestAnimationFrame(step);
  };
  const begin = (e: Event) => { e.preventDefault(); if (finished || start) return; start = performance.now(); raf = requestAnimationFrame(step); sfx.work(); };
  const stop = () => { cancelAnimationFrame(raf); if (!finished) paint(0); start = 0; };
  btn.addEventListener('pointerdown', begin);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) begin(e); });
  btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
}
