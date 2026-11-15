// Final: cinemática (si existe) y resumen de la partida con lo aprendido.
import story from '../../data/story.es.json';
import { UPG_BY_ID } from '../../data';
import { fill, t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { h } from '../dom';
import { StoryScreen } from './story';
import type { AppApi, Screen } from '../app';

export class EndingScreen implements Screen {
  el: HTMLElement;
  private sub: StoryScreen | null = null;
  constructor(private app: AppApi) {
    const g = app.game;
    const end = g.ending!;
    const def = story.endings[end];
    const missing = g.lastReport?.miss.map((r) => t(`res.${r}.low`)) ?? [];
    const vars = { res: missing[0] ?? '' };
    this.el = h('div', { class: 'screen' });
    const show = () => {
      this.sub?.destroy();
      this.sub = null;
      const days = [1, 2, 3].map((d) => h('li', {}, `Día ${d}: ${g.history.purchases.filter((p) => p.day === d).map((p) => UPG_BY_ID[p.id].name).join(', ') || '—'}`));
      const ok = g.history.quiz.filter((q) => q.ok).length;
      this.el.replaceChildren(h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
        h('div', { class: `ending panel ${end}`, role: 'dialog', 'aria-label': def.title },
          h('h2', {}, fill(def.title, vars)),
          h('p', { style: 'margin:0;font-size:1.1em' }, fill(def.text, vars)),
          h('p', { style: 'margin:0;color:#9fd6ff' }, `YANA: ${fill(def.yana, vars)}`),
          h('h3', {}, t('ending.summary')),
          h('div', { class: 'grid' },
            h('div', {}, h('b', {}, t('ending.purchases')), h('ul', {}, ...days)),
            h('div', {}, h('b', {}, `${t('ending.repeats')}: `), g.history.repeats.length ? g.history.repeats.map((n) => `Noche ${n}`).join(', ') : 'ninguna',
              h('br'), h('b', {}, `${t('ending.quiz')}: `), `${ok} de ${g.history.quiz.length}`),
            h('div', { style: 'grid-column:1/-1' }, h('b', {}, `${t('ending.facts')} (${g.history.facts.length})`),
              h('ul', {}, ...g.history.facts.slice(0, 10).map((f) => h('li', {}, f))))),
          h('footer', {},
            h('button', { class: 'btn', onclick: () => { sfx.click(); this.app.credits(); } }, t('ending.credits')),
            h('button', { class: 'btn primary', onclick: () => { sfx.click(); this.app.newGame(); } }, `↻ ${t('ending.again')}`))));
      (end === 'good' ? sfx.ok : end === 'bad' ? sfx.bad : sfx.hour)();
    };
    // Si existe la cinemática, se ve primero; si no, directamente el resumen.
    this.sub = new StoryScreen({ title: fill(def.title, vars), video: def.video, lines: [] }, show, { onNoVideo: show });
    if (this.sub) this.el.append(this.sub.el);
  }
  destroy() { this.sub?.destroy(); this.el.remove(); }
}
