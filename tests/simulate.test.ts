import { describe, expect, it } from 'vitest';
import { CONFIG, TASKS, UPGRADES } from '../src/data';
import { PRESETS, simulate } from '../src/rules/simulate';

const SKILLS = { 'muy bien': 1, normal: 0.8, 'con dificultades': 0.6 } as const;
const run = (plan: keyof typeof PRESETS) =>
  Object.values(SKILLS).map((s) => simulate(CONFIG, UPGRADES, TASKS, PRESETS[plan], s).end);

describe('simulate() del dossier: tabla de equilibrio del prompt', () => {
  it('Equilibrado → bueno · bueno · justo', () => expect(run('equilibrado')).toEqual(['good', 'good', 'mid']));
  it('Solo máquinas → malo · malo · malo', () => expect(run('maquinas')).toEqual(['bad', 'bad', 'bad']));
  it('Solo almacén → justo · malo · malo', () => expect(run('almacen')).toEqual(['mid', 'bad', 'bad']));
  it('regresión: ruta del reactor y sin protecciones', () => {
    expect(run('reactor')).toEqual(['good', 'good', 'good']);
    expect(run('sinProtecciones')).toEqual(['mid', 'bad', 'bad']);
  });
  it('el plan equilibrado compra todo lo previsto con ≥3 mejoras al día', () => {
    const r = simulate(CONFIG, UPGRADES, TASKS, PRESETS.equilibrado, 1);
    expect(r.days.map((d) => d.bought)).toEqual([4, 4, 3]);
    expect(r.days.every((d) => d.notes.length === 0)).toBe(true);
    expect(r.nights[0].R).toEqual({ agua: 18, oxi: 24, com: 24, ene: 24 });
  });
});
