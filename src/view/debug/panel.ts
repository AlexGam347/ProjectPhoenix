// Panel de depuración (?debug=1): saltar a cualquier fase, acelerar el reloj y ver zonas.
// También sirve para grabar el vídeo de la entrega.
import { CONFIG, FAULTS, NIGHTS, TASKS, UPGRADES } from '../../data';
import { botNight } from '../../rules/bot';
import { endingFor } from '../../rules/economy';
import { dawnBase, startNight } from '../../rules/night';
import { PRESETS } from '../../rules/simulate';
import { buy, newGame, toDay, toNight, type Game, type Phase } from '../../state/game';
import { h } from '../dom';
import type { App } from '../app';

/** Partida simulada (plan equilibrado, jugando bien) hasta la fase pedida. */
export function gameAt(phase: Phase, n: number, plan = PRESETS.equilibrado): Game {
  let g = toNight(newGame());
  for (let k = 1; k < n || (k === n && phase !== 'night'); k++) {
    const def = NIGHTS.find((d) => d.n === k)!;
    const ctx = { cfg: CONFIG, def, faults: FAULTS, tasks: TASKS };
    const s = startNight(ctx, g.base, k * 7);
    const rep = botNight(ctx, s, 1);
    g = { ...g, base: dawnBase(ctx, s), lastReport: rep };
    if (k === n) break;
    g = toDay({ ...g, n: k });
    for (const u of UPGRADES.filter((u) => plan[u.id] === k)) g = buy(g, u.id);
    g = { ...g, history: { ...g.history, purchases: [...g.history.purchases, ...g.dayBought.map((id) => ({ day: k, id }))] } };
    g = toNight({ ...g, n: k + 1, dayBought: [], dayStart: null });
  }
  g = { ...g, n };
  if (phase === 'day') g = toDay(g);
  else if (phase === 'report' || phase === 'quiz' || phase === 'dream') g = { ...g, phase };
  else if (phase === 'ending') g = { ...g, phase, ending: endingFor(g.lastReport?.miss.length ?? 0) };
  else g = toNight(g);
  return g;
}

export function mountDebug(app: App) {
  const b = (label: string, fn: () => void) => h('button', { onclick: fn }, label);
  const speed = h('span', {}, 'x1');
  const el = h('div', { class: 'debug' },
    h('b', {}, 'DEBUG'),
    h('div', { class: 'row' }, ...[1, 2, 3, 4].map((n) => b(`N${n}`, () => app.go(gameAt('night', n))))),
    h('div', { class: 'row' }, ...[1, 2, 3].map((n) => b(`Día ${n}`, () => app.go(gameAt('day', n))))),
    h('div', { class: 'row' }, b('Informe N1', () => app.go(gameAt('report', 1))), b('Pregunta', () => app.go(gameAt('quiz', 1))), b('Sueño', () => app.go(gameAt('dream', 2)))),
    h('div', { class: 'row' },
      b('N4 sin blindaje', () => app.go(gameAt('night', 4, { ...PRESETS.equilibrado, bli1: 0 }))),
      b('Final', () => app.go(gameAt('ending', 4))),
      b('Prólogo', () => app.go({ ...newGame(), phase: 'prologue' }))),
    h('div', { class: 'row' }, b('Reloj ×1/×10', () => { app.debug.speed = app.debug.speed === 1 ? 10 : 1; speed.textContent = `x${app.debug.speed}`; }), speed,
      b('Zonas', () => app.stage.classList.toggle('show-zones'))),
    h('div', { class: 'row' }, b('Menú', () => app.menu()), b('Créditos', () => app.credits())));
  document.body.append(el);
  (window as unknown as { phoenix: unknown }).phoenix = { app, gameAt };
}
