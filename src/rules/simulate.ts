// Port literal de simulate(plan, skill) del dossier (sección 10, app.js).
// Es la referencia de equilibrio: si se cambian cifras, tests/simulate.test.ts debe seguir en verde.
import { RES, type Config, type Res, type Task, type Upgrade, type Vec } from './types';
import { endingFor, type Ending } from './economy';

export type Plan = Record<string, number>; // id de mejora → día de compra (1..3)

export interface SimNight {
  n: number;
  R: Vec;
  C: Vec;
  miss: Res[];
  slots: number;
  repairs: number;
  tasksDone: Vec;
}
export interface SimDay {
  n: number;
  bought: number;
  effort: number;
  notes: string[];
}
export interface SimResult {
  nights: SimNight[];
  days: SimDay[];
  end: Ending;
  miss: Res[];
}

export function simulate(cfg: Config, upgrades: Upgrade[], taskDefs: Task[], plan: Plan, skill: number): SimResult {
  const R = { ...cfg.R0 }, C = { ...cfg.C0 }, P = { ...cfg.P0 }, U = { ...cfg.U0 };
  let nuc = 0;
  const flags = new Set<string>();
  const owned = new Set<string>();
  const byId = Object.fromEntries(upgrades.map((u) => [u.id, u]));
  const nights: SimNight[] = [], days: SimDay[] = [];
  // Efecto de la tarea de cada sala, con el signo del dossier (+ sube, − gasta).
  const tasks = {} as Record<Res, Partial<Vec>>;
  for (const t of taskDefs) {
    const e: Partial<Vec> = { ...t.plus };
    for (const [r, v] of Object.entries(t.minus)) e[r as Res] = -v!;
    tasks[t.room] = e;
  }
  for (let n = 1; n <= 4; n++) {
    let upt = 0.6 + 0.4 * skill, repairs = 1, solar = 1;
    let extra: Partial<Vec> = {};
    if (n === 1) upt = 1;
    if (n === 4) {
      const b = flags.has('blindaje');
      upt = (b ? 0.8 : 0.45) * (0.75 + 0.25 * skill);
      repairs = b ? 2 : 4;
    }
    if (n === 3) {
      const p = flags.has('prefiltros');
      repairs = p ? 1 : 3;
      extra = { ene: 3 * (p ? 1 : 3) };
      if (!flags.has('robot')) solar = 0.5;
    }
    const slots = Math.max(0, Math.round((cfg.hours - repairs) * (n === 1 ? 1 : skill)));
    const gain: Vec = { agua: 0, oxi: 0, com: 0, ene: 0 }, loss: Vec = { agua: 0, oxi: 0, com: 0, ene: 0 };
    RES.forEach((r) => {
      let base = P[r] * (r === 'ene' ? solar : 1);
      if (r === 'ene' && flags.has('robot') && n !== 4) base += cfg.robotBonus;
      gain[r] += base * upt;
    });
    gain.ene += nuc;
    (['agua', 'oxi', 'com'] as Res[]).forEach((r) => (loss[r] += cfg.crew));
    RES.forEach((r) => (loss[r] += U[r]));
    Object.entries(extra).forEach(([r, v]) => (loss[r as Res] += v!));
    const est = {} as Vec;
    RES.forEach((r) => (est[r] = R[r] + gain[r] - loss[r]));
    const M = cfg.goals[String(n)];
    const tasksDone: Vec = { agua: 0, oxi: 0, com: 0, ene: 0 };
    for (let i = 0; i < slots; i++) {
      const need = (r: Res) => (M[r] - est[r]) / M[r];
      let r = RES.reduce((a, b) => (need(b) > need(a) ? b : a));
      if (need(r) <= -0.15) r = RES.reduce((a, b) => (C[b] - est[b] > C[a] - est[a] ? b : a));
      tasksDone[r]++;
      Object.entries(tasks[r]).forEach(([q, v]) => {
        if (v! > 0) gain[q as Res] += v!;
        else loss[q as Res] += -v!;
        est[q as Res] += v!;
      });
    }
    RES.forEach((r) => (R[r] = Math.max(0, Math.min(C[r], R[r] + gain[r]) - loss[r])));
    const miss = RES.filter((r) => R[r] < M[r]);
    nights.push({ n, R: { ...R }, C: { ...C }, miss, slots, repairs, tasksDone });
    if (n === 4) break;
    let E = cfg.effortPerDay, bought = 0;
    const notes: string[] = [];
    upgrades
      .filter((u) => plan[u.id] === n)
      .forEach((u) => {
        if (u.req && !owned.has(u.req)) return void notes.push(`${u.name}: falta ${byId[u.req].name}`);
        if (u.effort > E) return void notes.push(`${u.name}: no queda esfuerzo`);
        const lack = Object.entries(u.cost).find(([r, v]) => R[r as Res] < v!);
        if (lack) return void notes.push(`${u.name}: no hay ${lack[0]} suficiente`);
        E -= u.effort;
        bought++;
        owned.add(u.id);
        Object.entries(u.cost).forEach(([r, v]) => (R[r as Res] -= v!));
        Object.entries(u.cap || {}).forEach(([r, v]) => (C[r as Res] += v!));
        Object.entries(u.prod || {}).forEach(([r, v]) => (P[r as Res] += v!));
        Object.entries(u.up || {}).forEach(([r, v]) => (U[r as Res] += v!));
        if (u.nuc) nuc += u.nuc;
        if (u.flag) flags.add(u.flag);
      });
    days.push({ n, bought, effort: cfg.effortPerDay - E, notes });
  }
  const miss = nights[3].miss;
  return { nights, days, end: endingFor(miss.length), miss };
}

export const PRESETS: Record<string, Plan> = {
  equilibrado: { dep1: 1, tan1: 1, pan1: 1, est1: 1, pre1: 2, des1: 2, rec1: 2, ele1: 2, bli1: 3, dep2: 3, tan2: 3 },
  reactor: { rea1: 1, dep1: 1, tan1: 1, pre1: 2, des1: 2, est1: 2, led1: 2, bli1: 3, tal1: 3, ele1: 3 },
  maquinas: { pan1: 1, tal1: 1, ele1: 1, est1: 2, led1: 2, mox1: 2, pan2: 3, rec1: 3, tal2: 3 },
  almacen: { dep1: 1, tan1: 1, des1: 1, bat1: 1, dep2: 2, tan2: 2, des2: 2, dep3: 3, tan3: 3, bat2: 3 },
  sinProtecciones: { dep1: 1, tan1: 1, pan1: 1, est1: 1, bat1: 2, des1: 2, rec1: 2, ele1: 2, dep2: 3, tal1: 3, tan2: 3 },
};
