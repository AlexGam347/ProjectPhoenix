// Integridad de los JSON que edita el equipo de diseño.
import { describe, expect, it } from 'vitest';
import { FAULTS, NIGHTS, TASKS, UPGRADES, UPG_BY_ID } from '../src/data';
import questions from '../src/data/questions.es.json';
import yana from '../src/data/yana.es.json';
import story from '../src/data/story.es.json';
import credits from '../src/data/credits.json';
import control from '../src/data/rooms/control.json';
import agua from '../src/data/rooms/agua.json';
import oxi from '../src/data/rooms/oxi.json';
import com from '../src/data/rooms/com.json';
import ene from '../src/data/rooms/ene.json';

type Room = { id: string; cam: string; zones: { id: string; poly: number[][] }[]; restartZone?: string; clogZone?: string; layers: { base: string } };
const ROOMS = { control, agua, oxi, com, ene } as unknown as Record<string, Room>;
const zoneIds = (r: string) => ROOMS[r].zones.map((z) => z.id);

describe('mejoras', () => {
  it('26 mejoras con id único y requisitos que existen', () => {
    expect(UPGRADES).toHaveLength(26);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(26);
    for (const u of UPGRADES) if (u.req) expect(UPG_BY_ID[u.req], u.id).toBeDefined();
  });
  it('cada capa sigue el contrato de nombres C{n}_{SALA}_upg_{id}', () => {
    for (const u of UPGRADES) {
      const cam = ROOMS[u.room].layers.base.replace('_base', '');
      expect(u.layer).toBe(`${cam}_upg_${u.id}`);
    }
  });
});

describe('salas y zonas', () => {
  it('las zonas tienen id único y coordenadas relativas 0–1', () => {
    for (const [k, r] of Object.entries(ROOMS)) {
      expect(new Set(zoneIds(k)).size, k).toBe(r.zones.length);
      for (const z of r.zones) for (const [x, y] of z.poly) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(1); }
    }
  });
  it('cada tarea y cada avería apuntan a una zona de su sala', () => {
    for (const t of TASKS) expect(zoneIds(t.room), t.id).toContain(t.zone);
    for (const f of FAULTS) expect(zoneIds(f.room), f.id).toContain(f.zone);
  });
  it('cada sala tiene zona de reinicio (tormenta solar) y las de la tormenta de arena tienen filtro', () => {
    for (const r of ['agua', 'oxi', 'com', 'ene']) expect(zoneIds(r)).toContain(ROOMS[r].restartZone);
    for (const n of NIGHTS) for (const e of n.events) if (e.kind === 'clog') expect(zoneIds(e.room)).toContain(ROOMS[e.room].clogZone);
  });
  it('Control tiene una puerta a cada sala de tareas', () => {
    for (const r of ['agua', 'oxi', 'com', 'ene']) expect(zoneIds('control')).toContain(`door.${r}`);
  });
});

describe('textos', () => {
  it('hay pregunta antes de dormir para las noches 1, 2 y 3, con respuesta válida', () => {
    for (const n of ['1', '2', '3']) {
      const q = (questions.sleep as Record<string, { options: string[]; answer: number }>)[n];
      expect(q.options).toHaveLength(3);
      expect(q.answer).toBeLessThan(3);
    }
    for (const f of FAULTS) expect(f.question.options[f.question.answer], f.id).toBeDefined();
  });
  it('cada tarea tiene datos reales de YANA y hay 3 sueños y 3 finales', () => {
    for (const t of TASKS) expect((yana.taskFacts as Record<string, string[]>)[t.id]?.length, t.id).toBeGreaterThan(0);
    expect(Object.keys(story.dreams)).toEqual(['1', '2', '3']);
    expect(Object.keys(story.endings).sort()).toEqual(['bad', 'good', 'mid']);
  });
  it('los créditos incluyen el aviso de la NASA tal cual', () => {
    expect(credits.disclaimer).toBe('NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites.');
  });
});
