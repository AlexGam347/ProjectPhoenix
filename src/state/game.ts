// Máquina de estados de la partida. Pura: cada transición devuelve un Game nuevo.
import { CONFIG, UPGRADES, UPG_BY_ID } from '../data';
import { applyUpgrade, canBuy, cloneBase, endingFor, newBase, type Ending } from '../rules/economy';
import type { NightReport } from '../rules/night';
import type { Base } from '../rules/types';

// Jornada: Sueño 1 → Noche 1 → Pregunta → Resultado → Día → Noche → Pregunta → Sueño → Resultado …
// La Noche 4 termina con el vídeo del final, el resultado y el resumen final.
export type Phase = 'menu' | 'dream' | 'night' | 'quiz' | 'ending' | 'result' | 'day' | 'final' | 'credits';

export interface History {
  purchases: { day: number; id: string }[];
  repeats: number[];
  quiz: { n: number; ok: boolean }[];
  facts: string[];
}

export interface Game {
  version: 1;
  phase: Phase;
  n: number; // noche actual (en el día, el día que sigue a la noche n)
  base: Base;
  preNight: Base;
  attempt: number;
  effortBonus: number;
  dayStart: Base | null;
  dayBought: string[];
  effortLeft: number;
  lastReport: NightReport | null;
  ending: Ending | null;
  history: History;
  seenFaults: string[];
  yanaSeen: string[];
}

export function newGame(): Game {
  const base = newBase(CONFIG);
  return {
    version: 1, phase: 'dream', n: 1, base, preNight: cloneBase(base), attempt: 1, effortBonus: 0,
    dayStart: null, dayBought: [], effortLeft: 0, lastReport: null, ending: null,
    history: { purchases: [], repeats: [], quiz: [], facts: [] }, seenFaults: [], yanaSeen: [],
  };
}

export const nightSeed = (g: Game) => g.n * 1000 + g.attempt * 17;

export function toNight(g: Game): Game {
  return { ...g, phase: 'night', preNight: cloneBase(g.base), lastReport: null };
}

/** Al amanecer: si se llega a la meta (o es la noche 4) la base queda como amaneció; si no, vuelve a la de antes. */
export function finishNight(g: Game, rep: NightReport, dawn: Base): Game {
  const keep = rep.pass || g.n === 4;
  const next = { ...g, lastReport: rep, base: keep ? dawn : cloneBase(g.preNight) };
  // Noche 4: informe de la última noche y después el final (cinemática, epílogo y cartel).
  if (g.n === 4) return { ...next, phase: 'result', ending: endingFor(rep.miss.length) };
  // La pregunta de antes de dormir se hace una vez por noche (no se repite al repetir la noche).
  if (g.history.quiz.some((q) => q.n === g.n)) return afterSleep(next);
  return { ...next, phase: 'quiz' };
}

/** Tras dormir: sueño en las noches 2 y 3 (no al repetir una noche); después, el resultado de la jornada. */
function afterSleep(g: Game): Game {
  if ((g.n === 2 || g.n === 3) && g.attempt === 1) return { ...g, phase: 'dream' };
  return { ...g, phase: 'result' };
}

export function answerQuiz(g: Game, ok: boolean): Game {
  return afterSleep({ ...g, effortBonus: ok ? 1 : 0, history: { ...g.history, quiz: [...g.history.quiz, { n: g.n, ok }] } });
}

/** Al terminar un vídeo: el Sueño 1 abre la partida; el final lleva al resumen; los demás, al resultado. */
export function afterVideo(g: Game): Game {
  if (g.phase === 'dream' && !g.lastReport) return toNight(g);
  if (g.phase === 'ending') return { ...g, phase: 'final' };
  return { ...g, phase: 'result' };
}

export function afterResult(g: Game): Game {
  const rep = g.lastReport!;
  if (g.n === 4) return { ...g, phase: 'ending' };
  if (rep.pass) return toDay(g);
  return toNight({ ...g, attempt: g.attempt + 1, base: cloneBase(g.preNight), history: { ...g.history, repeats: [...g.history.repeats, g.n] } });
}

export function toDay(g: Game): Game {
  return { ...g, phase: 'day', dayStart: cloneBase(g.base), dayBought: [], effortLeft: CONFIG.effortPerDay + g.effortBonus };
}

export function buy(g: Game, id: string): Game {
  const u = UPG_BY_ID[id];
  if (!u || !canBuy(g.base, u, g.effortLeft).ok) return g;
  return { ...g, base: applyUpgrade(g.base, u), effortLeft: g.effortLeft - u.effort, dayBought: [...g.dayBought, id] };
}

export function undo(g: Game): Game {
  if (!g.dayStart || !g.dayBought.length) return g;
  const keep = g.dayBought.slice(0, -1);
  let base = cloneBase(g.dayStart);
  let effort = CONFIG.effortPerDay + g.effortBonus;
  for (const id of keep) { base = applyUpgrade(base, UPG_BY_ID[id]); effort -= UPG_BY_ID[id].effort; }
  return { ...g, base, effortLeft: effort, dayBought: keep };
}

export const affordable = (g: Game) => UPGRADES.filter((u) => canBuy(g.base, u, g.effortLeft).ok);
export const MIN_PER_DAY = 3;
export const canEndDay = (g: Game) => g.dayBought.length >= MIN_PER_DAY || affordable(g).length === 0;

export function endDay(g: Game): Game {
  const purchases = [...g.history.purchases, ...g.dayBought.map((id) => ({ day: g.n, id }))];
  return toNight({ ...g, n: g.n + 1, attempt: 1, effortBonus: 0, dayStart: null, dayBought: [], history: { ...g.history, purchases } });
}

export function learn(g: Game, fact: string): Game {
  if (!fact || g.history.facts.includes(fact)) return g;
  return { ...g, history: { ...g.history, facts: [...g.history.facts, fact] } };
}
