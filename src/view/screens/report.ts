// Informe del amanecer: cuánto subió, cuánto se perdió por falta de almacén y cuánto bajó, con explicación de YANA.
import { CONFIG } from '../../data';
import { RES, type ProdRoom, type Res } from '../../rules/types';
import { afterReport } from '../../state/game';
import { fill, t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { fmt, h } from '../dom';
import { RES_COLOR, resIcon } from '../icons';
import { ROOMS } from '../room/roomView';
import { SB } from '../room/placeholder/engine.js';
import { YANA } from '../yana';
import type { AppApi, Screen } from '../app';

export function explain(rep: NonNullable<AppApi['game']['lastReport']>): string[] {
  const R = YANA.report;
  if (rep.pass) return [R.pass];
  const out: string[] = [];
  for (const r of rep.miss) {
    const l = rep.lines[r];
    const res = t(`res.${r}.low`);
    const room = ROOMS[r as ProdRoom].name;
    const lost = rep.roomLost[r as ProdRoom];
    if (l.wasted >= 1) out.push(fill(R.wasted, { n: fmt(l.wasted), res }));
    else if (lost >= 0.9) out.push(fill(R.down, { room, h: fmt(lost) }));
    else if (l.upkeep >= 3) out.push(fill(R.upkeep, { n: fmt(l.upkeep), res }));
    else out.push(fill(R.tasks, { res, room }));
  }
  out.push(fill(R.fail, { list: rep.miss.map((r) => t(`res.${r}.low`)).join(', ') }));
  return out;
}

export class ReportScreen implements Screen {
  el: HTMLElement;
  constructor(private app: AppApi) {
    const g = app.game;
    const rep = g.lastReport!;
    const max = CONFIG.barMax;
    const rows = RES.map((r: Res) => {
      const l = rep.lines[r];
      const chip = (cls: string, txt: string) => h('span', { class: `chip ${cls}` }, txt);
      const detail = h('div', { class: 'detail' },
        chip('', `${fmt(l.start)} ${t('report.start')}`),
        l.produced ? chip('plus', `+${fmt(l.produced)} ${t('report.produced')}`) : null,
        l.tasks ? chip('plus', `+${fmt(l.tasks)} ${t('report.tasks')}`) : null,
        l.wasted >= 0.05 ? chip('waste', `−${fmt(l.wasted)} ${t('report.wasted')}`) : null,
        l.crew ? chip('minus', `−${fmt(l.crew)} ${t('report.crew')}`) : null,
        l.upkeep ? chip('minus', `−${fmt(l.upkeep)} ${t('report.upkeep')}`) : null,
        l.spent ? chip('minus', `−${fmt(l.spent)} ${t('report.spent')}`) : null,
        l.storm ? chip('minus', `−${fmt(l.storm)} ${t('report.storm')}`) : null);
      const fill = h('i', { style: `width:${(l.start / max) * 100}%;background:${RES_COLOR[r]}` });
      requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${(l.final / max) * 100}%`)));
      return h('div', { class: 'rrow' },
        h('div', { class: 'name', html: `${resIcon(r)} ${t(`res.${r}`)}` }), detail,
        h('div', { class: 'res' }, h('b', {}, fmt(l.final)), ' ', h('small', { class: 'muted' }, t('hud.goal', { v: l.goal })), ' ', h('span', { class: l.ok ? 'ok' : 'no' }, l.ok ? '✓' : '✗')),
        h('div', { class: 'mini' }, fill, h('div', { class: 'goal', style: `left:${(l.goal / max) * 100}%` })));
    });
    const lines = explain(rep);
    const yana = h('div', { style: 'display:flex;gap:calc(14 * var(--u));align-items:center' },
      h('div', { style: 'width:calc(110 * var(--u));flex:none', html: `<svg viewBox="-70 -125 190 200">${SB.ari(rep.pass ? 'ok' : 'alarm')}</svg>` }),
      h('div', {}, h('b', { class: 'mono', style: 'color:#7fd3ff' }, 'YANA'), ...lines.map((l) => h('p', { style: 'margin:.2em 0' }, l))));
    const btnLabel = g.n === 4 ? t('report.toEnding') : rep.pass ? t('report.continue') : t('report.retry');
    const btn = h('button', { class: `btn ${rep.pass || g.n === 4 ? 'primary' : 'danger'}`, onclick: () => { sfx.click(); this.app.go(afterReport(this.app.game)); } }, `${btnLabel} ▶`);
    this.el = h('div', { class: 'screen' }, h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
      h('div', { class: 'report panel', role: 'dialog', 'aria-label': t('report.title', { n: g.n }) },
        h('h2', {}, t('report.title', { n: g.n })), h('div', { class: 'rows' }, ...rows), yana, h('footer', {}, btn)));
    (rep.pass ? sfx.ok : sfx.bad)();
    setTimeout(() => btn.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
