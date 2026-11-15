// Hueco para los vídeos prerenderizados (sueños y finales). Con subtítulos y SKIP.
// Si el vídeo aún no existe, se muestra un marco con un icono y continúa solo.
import { t } from '../../i18n/i18n';
import { h } from '../dom';
import type { Screen } from '../app';

export interface VideoDef { video: string; label: string; icon: string }

export class StoryScreen implements Screen {
  el: HTMLElement;
  private timers: number[] = [];
  private done = false;

  constructor(def: VideoDef, private onDone: () => void) {
    const base = import.meta.env.BASE_URL;
    const skip = h('button', { class: 'btn skip', onclick: () => this.finish() }, `${t('story.skip')} ⏭`);
    this.el = h('div', { class: 'screen story' }, skip);
    const v = h('video', { playsinline: true, preload: 'auto', 'aria-label': def.label }) as HTMLVideoElement;
    v.append(
      h('source', { src: `${base}assets/video/${def.video}.mp4`, type: 'video/mp4' }),
      h('source', { src: `${base}assets/video/${def.video}.webm`, type: 'video/webm' }),
      h('track', { kind: 'subtitles', srclang: 'en', label: 'English', src: `${base}assets/video/${def.video}.en.vtt`, default: true }));
    let fellBack = false;
    const placeholder = () => {
      if (fellBack) return;
      fellBack = true;
      v.remove();
      this.el.prepend(h('div', { class: 'video-slot', role: 'img', 'aria-label': def.label },
        h('div', { class: 'slot-icon' }, def.icon), h('div', { class: 'slot-label' }, def.label), h('div', { class: 'slot-bar' }, h('i'))));
      this.timers.push(window.setTimeout(() => this.finish(), 4000));
    };
    v.addEventListener('error', placeholder, true);
    v.querySelectorAll('source')[1].addEventListener('error', placeholder);
    v.addEventListener('ended', () => this.finish());
    v.addEventListener('loadeddata', () => { void v.play().catch(() => { v.controls = true; }); });
    this.timers.push(window.setTimeout(() => { if (v.readyState === 0) placeholder(); }, 2500));
    this.el.prepend(v);
    setTimeout(() => skip.focus(), 50);
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  destroy() { this.timers.forEach(clearTimeout); this.el.querySelector('video')?.pause(); this.el.remove(); }
}
