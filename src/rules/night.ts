// Motor de la noche en tiempo de juego (horas 0..6). Puro y determinista (semilla).
// La vista llama a tick() con el tiempo real convertido a horas de juego y a doTask()/repair() con los clics.
//
// Una sola fórmula para la animación y el amanecer:
//   display(t) = max(0, min(tope, R + producido(t) + tareas+) − consumo·t/6 − tareas− − tormenta)
// En t = 6, display() es exactamente la fórmula del amanecer del prompt.
import { addInto, dawnValue, vec, zero } from './economy';
import {
  PROD_ROOMS, RES, type Base, type Config, type Fault, type NightDef, type NightEvent,
  type ProdRoom, type Res, type Task, type Vec,
} from './types';

export type DownCause = 'fault' | 'clog' | 'solar';

export interface RoomState {
  down: boolean;
  cause: DownCause | null;
  faultId: string | null;
  since: number;
  /** Hasta esta hora la sala sigue produciendo aunque esté averiada (reserva de 1 h para averías y filtros). */
  graceUntil: number;
  /** Multiplicador de producción cuando funciona (tras reiniciar en la tormenta solar baja). */
  efficiency: number;
  lostHours: number;
  everDown: boolean;
}

export interface NightAction {
  t: number;
  kind: 'task' | 'repair';
  id: string;
  room: ProdRoom;
}

export type NightEmit =
  | { type: 'fault'; room: ProdRoom; faultId: string }
  | { type: 'clog'; room: ProdRoom }
  | { type: 'solar'; rooms: ProdRoom[] }
  | { type: 'graceOver'; room: ProdRoom }
  | { type: 'hour'; hour: number }
  | { type: 'dawn' };

export interface NightState {
  n: number;
  t: number;
  start: Base;
  produced: Vec;
  plus: Vec;
  minus: Vec;
  storm: Vec;
  rooms: Record<ProdRoom, RoomState>;
  pending: NightEvent[];
  signal: boolean;
  done: boolean;
  actions: NightAction[];
  rng: number;
  /** Eventos producidos desde la última vez que la vista los recogió (takeEmits). */
  emits: NightEmit[];
}

export interface NightCtx {
  cfg: Config;
  def: NightDef;
  faults: Fault[];
  tasks: Task[];
}

const EPS = 1e-9;

// Generador pseudoaleatorio con semilla (mulberry32), para que cada intento sea reproducible.
function rand(s: NightState): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let x = s.rng;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

const freshRoom = (): RoomState => ({
  down: false, cause: null, faultId: null, since: 0, graceUntil: 0, efficiency: 1, lostHours: 0, everDown: false,
});

export function startNight(ctx: NightCtx, base: Base, seed: number): NightState {
  return {
    n: ctx.def.n,
    t: 0,
    start: structuredClone(base),
    produced: zero(),
    plus: zero(),
    minus: zero(),
    storm: zero(),
    rooms: { agua: freshRoom(), oxi: freshRoom(), com: freshRoom(), ene: freshRoom() },
    pending: [...ctx.def.events].sort((a, b) => a.at - b.at),
    signal: true,
    done: false,
    actions: [],
    rng: seed | 0,
    emits: [],
  };
}

const has = (s: NightState, f: string) => s.start.flags.includes(f as never);

/** Producción por hora de juego de cada recurso con la sala funcionando al 100 %. */
export function fullRate(ctx: NightCtx, s: NightState): Vec {
  const P = s.start.P;
  const rate = vec();
  for (const r of RES) rate[r] = P[r] / ctx.cfg.hours;
  let panels = P.ene;
  if (ctx.def.panels !== undefined && !has(s, 'robot')) panels *= ctx.def.panels;
  if (has(s, 'robot') && ctx.def.storm !== 'solar') panels += ctx.cfg.robotBonus;
  rate.ene = panels / ctx.cfg.hours;
  return rate;
}

/** Fracción de producción de la sala ahora mismo (0 si está parada y se acabó su reserva). */
function roomFactor(room: RoomState, t: number): number {
  if (room.down && t >= room.graceUntil - EPS) return 0;
  return room.efficiency;
}

function integrate(ctx: NightCtx, s: NightState, dt: number) {
  if (dt <= 0) return;
  const rate = fullRate(ctx, s);
  for (const r of RES) s.produced[r] += rate[r] * roomFactor(s.rooms[r], s.t) * dt;
  s.produced.ene += (s.start.nuc / ctx.cfg.hours) * dt; // el reactor no depende de ninguna sala
  for (const r of PROD_ROOMS) {
    const room = s.rooms[r];
    if (room.down && s.t >= room.graceUntil - EPS) room.lostHours += dt;
  }
}

