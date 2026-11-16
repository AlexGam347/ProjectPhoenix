// Resultado de la jornada (día + noche + sueño): barras animadas, mejoras del día, acciones y sello.
import { CONFIG, UPG_BY_ID } from '../../data';
import { RES, type ProdRoom, type Res } from '../../rules/types';
import type { NightReport } from '../../rules/night';
import { afterResult } from '../../state/game';
import { fill, t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { fmt, h } from '../dom';
import { RES_COLOR, resIcon } from '../icons';
import { ROOMS } from '../room/roomView';
import { upgradeArt } from '../day/upgradeArt';
import { YANA, yanaSprite } from '../yana';
import { px } from '../pixelIcons';
import type { AppApi, Screen } from '../app';

/** Una frase de YANA con la causa principal. */
export function explain(rep: NightReport): string {
  const R = YANA.result;
  if (rep.pass) return R.pass;
  const r = rep.miss[0] as Res;
  const l = rep.lines[r];
  const res = t(`res.${r}.low`), room = ROOMS[r as ProdRoom].name;
  const lost = rep.roomLost[r as ProdRoom];
  if (l.wasted >= 1) return fill(R.wasted, { n: fmt(l.wasted), res });
  if (lost >= 0.9) return fill(R.down, { room, h: fmt(lost) });
  if (l.upkeep >= 3) return fill(R.upkeep, { n: fmt(l.upkeep), res });
  return fill(R.tasks, { res, room });
}

export class ResultScreen implements Screen {
  el: HTMLElement;
  constructor(private app: AppApi) {
    const g = app.game;
    const rep = g.lastReport!;
    const max = CONFIG.barMax;
    const cols = RES.map((r: Res) => {
      const l = rep.lines[r];
      const used = l.crew + l.upkeep + l.spent;
      const chip = (cls: string, html: string, label: string) => h('span', { class: `chip ${cls}`, 'aria-label': label, html });
      const fillEl = h('i', { style: `height:${(l.start / max) * 100}%;background:${RES_COLOR[r]}` });
      requestAnimationFrame(() => requestAnimationFrame(() => (fillEl.style.height = `${(Math.min(l.final, max) / max) * 100}%`)));
      return h('div', { class: `rcol ${l.ok ? 'ok' : 'no'}` },
        h('div', { class: 'rname', html: `${resIcon(r)}<span>${t(`res.${r}`)}</span>` }),
        h('div', { class: 'vbar' }, h('div', { class: 'cap', style: `height:${(Math.min(max, g.base.C[r]) / max) * 100}%` }), fillEl,
          h('div', { class: 'goal', style: `bottom:${(l.goal / max) * 100}%` })),
        h('div', { class: 'rnum' }, h('b', {}, fmt(l.final)), h('span', { html: `${px(l.ok ? 'check' : 'cross')} ${l.goal}` })),
        h('div', { class: 'rchips' },
          l.produced ? chip('plus', `+${fmt(l.produced)}${px('gear')}`, 'produced') : null,
          l.tasks ? chip('plus', `+${fmt(l.tasks)}${px('hand')}`, 'tasks') : null,
          l.wasted >= 0.05 ? chip('waste', `${fmt(l.wasted)}${px('trash')}`, 'lost, storage full') : null,
          used ? chip('minus', `−${fmt(used)}${px('crew')}`, 'used') : null,
          l.storm ? chip('minus', `−${fmt(l.storm)}${px('warn')}`, 'storm') : null));
    });
    const tasks = rep.actions.filter((a) => a.kind === 'task').length;
    const fixes = rep.actions.filter((a) => a.kind === 'repair').length;
    const quiz = g.history.quiz.find((q) => q.n === g.n);
    const bought = g.history.purchases.filter((p) => p.day === g.n - 1).map((p) => UPG_BY_ID[p.id]);
    // En la Noche 4 el sello no desvela el final: eso llega con el epílogo.
    const stampKey = g.n === 4 ? 'result.landing' : rep.pass ? 'result.passed' : 'result.retry';
    const stampCls = g.n === 4 ? 'mid' : rep.pass ? 'good' : 'bad';
    const next = h('button', { class: 'btn primary', onclick: () => { sfx.click(); this.app.go(afterResult(this.app.game)); } },
      (rep.pass || g.n === 4 ? t('result.next') : t('result.retry')).toLowerCase());
    this.el = h('div', { class: 'screen' }, h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
      h('div', { class: 'result term', role: 'dialog', 'aria-label': `${t('hud.night', { n: g.n })} ${t(stampKey)}` },
        h('header', {}, h('h2', {}, t('hud.night', { n: g.n })), h('div', { class: `stamp ${stampCls}` }, t(stampKey))),
        h('div', { class: 'rcols' }, ...cols),
        h('div', { class: 'jrow' },
          bought.length ? h('div', { class: 'jbought' }, ...bought.map((u) => h('span', { class: 'jitem', title: u.name, html: upgradeArt(u, this.app.manifest, 'sm') }))) : null,
          h('span', { class: 'chip', 'aria-label': 'tasks done', html: `${px('hand')} ${tasks}` }),
          h('span', { class: 'chip', 'aria-label': 'repairs', html: `${px('wrench')} ${fixes}` }),
          quiz ? h('span', { class: `chip ${quiz.ok ? 'plus' : 'minus'}`, 'aria-label': 'question', html: `${px('quest')} ${px(quiz.ok ? 'check' : 'cross')}` }) : null),
        h('footer', {},
          h('div', { class: 'yline' }, h('span', { html: yanaSprite(rep.pass ? 'happy' : 'alarm', 'sm') }), explain(rep)),
          next)));
    (rep.pass ? sfx.ok : sfx.bad)();
    setTimeout(() => next.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
