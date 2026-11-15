import { describe, expect, it } from 'vitest';
import { CONFIG, UPG_BY_ID } from '../src/data';
import { applyUpgrade, newBase } from '../src/rules/economy';
import { display, doTask, repair, report, skipHour, startNight, takeEmits, tick } from '../src/rules/night';
import type { Base } from '../src/rules/types';
import { ctxFor } from './helpers';

const withFlags = (...ids: string[]): Base => ids.reduce((b, id) => applyUpgrade(b, UPG_BY_ID[id]), newBase(CONFIG));
const toEnd = (ctx: ReturnType<typeof ctxFor>, s: ReturnType<typeof startNight>) => tick(ctx, s, 10);

describe('acciones', () => {
  it('una tarea suma, gasta y salta a la hora siguiente', () => {
    const ctx = ctxFor(2);
    const s = startNight(ctx, newBase(CONFIG), 1);
    tick(ctx, s, 0.4);
    doTask(ctx, s, 'hielo');
    expect(s.t).toBe(1);
    expect(s.plus.agua).toBe(6);
    expect(s.minus.ene).toBe(1);
  });
  it('si no se hace nada, la noche termina igual', () => {
    const ctx = ctxFor(2);
    const s = toEnd(ctx, startNight(ctx, newBase(CONFIG), 1));
    expect(s.done).toBe(true);
    expect(takeEmits(s).some((e) => e.type === 'dawn')).toBe(true);
  });
});

describe('averías', () => {
  it('arreglada dentro de su hora de reserva no resta producción', () => {
    const ctx = ctxFor(1); // filtro sucio a la 1:12
    const s = startNight(ctx, newBase(CONFIG), 1);
    tick(ctx, s, 1.5);
    expect(s.rooms.agua.down).toBe(true);
    repair(ctx, s, 'agua');
    toEnd(ctx, s);
    expect(s.produced.agua).toBeCloseTo(10, 9);
  });
  it('sin arreglar, la sala deja de producir el resto de la noche', () => {
    const ctx = ctxFor(1);
    const s = toEnd(ctx, startNight(ctx, newBase(CONFIG), 1));
    // produce hasta 1.2 + 1 h de reserva = 2.2 h → 10·2.2/6
    expect(s.produced.agua).toBeCloseTo((10 * 2.2) / 6, 9);
    expect(report(ctx, s).downRooms).toEqual(['agua']);
  });
  it('las averías con coste lo cobran al arreglarlas', () => {
    const ctx = { ...ctxFor(2), def: { ...ctxFor(2).def, events: [{ at: 0.2, kind: 'fault' as const, fault: 'tuberia' }] } };
    const s = startNight(ctx, newBase(CONFIG), 1);
    tick(ctx, s, 0.5);
    repair(ctx, s, 'agua');
    expect(s.minus.ene).toBe(1);
  });
  it('la noche 2 elige siempre la misma avería con la misma semilla', () => {
    const ctx = ctxFor(2);
    const a = tick(ctx, startNight(ctx, newBase(CONFIG), 7), 2);
    const b = tick(ctx, startNight(ctx, newBase(CONFIG), 7), 2);
    expect(Object.values(a.rooms).filter((r) => r.down).length).toBe(1);
    expect(a.rooms).toEqual(b.rooms);
  });
});

describe('tormenta de arena (noche 3)', () => {
  it('3 filtros, paneles al 50 % y −3 energía por filtro reiniciado', () => {
    const ctx = ctxFor(3);
    const s = startNight(ctx, newBase(CONFIG), 1);
    for (let h = 0; h < 3; h++) {
      tick(ctx, s, 0.5);
      const down = (['agua', 'oxi', 'com'] as const).find((r) => s.rooms[r].down)!;
      repair(ctx, s, down);
    }
    toEnd(ctx, s);
    expect(s.storm.ene).toBe(9);
    expect(s.produced.ene).toBeCloseTo(9, 9);
    expect(s.produced.agua).toBeCloseTo(10, 9);
  });
  it('con prefiltros solo se obstruye 1; con robot los paneles siguen al 100 % (+2)', () => {
    const ctx = ctxFor(3);
    const s = toEnd(ctx, startNight(ctx, withFlags('pre1', 'rob1'), 1));
    expect([s.rooms.agua.everDown, s.rooms.oxi.everDown, s.rooms.com.everDown]).toEqual([true, false, false]);
    expect(s.produced.ene).toBeCloseTo(20, 9);
  });
  it('el reactor no se ve afectado', () => {
    const ctx = ctxFor(3);
    const s = toEnd(ctx, startNight(ctx, withFlags('rea1'), 1));
    expect(s.produced.ene).toBeCloseTo(9 + 12, 9);
  });
});

describe('tormenta solar (noche 4)', () => {
  it('corta la señal y apaga 4 salas; con blindaje, 2', () => {
    const ctx = ctxFor(4);
    const a = tick(ctx, startNight(ctx, newBase(CONFIG), 3), 1);
    expect(a.signal).toBe(false);
    expect(Object.values(a.rooms).filter((r) => r.down).length).toBe(4);
    const b = tick(ctx, startNight(ctx, withFlags('bli1'), 3), 1);
    expect(Object.values(b.rooms).filter((r) => r.down).length).toBe(2);
  });
  it('las salas apagadas no producen hasta reiniciarlas; luego todo rinde al 63 % (86 % con blindaje)', () => {
    const ctx = ctxFor(4);
    const s = startNight(ctx, newBase(CONFIG), 3);
    tick(ctx, s, 0.6);
    repair(ctx, s, 'agua'); // reinicia en la hora 0 → vuelve a la 1:00
    toEnd(ctx, s);
    expect(s.produced.agua).toBeCloseTo((10 / 6) * (0.5 + 5 * 0.63), 9);
    expect(s.produced.oxi).toBeCloseTo((9 / 6) * 0.5, 9);
    const b = startNight(ctx, withFlags('bli1'), 3);
    toEnd(ctx, b);
    const up = (['agua', 'oxi', 'com', 'ene'] as const).find((r) => !b.rooms[r].down)!;
    expect(b.produced[up]).toBeCloseTo((b.start.P[up] / 6) * (0.5 + 5.5 * 0.86), 9);
  });
  it('las barras bajan en directo mientras está todo apagado', () => {
    const ctx = ctxFor(4);
    const s = startNight(ctx, newBase(CONFIG), 3);
    tick(ctx, s, 1);
    const v1 = display(ctx, s).oxi;
    tick(ctx, s, 1);
    expect(display(ctx, s).oxi).toBeLessThan(v1);
  });
});

it('skipHour deja pasar la hora', () => {
  const ctx = ctxFor(2);
  const s = startNight(ctx, newBase(CONFIG), 1);
  skipHour(ctx, s);
  expect(s.t).toBe(1);
});
