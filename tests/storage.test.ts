// Almacén continuo en todas las noches (1 a 4) y los 4 recursos, con bases reales de partida (bot jugando un plan).
// Comprueba que no vuelva el fallo del agua: perder producción con la barra a medias o seguir bajando tras arreglar.
import { describe, expect, it } from 'vitest';
import { CONFIG, FAULTS, NIGHTS, TASKS, UPGRADES } from '../src/data';
import { botNight } from '../src/rules/bot';
import { applyUpgrade, canBuy, newBase } from '../src/rules/economy';
import { dawnBase, display, doTask, netRate, repair, startNight, tick, type NightCtx } from '../src/rules/night';
import { PRESETS, type Plan } from '../src/rules/simulate';
import { PROD_ROOMS, RES, type Base } from '../src/rules/types';

const ctxFor = (n: number): NightCtx => ({ cfg: CONFIG, def: NIGHTS.find((d) => d.n === n)!, faults: FAULTS, tasks: TASKS });

/** Base al empezar cada noche 1..4 siguiendo un plan con el bot. */
function bases(plan: Plan): Base[] {
  const out: Base[] = [];
  let base = newBase(CONFIG);
  for (let n = 1; n <= 4; n++) {
    out.push(base);
    const ctx = ctxFor(n);
    const s = startNight(ctx, base, n * 13);
    botNight(ctx, s, 1);
    base = dawnBase(ctx, s);
    let effort = CONFIG.effortPerDay;
    for (const u of UPGRADES.filter((x) => plan[x.id] === n)) if (canBuy(base, u, effort).ok) { base = applyUpgrade(base, u); effort -= u.effort; }
  }
  return out;
}

const STEP = 0.05;

describe('almacén continuo en toda la partida', () => {
  for (const name of ['equilibrado', 'maquinas', 'almacen'] as const) {
    const bs = bases(PRESETS[name]);
    for (let n = 1; n <= 4; n++) {
      it(`${name}, noche ${n}: sin pérdidas con la barra a medias y la barra sigue el ritmo neto`, () => {
        const ctx = ctxFor(n);
        const s = startNight(ctx, bs[n - 1], 99);
        while (!s.done) {
          const before = display(ctx, s), w0 = { ...s.wasted }, net = netRate(ctx, s);
          tick(ctx, s, STEP);
          const after = display(ctx, s);
          for (const r of RES) {
            // Solo se pierde producción si la barra acaba llena.
            if (s.wasted[r] > w0[r] + 1e-9) expect(after[r], `${r} perdió sin estar lleno`).toBeCloseTo(s.start.C[r], 6);
            // Sin cambios de ritmo dentro del paso, la barra va en el sentido del ritmo (salvo topes 0 y lleno).
            const d = after[r] - before[r];
            if (net[r] > 1e-6 && before[r] < s.start.C[r] - 1e-6) expect(d, `${r} bajó con ritmo positivo`).toBeGreaterThanOrEqual(-1e-6);
            if (net[r] < -1e-6 && before[r] > 1e-6) expect(d, `${r} subió con ritmo negativo`).toBeLessThanOrEqual(1e-6);
          }
          // Las averías se arreglan nada más acabarse su hora de reserva, para mirar la hora siguiente.
          for (const r of PROD_ROOMS) {
            const st = s.rooms[r];
            if (!s.done && st.down && s.t >= st.graceUntil) {
              repair(ctx, s, r);
              if (s.done) break;
              const net2 = netRate(ctx, s)[r], v0 = display(ctx, s)[r];
              tick(ctx, s, 0.5);
              if (net2 > 1e-6 && v0 < s.start.C[r] - 1e-6) expect(display(ctx, s)[r], `${r} siguió bajando tras arreglar`).toBeGreaterThanOrEqual(v0 - 1e-6);
            }
          }
        }
      });
    }
  }
});

describe('con la barra llena, gastar se nota', () => {
  it('una tarea que gasta agua deja la barra en tope menos coste, aunque sobre producción', () => {
    const ctx = ctxFor(2);
    const base = newBase(CONFIG);
    base.R.agua = base.C.agua;
    base.P.agua = 40; // mucha más producción de la que cabe
    const s = startNight(ctx, base, 5);
    const task = TASKS.find((t) => (t.minus.agua ?? 0) > 0)!;
    const before = display(ctx, s).agua;
    expect(before).toBe(base.C.agua);
    doTask(ctx, s, task.id);
    expect(display(ctx, s).agua).toBeCloseTo(base.C.agua - task.minus.agua!, 6);
  });
});
