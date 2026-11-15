// Jugador automático para calibrar el motor real contra simulate().
// Imita las suposiciones del simulador: tareas hacia la barra más lejos de su meta,
// tantas tareas como (6 − reparaciones)·habilidad, y reparaciones con retraso si juega peor.
import { applyUpgrade, canBuy, endingFor, newBase, type Ending } from './economy';
import { canTask, dawnBase, doTask, fullRate, repair, report, startNight, tick, type NightCtx, type NightReport, type NightState } from './night';
import { PROD_ROOMS, RES, type Config, type Fault, type NightDef, type Res, type Task, type Upgrade } from './types';
import type { Plan } from './simulate';

export interface BotWorld { cfg: Config; nights: NightDef[]; faults: Fault[]; tasks: Task[]; upgrades: Upgrade[] }

function expectedRepairs(def: NightDef, flags: string[]): number {
  if (def.storm === 'solar') {
    const ev = def.events.find((e) => e.kind === 'solar');
    if (ev && ev.kind === 'solar') {
      let k = ev.rooms;
      for (const [f, v] of Object.entries(ev.roomsIf ?? {})) if (flags.includes(f)) k = v!;
      return k;
    }
  }
  return def.events.filter((e) => !(e.kind === 'clog' && e.skipIf && flags.includes(e.skipIf))).length;
}

function pickTask(ctx: NightCtx, s: NightState): Task | null {
  const goal = ctx.cfg.goals[String(s.n)];
  const rate = fullRate(ctx, s);
  const est = {} as Record<Res, number>;
  for (const r of RES) {
    const factor = s.rooms[r].down ? 0 : s.rooms[r].efficiency;
    est[r] = s.start.R[r] + s.produced[r] + s.plus[r] + rate[r] * factor * (ctx.cfg.hours - s.t)
      + (r === 'ene' ? (s.start.nuc / ctx.cfg.hours) * (ctx.cfg.hours - s.t) : 0)
      - ctx.cfg.crewUse[r] - s.start.U[r] - s.minus[r] - s.storm[r];
  }
  const avail = ctx.tasks.filter((t) => canTask(ctx, s, t.id).ok);
  if (!avail.length) return null;
  const need = (t: Task) => (goal[t.room] - est[t.room]) / goal[t.room];
  let best = avail.reduce((a, b) => (need(b) > need(a) ? b : a));
  if (need(best) <= -0.15) best = avail.reduce((a, b) => (s.start.C[b.room] - est[b.room] > s.start.C[a.room] - est[a.room] ? b : a));
  return best;
}

export function botNight(ctx: NightCtx, s: NightState, skill: number): NightReport {
  const tutorial = !!ctx.def.tutorial;
  const delay = tutorial ? 0 : Math.round((1 - skill) * 5);
  let slots = Math.max(0, Math.round((ctx.cfg.hours - expectedRepairs(ctx.def, s.start.flags)) * (tutorial ? 1 : skill)));
  for (let h = 0; h < ctx.cfg.hours && !s.done; h++) {
    tick(ctx, s, h + 0.6 - s.t);
    const due = PROD_ROOMS.filter((r) => s.rooms[r].down && s.rooms[r].since + delay <= s.t + 1e-9)
      .sort((a, b) => s.rooms[a].since - s.rooms[b].since);
    if (due.length) { repair(ctx, s, due[0]); continue; }
    const task = slots > 0 ? pickTask(ctx, s) : null;
    if (task) { doTask(ctx, s, task.id); slots--; continue; }
    tick(ctx, s, h + 1 - s.t);
  }
  tick(ctx, s, 10);
  return report(ctx, s);
}

export function botGame(w: BotWorld, plan: Plan, skill: number, seed = 1): { end: Ending; reports: NightReport[] } {
  let base = newBase(w.cfg);
  const reports: NightReport[] = [];
  for (let n = 1; n <= 4; n++) {
    const def = w.nights.find((d) => d.n === n)!;
    const ctx: NightCtx = { cfg: w.cfg, def, faults: w.faults, tasks: w.tasks };
    const s = startNight(ctx, base, seed + n);
    reports.push(botNight(ctx, s, skill));
    base = dawnBase(ctx, s);
    if (n === 4) break;
    let effort = w.cfg.effortPerDay;
    for (const u of w.upgrades.filter((u) => plan[u.id] === n)) {
      if (canBuy(base, u, effort).ok) { base = applyUpgrade(base, u); effort -= u.effort; }
    }
  }
  return { end: endingFor(reports[3].miss.length), reports };
}
