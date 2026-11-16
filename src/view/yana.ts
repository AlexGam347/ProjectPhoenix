// YANA: cuadro de diálogo con texto letra a letra y guion por disparadores (no es una IA).
import yanaJson from '../data/yana.en.json';
import { px } from './pixelIcons';
import { fill } from '../i18n/i18n';
import { sfx } from '../audio/audio';
import { h } from './dom';

export type YanaState = 'normal' | 'hint' | 'alarm' | 'nosignal' | 'happy';
export interface Line {
  id?: string;
  text: string;
  state?: YanaState;
  block?: boolean;
  highlight?: string;
  choices?: { label: string; ok?: boolean }[];
  /** Respuesta a una pregunta en el diálogo. */
  onChoice?: (i: number) => void;
  /** Mientras sea cierto, la línea sigue teniendo sentido (p. ej. «la sala sigue parada»). Si deja de serlo, se quita. */
  valid?: () => boolean;
  /** No la sustituye un aviso más nuevo (presentación de la noche, explicaciones importantes). */
  sticky?: boolean;
}
interface ScriptLine extends Line { trigger: string; when?: Record<string, unknown>; }

export const YANA = yanaJson as unknown as {
  lines: ScriptLine[];
  taskFacts: Record<string, string[]>;
  solarRepair: string;
  clogRepair: string;
  hint: Record<string, string>;
  result: Record<string, string>;
  intro: { text: string; state?: YanaState }[];
  guide: Record<'lowest' | 'door' | 'back' | 'task' | 'wait' | 'free', string>;
};

/** Cara de la hoja de sprites del equipo (celdas de 64×64): ojos, >_ y ^^. Alarma y sin señal se derivan en CSS. */
const FACE: Record<YanaState, string> = { normal: 'eyes', hint: 'term', happy: 'joy', alarm: 'eyes', nosignal: 'eyes' };

/** Sprite de YANA para cualquier pantalla. */
export const yanaSprite = (state: YanaState = 'normal', size: 'sm' | 'md' | 'lg' = 'md') =>
  `<span class="ysprite ${size} face-${FACE[state]} st-${state}" role="img" aria-label="YANA"></span>`;

/** Corta el texto como una transmisión con interferencias. */
export const glitch = (s: string) => s.replace(/([aeiou])(\S)/gi, (m, a, b) => (Math.random() < 0.18 ? `${a}… ${b}` : m));

const CHAR_MS = 32;
const SILENT = /[\s.,!?;:'"()…*-]/;

export class Yana {
  el: HTMLElement;
  private sprite: HTMLElement;
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
    this.sprite = h('div', { class: 'ysprite lg face-eyes st-normal', role: 'img', 'aria-label': 'YANA' });
    this.txt = h('div', { class: 'txt', 'aria-live': 'polite' });
    this.more = h('div', { class: 'more', html: px('down') });
    this.choicesEl = h('div', { class: 'choices' });
    const box = h('div', { class: 'ubox', role: 'button', tabindex: '0', 'aria-label': 'Continue' }, this.txt, this.choicesEl, this.more);
    box.addEventListener('click', () => this.advance());
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.advance(); } });
    this.el = h('div', { class: 'yana hidden' }, box, h('div', { class: 'yfloat' }, this.sprite));
    this.setState('normal');
  }

  get blocking() { return !!this.current?.block || this.queue.some((l) => l.block); }
  get busy() { return !!this.current; }

  setState(s: YanaState) {
    this.el.dataset.state = s;
    this.sprite.className = `ysprite lg face-${FACE[s]} st-${s}`;
  }

  /**
   * fresh: lo nuevo manda. Los avisos que esperaban (no bloqueantes ni fijos) se descartan y, si en pantalla hay
   * uno de esos, se pasa al nuevo sin esperar: así YANA habla de lo último que hizo el jugador, no de lo de antes.
   */
  say(lines: Line | Line[], opts: { interrupt?: boolean; fresh?: boolean } = {}) {
    const arr = Array.isArray(lines) ? lines : [lines];
    if (opts.interrupt) { this.queue = []; this.current = null; }
    const replaceable = (l: Line) => !l.block && !l.sticky && !l.choices;
    if (opts.fresh && arr.length) {
      this.queue = this.queue.filter((l) => !replaceable(l));
      this.queue.push(...arr);
      if (this.current && replaceable(this.current)) { this.next(); this.onBlockChange(this.blocking); return; }
    } else this.queue.push(...arr);
    if (!this.current) this.next();
    this.onBlockChange(this.blocking);
  }

  /** Quita las líneas que ya no tienen sentido (su valid() es falso); si la de pantalla es una, pasa a la siguiente. */
  prune() {
    const stale = (l: Line) => !!l.valid && !l.valid();
    const before = this.queue.length;
    this.queue = this.queue.filter((l) => !stale(l));
    if (this.current && stale(this.current)) {
      this.next();
      // Si no queda nada que decir, el aviso viejo desaparece ya (no se queda 2,5 s a la vista).
      if (!this.current) { clearTimeout(this.hideTimer); this.txt.textContent = ''; this.el.classList.add('hidden'); }
    } else if (before !== this.queue.length) this.onBlockChange(this.blocking);
  }

  private next() {
    clearTimeout(this.hideTimer);
    clearInterval(this.typing);
    let line = this.queue.shift() ?? null;
    while (line && line.valid && !line.valid()) line = this.queue.shift() ?? null;
    this.current = line;
    this.choicesEl.replaceChildren();
    if (!line) {
      this.onHighlight(null);
      this.onBlockChange(false);
      this.setState(this.noSignal ? 'nosignal' : 'normal');
      this.hideTimer = window.setTimeout(() => { if (!this.current) this.el.classList.add('hidden'); }, 2500);
      this.onIdle();
      return;
    }
    const state: YanaState = this.noSignal ? 'nosignal' : line.state ?? 'normal';
    this.setState(state);
    this.el.classList.remove('hidden');
    this.full = state === 'nosignal' && !line.text.includes('…') ? glitch(line.text) : line.text;
    this.shown = 0;
    this.txt.textContent = '* ';
    this.more.style.visibility = 'hidden';
    this.onHighlight(line.highlight ?? null);
    // Como en Undertale: una letra cada vez y el mismo sonido corto por cada letra (no en espacios ni signos).
    this.typing = window.setInterval(() => {
      const ch = this.full[this.shown];
      this.shown++;
      this.txt.textContent = `* ${this.full.slice(0, this.shown)}`;
      if (ch && !SILENT.test(ch)) sfx.blip();
      if (this.shown >= this.full.length) this.finishTyping();
    }, CHAR_MS);
    this.onBlockChange(this.blocking);
  }

  private finishTyping() {
    clearInterval(this.typing);
    this.typing = 0;
    this.txt.textContent = `* ${this.full}`;
    const line = this.current;
    if (!line) return;
    if (line.choices) {
      this.choicesEl.replaceChildren(...line.choices.map((c, i) => h('button', {
        class: 'menu-item', onclick: (e: Event) => { e.stopPropagation(); line.onChoice?.(i); },
      }, c.label)));
      (this.choicesEl.firstChild as HTMLElement | null)?.focus();
      return;
    }
    this.more.style.visibility = 'visible';
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
    this.txt.textContent = `* ${text}`;
    this.choicesEl.replaceChildren();
    this.setState(state);
    this.more.style.visibility = 'visible';
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
