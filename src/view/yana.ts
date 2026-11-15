// YANA: cuadro de diálogo con texto letra a letra y guion por disparadores (no es una IA).
import yanaJson from '../data/yana.es.json';
import { SB } from './room/placeholder/engine.js';
import { fill } from '../i18n/i18n';
import { sfx } from '../audio/audio';
import { h } from './dom';

export type YanaState = 'normal' | 'hint' | 'alarm' | 'nosignal';
export interface Line {
  id?: string;
  text: string;
  state?: YanaState;
  block?: boolean;
  highlight?: string;
  choices?: { label: string; ok?: boolean }[];
  /** Respuesta a una pregunta en el diálogo. */
  onChoice?: (i: number) => void;
}
interface ScriptLine extends Line { trigger: string; when?: Record<string, unknown>; }

export const YANA = yanaJson as unknown as {
  lines: ScriptLine[];
  taskFacts: Record<string, string[]>;
  solarRepair: string;
  clogRepair: string;
  hint: Record<string, string>;
  report: Record<string, string>;
  buy: Record<string, string>;
};

const PORTRAIT_STATE: Record<YanaState, string> = { normal: 'ok', hint: 'hint', alarm: 'alarm', nosignal: 'alarm' };

/** Corta el texto como una transmisión con interferencias. */
export const glitch = (s: string) => s.replace(/([aeiouáéíóú])(\S)/gi, (m, a, b) => (Math.random() < 0.18 ? `${a}… ${b}` : m));

export class Yana {
  el: HTMLElement;
  private portrait: HTMLElement;
  private txt: HTMLElement;
  private more: HTMLElement;
  private choicesEl: HTMLElement;
  private queue: Line[] = [];
  private current: Line | null = null;
  private typing = 0;
  private full = '';
  private shown = 0;
  private hideTimer = 0;
  noSignal = false;
  onHighlight: (id: string | null) => void = () => {};
  onBlockChange: (blocked: boolean) => void = () => {};
  onIdle: () => void = () => {};

  constructor() {
    this.portrait = h('div', { class: 'portrait' });
    this.txt = h('div', { class: 'txt', 'aria-live': 'polite' });
    this.more = h('div', { class: 'more' }, '▶');
    this.choicesEl = h('div', { class: 'choices' });
    const bubble = h('div', { class: 'bubble', role: 'button', tabindex: '0', 'aria-label': 'Continuar' },
      h('b', {}, 'YANA'), this.txt, this.choicesEl, this.more);
    bubble.addEventListener('click', () => this.advance());
    bubble.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.advance(); } });
    this.el = h('div', { class: 'yana hidden' }, this.portrait, bubble);
    this.setState('normal');
  }

  get blocking() { return !!this.current?.block || this.queue.some((l) => l.block); }
  get busy() { return !!this.current; }

  setState(s: YanaState) {
    this.el.classList.remove('normal', 'hint', 'alarm', 'nosignal');
    this.el.classList.add(s);
    this.portrait.innerHTML = `<svg viewBox="-70 -125 190 200">${SB.ari(PORTRAIT_STATE[s])}</svg>`;
  }

  say(lines: Line | Line[], opts: { interrupt?: boolean } = {}) {
    const arr = Array.isArray(lines) ? lines : [lines];
    if (opts.interrupt) { this.queue = []; this.current = null; }
    this.queue.push(...arr);
    if (!this.current) this.next();
    this.onBlockChange(this.blocking);
  }

  private next() {
    clearTimeout(this.hideTimer);
    clearInterval(this.typing);
    const line = this.queue.shift() ?? null;
    this.current = line;
    this.choicesEl.replaceChildren();
    if (!line) {
      this.onHighlight(null);
      this.onBlockChange(false);
      this.hideTimer = window.setTimeout(() => { if (!this.current) this.el.classList.add('hidden'); }, 2500);
      this.onIdle();
      return;
    }
    const state: YanaState = this.noSignal ? 'nosignal' : line.state ?? 'normal';
    this.setState(state);
    this.el.classList.remove('hidden');
    this.full = state === 'nosignal' && !line.text.includes('…') ? glitch(line.text) : line.text;
    this.shown = 0;
    this.txt.textContent = '';
    this.more.style.display = 'none';
    this.onHighlight(line.highlight ?? null);
    this.typing = window.setInterval(() => {
      this.shown += 2;
      this.txt.textContent = this.full.slice(0, this.shown);
      if (this.shown % 6 === 0) sfx.beep();
      if (this.shown >= this.full.length) this.finishTyping();
    }, 28);
    this.onBlockChange(this.blocking);
  }

  private finishTyping() {
    clearInterval(this.typing);
    this.typing = 0;
    this.txt.textContent = this.full;
    const line = this.current;
    if (!line) return;
    if (line.choices) {
      this.choicesEl.replaceChildren(...line.choices.map((c, i) => h('button', {
        class: 'btn small', onclick: (e: Event) => { e.stopPropagation(); line.onChoice?.(i); },
      }, c.label)));
      return;
    }
    this.more.style.display = '';
    if (!line.block) this.hideTimer = window.setTimeout(() => { if (this.current === line) this.next(); }, Math.max(4000, this.full.length * 70));
  }

  advance() {
    if (!this.current) return;
    if (this.typing) { this.finishTyping(); return; }
    if (this.current.choices) return;
    sfx.click();
    this.next();
  }

  /** Cierra una pregunta en el diálogo mostrando la respuesta. */
  resolveChoice(text: string, state: YanaState = 'normal') {
    if (!this.current) return;
    this.current = { text, state };
    this.full = text;
    this.txt.textContent = text;
    this.choicesEl.replaceChildren();
    this.setState(state);
    this.more.style.display = '';
    const line = this.current;
    this.hideTimer = window.setTimeout(() => { if (this.current === line) this.next(); }, 4500);
  }

  clear() { this.queue = []; this.current = null; clearInterval(this.typing); this.el.classList.add('hidden'); this.onHighlight(null); this.onBlockChange(false); }
}

/** Busca en el guion las líneas de un disparador que cumplen la condición y aún no se han dicho. */
export function scripted(trigger: string, ctx: Record<string, unknown>, seen: string[], vars: Record<string, string | number> = {}): Line[] {
  const out: Line[] = [];
  for (const l of YANA.lines) {
    if (l.trigger !== trigger) continue;
    if (l.id && seen.includes(l.id) && /^(tut\.|room\.|n\d|day\.\d)/.test(l.id)) continue;
    const w = l.when ?? {};
    let ok = true;
    for (const [k, v] of Object.entries(w)) {
      if (k === 'flag') { if (!(ctx.flags as string[] | undefined)?.includes(v as string)) ok = false; }
      else if (ctx[k] !== v) ok = false;
    }
    if (ok) out.push({ ...l, text: fill(l.text, vars) });
  }
  // Las líneas genéricas (sin condición) solo si no hay una específica.
  const specific = out.filter((l) => YANA.lines.find((s) => s.id === l.id)?.when);
  return specific.length ? specific : out;
}
