// Máquina de estados de la partida. Pura: cada transición devuelve un Game nuevo.
import { CONFIG, UPGRADES, UPG_BY_ID } from '../data';
import { applyUpgrade, canBuy, cloneBase, endingFor, newBase, type Ending } from '../rules/economy';
import type { NightReport } from '../rules/night';
import type { Base } from '../rules/types';

export type Phase = 'menu' | 'prologue' | 'night' | 'report' | 'quiz' | 'dream' | 'day' | 'ending' | 'credits';

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
    version: 1, phase: 'prologue', n: 1, base, preNight: cloneBase(base), attempt: 1, effortBonus: 0,
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
  return { ...g, phase: 'report', lastReport: rep, base: keep ? dawn : cloneBase(g.preNight) };
}

export function afterReport(g: Game): Game {
  const rep = g.lastReport!;
  if (g.n === 4) return { ...g, phase: 'ending', ending: endingFor(rep.miss.length) };
  if (rep.pass) return { ...g, phase: 'quiz' };
  return { ...g, phase: 'night', attempt: g.attempt + 1, history: { ...g.history, repeats: [...g.history.repeats, g.n] } };
}

export function answerQuiz(g: Game, ok: boolean): Game {
  return { ...g, phase: 'dream', effortBonus: ok ? 1 : 0, history: { ...g.history, quiz: [...g.history.quiz, { n: g.n, ok }] } };
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
