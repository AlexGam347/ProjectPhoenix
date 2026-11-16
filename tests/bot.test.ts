import { describe, expect, it } from 'vitest';
import { CONFIG, FAULTS, NIGHTS, TASKS, UPGRADES } from '../src/data';
import { botGame } from '../src/rules/bot';
import type { Ending } from '../src/rules/economy';
import { PRESETS, simulate } from '../src/rules/simulate';

const W = { cfg: CONFIG, nights: NIGHTS, faults: FAULTS, tasks: TASKS, upgrades: UPGRADES };
const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const RANK: Record<Ending, number> = { good: 0, mid: 1, bad: 2 };
const mode = (xs: Ending[]) =>
  (Object.keys(RANK) as Ending[]).reduce((a, b) => (xs.filter((x) => x === b).length > xs.filter((x) => x === a).length ? b : a));

// Calibración del motor real contra simulate() (las averías y salas de la tormenta solar van por semilla).
// Lecciones del diseño que el juego real debe respetar sea cual sea la suerte de las averías.
describe('lecciones del diseño en el juego real', () => {
  it('solo máquinas acaba mal siempre', () => {
    for (const k of [1, 0.8, 0.6]) for (const seed of SEEDS) expect(botGame(W, PRESETS.maquinas, k, seed).end).toBe('bad');
  });
  it('el plan equilibrado nunca acaba mal', () => {
    for (const k of [1, 0.8, 0.6]) for (const seed of SEEDS) expect(botGame(W, PRESETS.equilibrado, k, seed).end).not.toBe('bad');
  });
  it('el plan equilibrado acaba bien en la mayoría de partidas incluso jugando con dificultades', () => {
    expect(mode(SEEDS.map((seed) => botGame(W, PRESETS.equilibrado, 0.6, seed).end))).toBe('good');
  });
});

describe('el motor real, jugado por un bot, reproduce los finales de simulate()', () => {
  for (const plan of ['equilibrado', 'maquinas', 'almacen'] as const) {
    // El motor cobra los gastos al final de su hora (con la barra llena se notan) y simulate() es un resumen por
    // noche, así que alguna semilla con mala suerte puede quedar un nivel por debajo; el final habitual debe coincidir.
    it(`${plan}: jugando muy bien, el mismo final habitual y nunca a más de un nivel`, () => {
      const sim = simulate(CONFIG, UPGRADES, TASKS, PRESETS[plan], 1).end;
      const ends = SEEDS.map((seed) => botGame(W, PRESETS[plan], 1, seed).end);
      expect(mode(ends)).toBe(sim);
      for (const e of ends) expect(Math.abs(RANK[e] - RANK[sim])).toBeLessThanOrEqual(1);
    });
    for (const skill of [0.8, 0.6]) {
      it(`${plan}: habilidad ${skill}, nunca a más de un nivel de simulate()`, () => {
        const sim = simulate(CONFIG, UPGRADES, TASKS, PRESETS[plan], skill).end;
        const ends = SEEDS.map((seed) => botGame(W, PRESETS[plan], skill, seed).end);
        for (const e of ends) expect(Math.abs(RANK[e] - RANK[sim])).toBeLessThanOrEqual(1);
      });
    }
  }
});
