// Prólogo, sueños y cinemáticas: vídeo si existe (con subtítulos y «Saltar»); si no, tarjetas de texto.
import { t } from '../../i18n/i18n';
import { h } from '../dom';
import type { Screen } from '../app';

export interface StoryDef { title: string; video?: string; lines: string[]; dream?: boolean }

export class StoryScreen implements Screen {
  el: HTMLElement;
  private timers: number[] = [];
  private done = false;

  constructor(def: StoryDef, private onDone: () => void, opts: { onNoVideo?: () => void } = {}) {
    const base = import.meta.env.BASE_URL;
    const skip = h('button', { class: 'btn skip', onclick: () => this.finish() }, `${t('story.skip')} ⏭`);
    this.el = h('div', { class: 'screen story' }, skip);
    if (def.video) {
      const v = h('video', { playsinline: true, preload: 'auto', 'aria-label': def.title }) as HTMLVideoElement;
      v.append(h('source', { src: `${base}assets/video/${def.video}.mp4`, type: 'video/mp4' }),
        h('source', { src: `${base}assets/video/${def.video}.webm`, type: 'video/webm' }),
        h('track', { kind: 'subtitles', srclang: 'es', label: 'Español', src: `${base}assets/video/${def.video}.es.vtt`, default: true }));
      let fellBack = false;
      const fallback = () => {
        if (fellBack) return;
        fellBack = true;
        v.remove();
        if (opts.onNoVideo) { this.done = true; opts.onNoVideo(); } else this.cards(def);
      };
      v.addEventListener('error', fallback, true);
      v.querySelectorAll('source')[1].addEventListener('error', fallback);
      v.addEventListener('ended', () => this.finish());
      v.addEventListener('loadeddata', () => { void v.play().catch(() => { v.controls = true; }); });
      this.timers.push(window.setTimeout(() => { if (v.readyState === 0) fallback(); }, 2500));
      this.el.prepend(v);
    } else this.cards(def);
  }

  private cards(def: StoryDef) {
    const ps = def.lines.map((l) => h('p', {}, l));
    const next = h('button', { class: 'btn primary', style: 'justify-self:center;opacity:0;transition:opacity .6s', onclick: () => this.finish() }, `${t('story.next')} ▶`);
    const card = h('div', { class: 'card' }, h('h2', {}, def.title), ...ps, next);
    if (def.dream) this.el.prepend(h('div', { class: 'dream' }));
    this.el.append(card);
    ps.forEach((p, i) => this.timers.push(window.setTimeout(() => p.classList.add('on'), 400 + i * 1500)));
    this.timers.push(window.setTimeout(() => { next.style.opacity = '1'; next.focus(); }, 400 + ps.length * 1500));
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  destroy() { this.timers.forEach(clearTimeout); this.el.querySelector('video')?.pause(); this.el.remove(); }
}