function takeDown(s: NightState, room: ProdRoom, cause: DownCause, grace: number, faultId: string | null) {
  const st = s.rooms[room];
  st.down = true;
  st.cause = cause;
  st.faultId = faultId;
  st.since = s.t;
  st.graceUntil = s.t + grace;
  st.everDown = true;
}

function fire(ctx: NightCtx, s: NightState, ev: NightEvent) {
  if (ev.kind === 'fault') {
    let pool = ev.fault ? [ev.fault] : [...(ev.pool ?? [])];
    pool = pool.filter((id) => {
      const f = ctx.faults.find((x) => x.id === id);
      return f && !s.rooms[f.room].down;
    });
    if (!pool.length) return;
    const id = pool[Math.floor(rand(s) * pool.length)];
    const f = ctx.faults.find((x) => x.id === id)!;
    takeDown(s, f.room, 'fault', 1, f.id);
    s.emits.push({ type: 'fault', room: f.room, faultId: f.id });
  } else if (ev.kind === 'clog') {
    if (ev.skipIf && has(s, ev.skipIf)) return;
    if (s.rooms[ev.room].down) return;
    takeDown(s, ev.room, 'clog', 1, null);
    s.emits.push({ type: 'clog', room: ev.room });
  } else if (ev.kind === 'solar') {
    let k = ev.rooms;
    for (const [flag, v] of Object.entries(ev.roomsIf ?? {})) if (has(s, flag)) k = v!;
    const order = [...PROD_ROOMS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand(s) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const rooms = order.slice(0, k);
    s.signal = false;
    let eff = ctx.def.solarEfficiency ?? 1;
    for (const [flag, v] of Object.entries(ctx.def.solarEfficiencyIf ?? {})) if (has(s, flag)) eff = v!;
    for (const r of PROD_ROOMS) s.rooms[r].efficiency = eff; // los equipos quedan tocados el resto de la noche
    for (const r of rooms) takeDown(s, r, 'solar', 0, null);
    s.emits.push({ type: 'solar', rooms });
  }
}

/** Avanza el reloj dt horas de juego, disparando eventos en su momento exacto. */
export function tick(ctx: NightCtx, s: NightState, dt: number): NightState {
  if (s.done) return s;
  const target = Math.min(ctx.cfg.hours, s.t + dt);
  while (s.t < target - EPS) {
    let next = target;
    if (s.pending.length && s.pending[0].at < next) next = Math.max(s.t, s.pending[0].at);
    for (const r of PROD_ROOMS) {
      const g = s.rooms[r].graceUntil;
      if (s.rooms[r].down && g > s.t + EPS && g < next) next = g;
    }
    const nextHour = Math.floor(s.t + EPS) + 1;
    if (nextHour < next) next = nextHour;
    const prevHour = Math.floor(s.t + EPS);
    integrate(ctx, s, next - s.t);
    s.t = next;
    for (const r of PROD_ROOMS) {
      const room = s.rooms[r];
      if (room.down && room.graceUntil > 0 && Math.abs(room.graceUntil - s.t) < EPS && room.cause !== 'solar')
        s.emits.push({ type: 'graceOver', room: r });
    }
    while (s.pending.length && s.pending[0].at <= s.t + EPS) fire(ctx, s, s.pending.shift()!);
    const h = Math.floor(s.t + EPS);
    if (h > prevHour && h < ctx.cfg.hours) s.emits.push({ type: 'hour', hour: h });
  }
  if (s.t >= ctx.cfg.hours - EPS && !s.done) {
    s.t = ctx.cfg.hours;
    s.done = true;
    s.emits.push({ type: 'dawn' });
  }
  return s;
}

/** Una acción ocupa la hora en curso: el reloj salta al inicio de la hora siguiente. */
function spendHour(ctx: NightCtx, s: NightState) {
  const next = Math.min(ctx.cfg.hours, Math.floor(s.t + EPS) + 1);
  tick(ctx, s, next - s.t);
}

export type ActionCheck = { ok: true } | { ok: false; reason: 'done' | 'roomDown' | 'notDown' | 'unknown' };

export function canTask(ctx: NightCtx, s: NightState, taskId: string): ActionCheck {
  const task = ctx.tasks.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: 'unknown' };
  if (s.done) return { ok: false, reason: 'done' };
  if (s.rooms[task.room].down) return { ok: false, reason: 'roomDown' };
  return { ok: true };
}

export function doTask(ctx: NightCtx, s: NightState, taskId: string): NightState {
  const chk = canTask(ctx, s, taskId);
  if (!chk.ok) return s;
  const task = ctx.tasks.find((t) => t.id === taskId)!;
  addInto(s.plus, task.plus);
  addInto(s.minus, task.minus);
  s.actions.push({ t: s.t, kind: 'task', id: task.id, room: task.room });
  spendHour(ctx, s);
  return s;
}

