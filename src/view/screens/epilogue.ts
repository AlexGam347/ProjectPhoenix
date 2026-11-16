// Epílogo tras la cinemática final: negro, un texto que sube en perspectiva («once upon a time, humanity…»),
// la parte propia de cada final y, con un fundido, el cartel GOOD / MID / BAD ENDING.
import story from '../../data/story.en.json';
import { fill, t } from '../../i18n/i18n';
import { music, sfx } from '../../audio/audio';
import { h } from '../dom';
import type { Screen } from '../app';

export type Ending = 'good' | 'mid' | 'bad';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class EpilogueScreen implements Screen {
  el: HTMLElement;
  private timers: number[] = [];
  private stage: 'crawl' | 'card' | 'done' = 'crawl';
  private shownAt = performance.now();
  private crawlWrap: HTMLElement;
  private card: HTMLElement;
  private skipBtn: HTMLElement;
  private onKey = (e: KeyboardEvent) => {
    if (this.stage === 'card' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { e.preventDefault(); this.finish(); }
  };

  constructor(end: Ending, res: string, private onDone: () => void) {
    const vars = { res };
    const para = (s: string) => h('p', {}, fill(s, vars));
    const crawl = h('div', { class: 'crawl' },
      ...story.epilogue.intro.map(para),
      h('div', { class: 'crawl-gap', 'aria-hidden': 'true' }),
      ...story.epilogue[end].map(para));
    this.crawlWrap = h('div', { class: 'crawl-wrap' }, crawl);
    this.card = h('div', { class: `end-card ${end}`, role: 'status' }, h('div', { class: `stamp ${end}` }, fill(t('ending.card'), { end: t(`result.${end}`) })));
    this.skipBtn = h('button', { class: 'btn skip', onclick: () => this.skip() }, t('story.skip').toLowerCase());
    this.el = h('div', { class: 'screen epilogue', role: 'dialog', 'aria-label': 'Epilogue' }, this.crawlWrap, this.card, this.skipBtn);
    this.card.addEventListener('click', () => { if (this.stage === 'card') this.finish(); });
    window.addEventListener('keydown', this.onKey);
    void music.play('menu', 0.4);

    // La distancia y la duración dependen del texto y del tamaño del escenario: se miden tras el primer pintado.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.stage !== 'crawl') return;
      const chars = crawl.textContent?.length ?? 1000;
      // Unos 18 caracteres por segundo: lo bastante lento para leerlo con calma a los 7 años.
      const secs = Math.min(85, Math.max(55, chars / 18));
      // Empieza con la primera línea ya asomando por abajo.
      crawl.style.setProperty('--from', `${this.crawlWrap.clientHeight * 0.5}px`);
      crawl.style.setProperty('--to', `${-crawl.offsetHeight}px`);
      crawl.style.animationDuration = `${secs}s`;
      crawl.classList.add('run');
      crawl.addEventListener('animationend', () => void this.toCard());
      // Respaldo por si el navegador no lanza animationend (pestaña en segundo plano).
      this.timers.push(window.setTimeout(() => void this.toCard(), (secs + 1.5) * 1000));
    }));
    this.el.tabIndex = -1;
    setTimeout(() => this.el.focus({ preventScroll: true }), 50);
  }

  /** SKIP no responde el primer segundo (un clic que venía del vídeo no se salta el epílogo). */
  private skip() {
    if (performance.now() - this.shownAt < 1000) return;
    if (this.stage === 'crawl') void this.toCard(); else this.finish();
  }

  private async toCard() {
    if (this.stage !== 'crawl') return;
    this.stage = 'card';
    this.crawlWrap.classList.add('out');
    music.stop(2.5);
    await wait(1600);
    if (this.stage !== 'card') return;
    this.crawlWrap.remove();
    this.card.classList.add('on');
    sfx.hour();
    this.timers.push(window.setTimeout(() => this.finish(), 5000));
  }

  private finish() {
    if (this.stage === 'done') return;
    this.stage = 'done';
    this.el.classList.add('leaving');
    this.timers.push(window.setTimeout(() => this.onDone(), 700));
  }

  destroy() {
    this.timers.forEach(clearTimeout);
    window.removeEventListener('keydown', this.onKey);
    this.el.remove();
  }
}
