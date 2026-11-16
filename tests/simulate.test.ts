import { describe, expect, it } from 'vitest';
import { CONFIG, TASKS, UPGRADES } from '../src/data';
import { PRESETS, simulate } from '../src/rules/simulate';

const SKILLS = { 'muy bien': 1, normal: 0.8, 'con dificultades': 0.6 } as const;
const run = (plan: keyof typeof PRESETS) =>
  Object.values(SKILLS).map((s) => simulate(CONFIG, UPGRADES, TASKS, PRESETS[plan], s).end);

// Tabla de equilibrio con el almacén continuo (iteración 4).
// La del dossier era: Equilibrado bueno/bueno/justo, Solo máquinas malo×3, Solo almacén justo/malo/malo.
// Cambió porque la fórmula del dossier recortaba al tope antes de consumir y hacía imposible el agua de la Noche 2
// sin depósito (máximo 30 − 8 = 22, justo la meta). Las lecciones se mantienen: solo máquinas y no mejorar acaban mal.
describe('simulate(): tabla de equilibrio', () => {
  it('Equilibrado → bueno en las tres habilidades', () => expect(run('equilibrado')).toEqual(['good', 'good', 'good']));
  it('Solo máquinas → malo · malo · malo', () => expect(run('maquinas')).toEqual(['bad', 'bad', 'bad']));
  it('Solo almacén → bueno · malo · malo (solo funciona jugando muy bien)', () => expect(run('almacen')).toEqual(['good', 'bad', 'bad']));
  it('regresión: ruta del reactor y sin protecciones', () => {
    expect(run('reactor')).toEqual(['good', 'good', 'good']);
    expect(run('sinProtecciones')).toEqual(['mid', 'mid', 'bad']);
  });
  it('sin mejoras siempre acaba mal', () => {
    expect([1, 0.8, 0.6].map((s) => simulate(CONFIG, UPGRADES, TASKS, {}, s).end)).toEqual(['bad', 'bad', 'bad']);
  });
  it('el plan equilibrado compra todo lo previsto con ≥3 mejoras al día', () => {
    const r = simulate(CONFIG, UPGRADES, TASKS, PRESETS.equilibrado, 1);
    expect(r.days.map((d) => d.bought)).toEqual([4, 4, 3]);
    expect(r.days.every((d) => d.notes.length === 0)).toBe(true);
    expect(r.nights[0].R).toEqual({ agua: 26, oxi: 24, com: 26, ene: 30 });
  });
});