export function repair(ctx: NightCtx, s: NightState, room: ProdRoom): NightState {
  const st = s.rooms[room];
  if (s.done || !st.down) return s;
  if (st.cause === 'fault') {
    const f = ctx.faults.find((x) => x.id === st.faultId);
    addInto(s.minus, f?.cost);
  } else if (st.cause === 'clog') {
    addInto(s.storm, ctx.def.clogCost);
  }
  s.actions.push({ t: s.t, kind: 'repair', id: st.faultId ?? st.cause ?? 'repair', room });
  const solar = st.cause === 'solar';
  // Tras la tormenta solar, reiniciar ocupa la hora entera: la sala vuelve a producir en la hora siguiente.
  // Las averías normales vuelven al momento.
  if (solar) spendHour(ctx, s);
  st.down = false;
  st.cause = null;
  st.faultId = null;
  if (!solar) spendHour(ctx, s);
  return s;
}

/** Deja pasar el resto de la hora sin hacer nada. */
export function skipHour(ctx: NightCtx, s: NightState): NightState {
  spendHour(ctx, s);
  return s;
}

export function takeEmits(s: NightState): NightEmit[] {
  const e = s.emits;
  s.emits = [];
  return e;
}

export const gained = (s: NightState): Vec => addInto({ ...s.produced }, s.plus);

/** Lo perdido hasta ahora: consumo de la tripulación y mantenimiento proporcionales al tiempo, más gastos puntuales. */
export function lostSoFar(ctx: NightCtx, s: NightState): Vec {
  const out = vec();
  const f = s.t / ctx.cfg.hours;
  for (const r of RES) out[r] = (ctx.cfg.crewUse[r] + s.start.U[r]) * f + s.minus[r] + s.storm[r];
  return out;
}

/** Valor que muestran las barras ahora. En t = 6 es exactamente la fórmula del amanecer. */
export function display(ctx: NightCtx, s: NightState): Vec {
  const g = gained(s), l = lostSoFar(ctx, s), out = vec();
  for (const r of RES) out[r] = dawnValue(s.start.R[r], s.start.C[r], g[r], l[r]);
  return out;
}

/** ¿Se está tirando producción porque el almacén está lleno? */
export function overflowing(s: NightState): Record<Res, boolean> {
  const g = gained(s);
  const o = {} as Record<Res, boolean>;
  for (const r of RES) o[r] = s.start.R[r] + g[r] > s.start.C[r] + EPS;
  return o;
}

export interface ReportLine {
  r: Res;
  start: number;
  produced: number;
  tasks: number;
  wasted: number;
  crew: number;
  upkeep: number;
  spent: number; // tareas(−) y costes de averías
  storm: number;
  final: number;
  goal: number;
  ok: boolean;
  lostProduction: number; // lo que no se produjo por salas paradas o tormenta
}

export interface NightReport {
  n: number;
  lines: Record<Res, ReportLine>;
  miss: Res[];
  pass: boolean;
  downRooms: ProdRoom[]; // salas que se quedaron sin arreglar
  actions: NightAction[];
}

export function report(ctx: NightCtx, s: NightState): NightReport {
  const goal = ctx.cfg.goals[String(s.n)];
  const ideal = fullRate(ctx, s);
  const lines = {} as Record<Res, ReportLine>;
  for (const r of RES) {
    const start = s.start.R[r];
    const g = s.produced[r] + s.plus[r];
    const crew = ctx.cfg.crewUse[r];
    const upkeep = s.start.U[r];
    const lost = crew + upkeep + s.minus[r] + s.storm[r];
    const final = dawnValue(start, s.start.C[r], g, lost);
    const maxProd = ideal[r] * ctx.cfg.hours + (r === 'ene' ? s.start.nuc : 0);
    lines[r] = {
      r, start, produced: s.produced[r], tasks: s.plus[r],
      wasted: Math.max(0, start + g - s.start.C[r]),
      crew, upkeep, spent: s.minus[r], storm: s.storm[r], final, goal: goal[r], ok: final >= goal[r] - EPS,
      lostProduction: Math.max(0, maxProd - s.produced[r]),
    };
  }
  const miss = RES.filter((r) => !lines[r].ok);
  return {
    n: s.n, lines, miss, pass: miss.length === 0,
    downRooms: PROD_ROOMS.filter((r) => s.rooms[r].down),
    actions: s.actions,
  };
}

/** Reserva de la base al amanecer (lo que pasa a la mañana siguiente). */
export function dawnBase(ctx: NightCtx, s: NightState): Base {
  const b = structuredClone(s.start);
  b.R = display(ctx, { ...s, t: ctx.cfg.hours });
  return b;
}
