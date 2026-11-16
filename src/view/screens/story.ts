// Hueco para los vídeos prerenderizados (sueños y finales). Con subtítulos y SKIP.
// Si el vídeo aún no existe, se muestra un marco con un icono y continúa solo.
import { t } from '../../i18n/i18n';
import { h } from '../dom';
import { px } from '../pixelIcons';
import type { Screen } from '../app';

export interface VideoDef { video: string; label: string; icon: string; subs?: boolean; ai?: boolean }

export class StoryScreen implements Screen {
  el: HTMLElement;
  private timers: number[] = [];
  private done = false;
  private shownAt = 0;

  constructor(def: VideoDef, private onDone: () => void, audio: { muted: boolean; volume: number } = { muted: false, volume: 1 }) {
    const base = import.meta.env.BASE_URL;
    const skip = h('button', { class: 'btn skip', onclick: () => this.skip() }, t('story.skip').toLowerCase());
    // Los sueños se hicieron con ayuda de IA (docs/RESOURCES.md): etiqueta discreta mientras se ven.
    const ai = def.ai ? h('div', { class: 'ai-label' }, 'AI assisted') : null;
    this.el = h('div', { class: 'screen story' }, skip, ai);
    const v = h('video', { playsinline: true, preload: 'auto', 'aria-label': def.label }) as HTMLVideoElement;
    v.muted = audio.muted;
    v.volume = Math.min(1, Math.max(0, audio.volume));
    // H.264 se reproduce en Chrome, Edge, Firefox y Safari. Subtítulos solo si existen (subs: true en story.en.json).
    const mp4 = h('source', { src: `${base}assets/video/${def.video}.mp4`, type: 'video/mp4' });
    v.append(mp4);
    if (def.subs) v.append(h('track', { kind: 'subtitles', srclang: 'en', label: 'English', src: `${base}assets/video/${def.video}.en.vtt`, default: true }));
    let fellBack = false;
    const placeholder = () => {
      if (fellBack || this.done) return;
      fellBack = true;
      loading.remove();
      v.remove();
      this.el.prepend(h('div', { class: 'video-slot', role: 'img', 'aria-label': def.label },
        h('div', { class: 'slot-icon', html: px(def.icon) }), h('div', { class: 'slot-label' }, def.label), h('div', { class: 'slot-bar' }, h('i'))));
      this.timers.push(window.setTimeout(() => this.finish(), 4000));
    };
    // Solo un fallo real del vídeo (no del archivo de subtítulos) pasa al marco de respaldo.
    // Antes, si a los 2,5 s aún no había cargado nada, el sueño se saltaba solo: pasaba con conexiones lentas.
    v.addEventListener('error', () => { if (v.error) placeholder(); });
    mp4.addEventListener('error', () => { if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) placeholder(); });
    v.addEventListener('ended', () => this.finish());
    // Mientras carga o espera datos: aviso discreto, sin saltar el vídeo.
    const loading = h('div', { class: 'video-loading', role: 'status' }, t('video.loading').toLowerCase());
    const showLoading = (on: boolean) => loading.classList.toggle('on', on);
    v.addEventListener('waiting', () => showLoading(true));
    v.addEventListener('stalled', () => { if (v.readyState < 3) showLoading(true); });
    v.addEventListener('playing', () => showLoading(false));
    v.addEventListener('canplay', () => showLoading(false));
    showLoading(true);
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      v.play().catch(() => {
        // Sonido bloqueado por el navegador (sin gesto reciente): el jugador lo arranca con un toque.
        showLoading(false);
        const btn = h('button', { class: 'video-play', 'aria-label': t('video.play'), html: `${px('play')}<span>${t('video.play').toLowerCase()}</span>` });
        btn.addEventListener('click', () => { btn.remove(); void v.play().catch(() => { v.muted = true; void v.play(); }); });
        this.el.append(btn);
        btn.focus();
      });
    };
    v.addEventListener('loadeddata', start);
    v.addEventListener('canplay', start);
    this.el.prepend(v, loading);
    // SKIP no recibe el foco al aparecer y no responde el primer segundo: así un Enter, un Espacio o un clic
    // que venían de la pantalla anterior no se saltan el sueño.
    this.shownAt = performance.now();
    this.el.tabIndex = -1;
    setTimeout(() => this.el.focus({ preventScroll: true }), 50);
  }

  private skip() {
    if (performance.now() - this.shownAt < 1000) return;
    this.finish();
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  destroy() { this.timers.forEach(clearTimeout); this.el.querySelector('video')?.pause(); this.el.remove(); }
}
