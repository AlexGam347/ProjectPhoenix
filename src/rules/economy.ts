// Economía de la base: fórmula del amanecer y compras. Funciones puras.
import { RES, type Base, type Config, type Upgrade, type Vec } from './types';

export const zero = (): Vec => ({ agua: 0, oxi: 0, com: 0, ene: 0 });
export const vec = (p: Partial<Vec> = {}): Vec => ({ ...zero(), ...p });
export const addInto = (a: Vec, p: Partial<Vec> = {}, k = 1): Vec => {
  for (const r of RES) a[r] += (p[r] ?? 0) * k;
  return a;
};

export function newBase(cfg: Config): Base {
  return { R: { ...cfg.R0 }, C: { ...cfg.C0 }, P: { ...cfg.P0 }, U: { ...cfg.U0 }, nuc: 0, flags: [], owned: [] };
}

export const cloneBase = (b: Base): Base => ({
  R: { ...b.R }, C: { ...b.C }, P: { ...b.P }, U: { ...b.U }, nuc: b.nuc, flags: [...b.flags], owned: [...b.owned],
});

/**
 * Fórmula del amanecer (prompt §3):
 * reserva = max(0, min(tope, reserva + ganado) − perdido)
 * ganado = producción·funcionamiento + tareas(+); perdido = tripulación + mantenimiento + tareas(−) + tormenta.
 */
export const dawnValue = (R: number, C: number, gained: number, lost: number) =>
  Math.max(0, Math.min(C, R + gained) - lost);

export type BuyCheck = { ok: true } | { ok: false; reason: 'owned' | 'req' | 'effort' | 'resource'; res?: string };

export function canBuy(base: Base, u: Upgrade, effortLeft: number): BuyCheck {
  if (base.owned.includes(u.id)) return { ok: false, reason: 'owned' };
  if (u.req && !base.owned.includes(u.req)) return { ok: false, reason: 'req' };
  if (u.effort > effortLeft) return { ok: false, reason: 'effort' };
  for (const r of RES) if ((u.cost[r] ?? 0) > base.R[r]) return { ok: false, reason: 'resource', res: r };
  return { ok: true };
}

/** Aplica una mejora: descuenta el coste al momento y sube tope, producción, mantenimiento o flags. */
export function applyUpgrade(base: Base, u: Upgrade): Base {
  const b = cloneBase(base);
  addInto(b.R, u.cost, -1);
  addInto(b.C, u.cap);
  addInto(b.P, u.prod);
  addInto(b.U, u.up);
  if (u.nuc) b.nuc += u.nuc;
  if (u.flag && !b.flags.includes(u.flag)) b.flags.push(u.flag);
  b.owned.push(u.id);
  return b;
}

export const missing = (R: Vec, goal: Vec) => RES.filter((r) => R[r] < goal[r]);

export type Ending = 'good' | 'mid' | 'bad';
export const endingFor = (miss: number): Ending => (miss === 0 ? 'good' : miss === 1 ? 'mid' : 'bad');
