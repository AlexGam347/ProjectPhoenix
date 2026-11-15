// Regla de estilo del equipo: sin guiones largos ni puntos separadores en nada que vea el jugador.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BANNED = /[—–·]/;
// Sin emojis ni glifos Unicode haciendo de iconos: los iconos son pixel art propio (src/view/pixelIcons.ts).
const GLYPHS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{2B00}-\u{2BFF}]/u;
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
// Cadenas entre comillas o plantillas en el código de la vista (los comentarios no cuentan).
const strings = (src: string) => [...src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => m[2]);

describe('textos sin — – ·', () => {
  it('datos JSON', () => {
    for (const f of walk('src/data').filter((f) => f.endsWith('.json'))) {
      const bad = readFileSync(f, 'utf8').split('\n').filter((l) => BANNED.test(l));
      expect(bad, f).toEqual([]);
    }
  });
  it('cadenas de la interfaz', () => {
    for (const f of walk('src/view').filter((f) => /\.(ts|js)$/.test(f))) {
      const bad = strings(readFileSync(f, 'utf8')).filter((s) => BANNED.test(s));
      expect(bad, f).toEqual([]);
    }
  });
  it('index.html', () => expect(BANNED.test(readFileSync('index.html', 'utf8'))).toBe(false));
});

describe('sin emojis ni glifos como iconos', () => {
  it('datos JSON', () => {
    for (const f of walk('src/data').filter((f) => f.endsWith('.json'))) {
      expect(readFileSync(f, 'utf8').split('\n').filter((l) => GLYPHS.test(l)), f).toEqual([]);
    }
  });
  it('cadenas de la interfaz', () => {
    for (const f of walk('src/view').filter((f) => f.endsWith('.ts'))) {
      expect(strings(readFileSync(f, 'utf8')).filter((s) => GLYPHS.test(s)), f).toEqual([]);
    }
  });
});
