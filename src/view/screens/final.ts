// Resumen final tras la Noche 4: final, mejoras por día y lo aprendido.
import story from '../../data/story.en.json';
import { UPG_BY_ID } from '../../data';
import { fill, t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { h } from '../dom';
import { upgradeArt } from '../day/upgradeArt';
import { px } from '../pixelIcons';
import { yanaSprite } from '../yana';
import type { AppApi, Screen } from '../app';

export class FinalScreen implements Screen {
  el: HTMLElement;
  constructor(private app: AppApi) {
    const g = app.game;
    const end = g.ending!;
    const def = story.endings[end];
    const vars = { res: (g.lastReport?.miss[0] ? t(`res.${g.lastReport.miss[0]}`) : '') };
    const days = [1, 2, 3].map((d) => h('div', { class: 'fday' }, h('b', {}, t('hud.day', { n: d })),
      ...g.history.purchases.filter((p) => p.day === d).map((p) => h('span', { class: 'jitem', title: UPG_BY_ID[p.id].name, html: upgradeArt(UPG_BY_ID[p.id], this.app.manifest, 'sm') }))));
    const ok = g.history.quiz.filter((q) => q.ok).length;
    this.el = h('div', { class: 'screen' }, h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
      h('div', { class: `final term ${end}`, role: 'dialog', 'aria-label': fill(def.title, vars) },
        h('div', { class: `stamp ${end}` }, t(`result.${end}`)),
        h('h2', {}, fill(def.title, vars)),
        h('p', { class: 'yline' }, h('span', { html: yanaSprite(end === 'good' ? 'happy' : end === 'mid' ? 'hint' : 'alarm', 'sm') }), fill(def.yana, vars)),
        h('div', { class: 'fdays' }, ...days),
        h('div', { class: 'jrow' },
          h('span', { class: 'chip', 'aria-label': 'nights repeated', html: `${px('repeat')} ${g.history.repeats.length}` }),
          h('span', { class: 'chip', 'aria-label': 'right answers', html: `${px('quest')} ${ok}/${g.history.quiz.length}` }),
          h('span', { class: 'chip', 'aria-label': 'facts learned', html: `${px('bulb')} ${g.history.facts.length}` })),
        h('footer', {},
          h('button', { class: 'btn', onclick: () => { sfx.click(); this.app.credits(); } }, t('final.credits').toLowerCase()),
          h('button', { class: 'btn primary', onclick: () => { sfx.click(); this.app.newGame(); } }, t('final.again').toLowerCase()))));
    (end === 'good' ? sfx.ok : end === 'bad' ? sfx.bad : sfx.hour)();
  }
  destroy() { this.el.remove(); }
}
