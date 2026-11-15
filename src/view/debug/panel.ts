// Panel de depuración (?debug=1): saltar a cualquier fase, acelerar el reloj y ver zonas.
// También sirve para grabar el vídeo de la entrega.
import { CONFIG, FAULTS, NIGHTS, TASKS, UPGRADES } from '../../data';
import { botNight } from '../../rules/bot';
import { endingFor } from '../../rules/economy';
import { dawnBase, startNight } from '../../rules/night';
import { PRESETS } from '../../rules/simulate';
import { buy, endDay, newGame, toDay, toNight, type Game, type Phase } from '../../state/game';
import { h } from '../dom';
import type { App } from '../app';

/** Partida simulada (plan equilibrado, jugando bien) hasta la fase pedida. */
export function gameAt(phase: Phase, n: number, plan = PRESETS.equilibrado): Game {
  let g = toNight({ ...newGame(), lastReport: null });
  for (let k = 1; k <= n; k++) {
    if (k === n && (phase === 'night' || phase === 'day' && false)) break;
    const def = NIGHTS.find((d) => d.n === k)!;
    const ctx = { cfg: CONFIG, def, faults: FAULTS, tasks: TASKS };
    const s = startNight(ctx, g.base, k * 7);
    const rep = botNight(ctx, s, 1);
    g = { ...g, n: k, base: dawnBase(ctx, s), lastReport: rep };
    if (k === n) break;
    g = toDay(g);
    for (const u of UPGRADES.filter((u) => plan[u.id] === k)) g = buy(g, u.id);
    g = endDay(g);
  }
  g = { ...g, n };
  if (phase === 'day') return toDay(g);
  if (phase === 'night') return toNight(g);
  if (phase === 'final' || phase === 'ending') return { ...g, phase, ending: endingFor(g.lastReport?.miss.length ?? 0) };
  return { ...g, phase };
}

export function mountDebug(app: App) {
  const b = (label: string, fn: () => void) => h('button', { onclick: fn }, label);
  const speed = h('span', {}, 'x1');
  const el = h('div', { class: 'debug' },
    h('b', {}, 'DEBUG'),
    h('div', { class: 'row' }, ...[1, 2, 3, 4].map((n) => b(`N${n}`, () => app.go(gameAt('night', n))))),
    h('div', { class: 'row' }, ...[1, 2, 3].map((n) => b(`D${n}`, () => app.go(gameAt('day', n))))),
    h('div', { class: 'row' }, b('Quiz', () => app.go(gameAt('quiz', 1))), b('Dream2', () => app.go(gameAt('dream', 2))), b('Result', () => app.go(gameAt('result', 2)))),
    h('div', { class: 'row' },
      b('N4 no shield', () => app.go(gameAt('night', 4, { ...PRESETS.equilibrado, bli1: 0 }))),
      b('Ending', () => app.go(gameAt('ending', 4))), b('Final', () => app.go(gameAt('final', 4))), b('Dream1', () => app.go(newGame()))),
    h('div', { class: 'row' }, b('Clock x1/x10', () => { app.debug.speed = app.debug.speed === 1 ? 10 : 1; speed.textContent = `x${app.debug.speed}`; }), speed,
      b('Zones', () => app.stage.classList.toggle('show-zones'))),
    h('div', { class: 'row' }, b('Menu', () => app.menu()), b('Credits', () => app.credits())));
  document.body.append(el);
  (window as unknown as { phoenix: unknown }).phoenix = { app, gameAt };
}
