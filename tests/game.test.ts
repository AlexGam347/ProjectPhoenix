// Máquina de estados de la partida.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/data';
import type { NightReport } from '../src/rules/night';
import { afterReport, answerQuiz, buy, canEndDay, endDay, finishNight, newGame, toDay, toNight, undo } from '../src/state/game';

const rep = (pass: boolean, n = 1, miss: string[] = pass ? [] : ['agua']) => ({ n, pass, miss } as unknown as NightReport);

describe('partida', () => {
  it('prólogo → noche 1 → informe → pregunta → sueño → día → noche 2', () => {
    let g = toNight(newGame());
    expect(g.phase).toBe('night');
    const dawn = { ...g.base, R: { agua: 18, oxi: 24, com: 24, ene: 24 } };
    g = finishNight(g, rep(true), dawn);
    expect(g.base.R.agua).toBe(18);
    g = afterReport(g);
    expect(g.phase).toBe('quiz');
    g = answerQuiz(g, true);
    expect(g.phase).toBe('dream');
    g = toDay(g);
    expect(g.effortLeft).toBe(CONFIG.effortPerDay + 1);
    for (const id of ['dep1', 'tan1', 'pan1']) g = buy(g, id);
    expect(canEndDay(g)).toBe(true);
    g = endDay(g);
    expect([g.phase, g.n, g.attempt]).toEqual(['night', 2, 1]);
    expect(g.history.purchases.map((p) => p.id)).toEqual(['dep1', 'tan1', 'pan1']);
  });
  it('si falta una barra se repite la noche con los valores de antes de empezarla', () => {
    let g = toNight(newGame());
    const before = g.base.R;
    g = finishNight(g, rep(false), { ...g.base, R: { agua: 1, oxi: 1, com: 1, ene: 1 } });
    expect(g.base.R).toEqual(before);
    g = afterReport(g);
    expect([g.phase, g.attempt, g.history.repeats]).toEqual(['night', 2, [1]]);
  });
  it('la noche 4 no se repite: decide el final', () => {
    const g = afterReport(finishNight({ ...toNight(newGame()), n: 4 }, rep(false, 4, ['agua', 'oxi']), newGame().base));
    expect([g.phase, g.ending]).toEqual(['ending', 'bad']);
  });
  it('deshacer devuelve el esfuerzo y el recurso; con menos de 3 mejoras no se termina el día', () => {
    let g = toDay({ ...newGame(), phase: 'dream' });
    g = buy(g, 'dep1');
    g = undo(g);
    expect([g.dayBought.length, g.effortLeft, g.base.R.agua]).toEqual([0, 10, 16]);
    expect(canEndDay(g)).toBe(false);
  });
});
