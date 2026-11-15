// Máquina de estados de la partida (jornada estilo FNAF 6).
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/data';
import type { NightReport } from '../src/rules/night';
import { afterResult, afterVideo, answerQuiz, buy, canEndDay, endDay, finishNight, newGame, toDay, undo, type Game } from '../src/state/game';

const rep = (pass: boolean, n = 1, miss: string[] = pass ? [] : ['agua']) => ({ n, pass, miss } as unknown as NightReport);
const dawnOf = (g: Game) => ({ ...g.base, R: { agua: 18, oxi: 24, com: 24, ene: 24 } });

describe('jornada', () => {
  it('Sueño 1 → Noche 1 → Pregunta → Resultado → Día 1 → Noche 2 → Pregunta → Sueño 2 → Resultado', () => {
    let g = newGame();
    expect([g.phase, g.n]).toEqual(['dream', 1]);
    g = afterVideo(g);
    expect(g.phase).toBe('night');
    g = finishNight(g, rep(true), dawnOf(g));
    expect(g.phase).toBe('quiz');
    g = answerQuiz(g, true);
    expect(g.phase).toBe('result');
    g = afterResult(g);
    expect([g.phase, g.effortLeft]).toEqual(['day', CONFIG.effortPerDay + 1]);
    for (const id of ['dep1', 'tan1', 'pan1']) g = buy(g, id);
    expect(canEndDay(g)).toBe(true);
    g = endDay(g);
    expect([g.phase, g.n]).toEqual(['night', 2]);
    g = finishNight(g, rep(true, 2), dawnOf(g));
    g = answerQuiz(g, false);
    expect(g.phase).toBe('dream');
    g = afterVideo(g);
    expect(g.phase).toBe('result');
  });
  it('si falla, se repite la noche con los valores de antes y sin repetir pregunta ni sueño', () => {
    let g = endDay({ ...toDay({ ...newGame(), n: 1 }), dayBought: ['dep1', 'tan1', 'pan1'] });
    const before = g.base.R;
    g = finishNight(g, rep(false, 2), { ...g.base, R: { agua: 1, oxi: 1, com: 1, ene: 1 } });
    expect(g.base.R).toEqual(before);
    g = answerQuiz(g, true);
    g = afterVideo(g);
    g = afterResult(g);
    expect([g.phase, g.attempt, g.history.repeats]).toEqual(['night', 2, [2]]);
    g = finishNight(g, rep(true, 2), dawnOf(g));
    expect(g.phase).toBe('result');
  });
  it('la Noche 4 va al vídeo del final, luego al resultado y al resumen', () => {
    let g = finishNight({ ...newGame(), phase: 'night', n: 4 }, rep(false, 4, ['agua', 'oxi']), newGame().base);
    expect([g.phase, g.ending]).toEqual(['ending', 'bad']);
    g = afterVideo(g);
    expect(g.phase).toBe('result');
    expect(afterResult(g).phase).toBe('final');
  });
  it('el esfuerzo se gasta al construir; deshacer lo devuelve', () => {
    let g = toDay({ ...newGame(), phase: 'result' });
    g = buy(g, 'dep1');
    expect(g.effortLeft).toBe(8);
    g = undo(g);
    expect([g.dayBought.length, g.effortLeft, g.base.R.agua]).toEqual([0, 10, 16]);
    expect(canEndDay(g)).toBe(false);
  });
});
