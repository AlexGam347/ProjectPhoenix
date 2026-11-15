import { describe, expect, it } from 'vitest';
import { CONFIG, UPG_BY_ID } from '../src/data';
import { applyUpgrade, canBuy, dawnValue, newBase } from '../src/rules/economy';
import { display, doTask, report, startNight, tick } from '../src/rules/night';
import { RES } from '../src/rules/types';
import { ctxFor } from './helpers';

describe('fórmula del amanecer', () => {
  it('lo que no cabe en el almacén se pierde (primero se consume, luego se recorta)', () => {
    // energía N1 sin mejoras: min(30, 20 + 18 − 4) = 30 (se pierden 4)
    expect(dawnValue(20, 30, 18, 4)).toBe(30);
  });
  it('nunca baja de 0', () => expect(dawnValue(2, 30, 1, 10)).toBe(0));
});

describe('display(t) anima las barras y en t = 6 coincide con la fórmula', () => {
  it('noche sin acciones ni averías (avería resuelta en su hora no cuenta)', () => {
    const ctx = { ...ctxFor(2), def: { ...ctxFor(2).def, events: [] } };
    const s = startNight(ctx, newBase(CONFIG), 1);
    const mid = display(ctx, tick(ctx, s, 3));
    expect(mid.agua).toBeGreaterThan(0);
    tick(ctx, s, 3);
    const end = display(ctx, s);
    const rep = report(ctx, s);
    for (const r of RES) {
      const lost = CONFIG.crewUse[r] + CONFIG.U0[r];
      expect(end[r]).toBeCloseTo(dawnValue(CONFIG.R0[r], CONFIG.C0[r], CONFIG.P0[r], lost), 9);
      expect(rep.lines[r].final).toBeCloseTo(end[r], 9);
      // El informe cuadra: inicio + producido + tareas − perdido − consumo − gastos − tormenta + faltante = final.
      const l = rep.lines[r];
      expect(l.start + l.produced + l.tasks - l.wasted - l.crew - l.upkeep - l.spent - l.storm + l.short).toBeCloseTo(l.final, 9);
    }
    expect(end.agua).toBeCloseTo(18, 9);
    expect(end.ene).toBeCloseTo(30, 9);
    expect(rep.lines.ene.wasted).toBeCloseTo(4, 9);
  });
});

describe('el fallo del agua de la Noche 2 (tanque de 30, meta 22)', () => {
  it('con estantes hidropónicos, la meta se alcanza haciendo tareas de agua', () => {
    const ctx = { ...ctxFor(2), def: { ...ctxFor(2).def, events: [] } };
    const base = applyUpgrade(newBase(CONFIG), UPG_BY_ID.est1); // −2 agua cada noche
    base.R.agua = 12;
    const s = startNight(ctx, base, 1);
    for (let h = 0; h < 3; h++) doTask(ctx, s, 'hielo');
    tick(ctx, s, 10);
    // Antes: min(30, 12 + 10 + 18) − 10 = 20 < 22. Ahora: 12 + 10 + 18 − 10 = 30.
    expect(display(ctx, s).agua).toBeCloseTo(30, 9);
    expect(report(ctx, s).lines.agua.wasted).toBeCloseTo(0, 9);
  });
  it('una tarea con el tanque a medias no se pierde', () => {
    const ctx = { ...ctxFor(2), def: { ...ctxFor(2).def, events: [] } };
    const s = startNight(ctx, newBase(CONFIG), 1);
    tick(ctx, s, 3);
    const before = display(ctx, s).agua;
    doTask(ctx, s, 'hielo');
    expect(s.wasted.agua).toBe(0);
    expect(display(ctx, s).agua).toBeGreaterThan(before + 5);
  });
});

describe('compras', () => {
  it('descuenta el coste al momento y sube el tope', () => {
    const b = applyUpgrade(newBase(CONFIG), UPG_BY_ID.dep1);
    expect(b.R.agua).toBe(13);
    expect(b.C.agua).toBe(45);
    expect(b.U.ene).toBe(5);
  });
  it('los niveles II y III piden el anterior', () => {
    const b = newBase(CONFIG);
    expect(canBuy(b, UPG_BY_ID.dep2, 10)).toEqual({ ok: false, reason: 'req' });
    expect(canBuy(applyUpgrade(b, UPG_BY_ID.dep1), UPG_BY_ID.dep2, 10)).toEqual({ ok: true });
  });
  it('sin esfuerzo o recurso suficiente no se puede', () => {
    const b = newBase(CONFIG);
    expect(canBuy(b, UPG_BY_ID.rea1, 4)).toEqual({ ok: false, reason: 'effort' });
    b.R.ene = 5;
    expect(canBuy(b, UPG_BY_ID.rea1, 10)).toEqual({ ok: false, reason: 'resource', res: 'ene' });
  });
});
