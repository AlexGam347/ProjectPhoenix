import { describe, expect, it } from 'vitest';
import { CONFIG, UPG_BY_ID } from '../src/data';
import { applyUpgrade, canBuy, dawnValue, newBase } from '../src/rules/economy';
import { display, report, startNight, tick } from '../src/rules/night';
import { RES } from '../src/rules/types';
import { ctxFor } from './helpers';

describe('fórmula del amanecer', () => {
  it('lo que no cabe en el almacén se pierde', () => {
    // energía N1 sin mejoras: min(30, 20 + 18) − 4 = 26 (se pierden 8)
    expect(dawnValue(20, 30, 18, 4)).toBe(26);
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
    }
    expect(end).toEqual({ agua: 18, oxi: 19, com: 15, ene: 26 });
    expect(rep.lines.ene.wasted).toBe(8);
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
