// Hueco para los vídeos prerenderizados (sueños y finales). Con subtítulos y SKIP.
// Si el vídeo aún no existe, se muestra un marco con un icono y continúa solo.
import { t } from '../../i18n/i18n';
import { h } from '../dom';
import { px } from '../pixelIcons';
import type { Screen } from '../app';

export interface VideoDef { video: string; label: string; icon: string; subs?: boolean }

export class StoryScreen implements Screen {
  el: HTMLElement;
  private timers: number[] = [];
  private done = false;

  constructor(def: VideoDef, private onDone: () => void, audio: { muted: boolean; volume: number } = { muted: false, volume: 1 }) {
    const base = import.meta.env.BASE_URL;
    const skip = h('button', { class: 'btn skip', onclick: () => this.finish() }, t('story.skip').toLowerCase());
    this.el = h('div', { class: 'screen story' }, skip);
    const v = h('video', { playsinline: true, preload: 'auto', 'aria-label': def.label }) as HTMLVideoElement;
    v.muted = audio.muted;
    v.volume = Math.min(1, Math.max(0, audio.volume));
    // H.264 se reproduce en Chrome, Edge, Firefox y Safari. Subtítulos solo si existen (subs: true en story.en.json).
    const mp4 = h('source', { src: `${base}assets/video/${def.video}.mp4`, type: 'video/mp4' });
    v.append(mp4);
    if (def.subs) v.append(h('track', { kind: 'subtitles', srclang: 'en', label: 'English', src: `${base}assets/video/${def.video}.en.vtt`, default: true }));
    let fellBack = false;
    const placeholder = () => {
      if (fellBack) return;
      fellBack = true;
      v.remove();
      this.el.prepend(h('div', { class: 'video-slot', role: 'img', 'aria-label': def.label },
        h('div', { class: 'slot-icon', html: px(def.icon) }), h('div', { class: 'slot-label' }, def.label), h('div', { class: 'slot-bar' }, h('i'))));
      this.timers.push(window.setTimeout(() => this.finish(), 4000));
    };
    v.addEventListener('error', placeholder, true);
    mp4.addEventListener('error', placeholder);
    v.addEventListener('ended', () => this.finish());
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      v.play().catch(() => {
        // Sonido bloqueado por el navegador (sin gesto reciente): el jugador lo arranca con un toque.
        const btn = h('button', { class: 'video-play', 'aria-label': t('video.play'), html: `${px('play')}<span>${t('video.play').toLowerCase()}</span>` });
        btn.addEventListener('click', () => { btn.remove(); void v.play().catch(() => { v.muted = true; void v.play(); }); });
        this.el.append(btn);
        btn.focus();
      });
    };
    v.addEventListener('loadeddata', start);
    v.addEventListener('canplay', start);
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
