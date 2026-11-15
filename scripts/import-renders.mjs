// Importa los renders del equipo (nomenclatura de Blender) al juego, en dos juegos de imágenes:
//   día   (art-src/dia):  vista cenital de cada sala para el panel del día.
//     C2_AGUA_dia_base.webp · C2_AGUA_dia_upg_C1_DepositoI.webp · C2_AGUA_dia_huecos.json · …_dia_completa.webp
//   noche (art-src/sala): la sala vista desde dentro, para la noche.
//     C2_AGUA_noche.webp · C2_AGUA_upg_C1_DepositoI.webp · C5_ENERGIA_tormenta_arena.webp · …_base_dia / …_completa_dia
//   node scripts/import-renders.mjs [carpetaDia] [carpetaNoche]
// Salida: public/assets/rooms/{day,night}/NOMBRE-1920.webp (+ -1280) y las entradas «day/NOMBRE» y «night/NOMBRE» de manifest.json.
// Las versiones «completa» y «base_dia» no se cargan en el juego: las usa scripts/check-renders.mjs.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/** Nombre de la capa del equipo → id de la mejora en el juego. */
export const LAYER_ID = {
  C1_DepositoI: 'dep1', C1_DepositoII: 'dep2', C1_DepositoIII: 'dep3', P1_TaladroI: 'tal1', P1_TaladroII: 'tal2', P2_Reciclador: 'rec1',
  C1_TanqueI: 'tan1', C1_TanqueII: 'tan2', C1_TanqueIII: 'tan3', P1_ElectrolizadorI: 'ele1', P1_ElectrolizadorII: 'ele2', P2_MOXIE: 'mox1',
  C1_DespensaI: 'des1', C1_DespensaII: 'des2', P1_EstantesI: 'est1', P1_EstantesII: 'est2', P2_LED_I: 'led1', P2_LED_II: 'led2',
  C1_BateriasI: 'bat1', C1_BateriasII: 'bat2', P1_PanelesI: 'pan1', P1_PanelesII: 'pan2', P2_Reactor: 'rea1', Robot: 'rob1',
  Blindaje: 'bli1',
};

const SETS = [
  {
    set: 'day', src: process.argv[2] ?? 'art-src/dia',
    // → [sala, nombre en el juego, capa del equipo] o null si no se importa
    parse: (f) => {
      const m = f.match(/^(C\d_[A-Z]+)_dia_(base|completa|upg_(.+))\.webp$/);
      if (!m) return undefined;
      if (m[2] === 'completa') return null;
      return m[2] === 'base' ? [m[1], 'base'] : [m[1], 'upg', m[3]];
    },
  },
  {
    set: 'night', src: process.argv[3] ?? 'art-src/sala',
    parse: (f) => {
      const m = f.match(/^(C\d_[A-Z]+)_(noche|tormenta_arena|base_dia|completa_dia|upg_(.+))\.webp$/);
      if (!m) return undefined;
      if (m[2] === 'base_dia' || m[2] === 'completa_dia') return null;
      return m[2] === 'noche' ? [m[1], 'base'] : m[2] === 'tormenta_arena' ? [m[1], 'sand'] : [m[1], 'upg', m[3]];
    },
  },
];

const ROOT = 'public/assets/rooms';
mkdirSync(ROOT, { recursive: true });
const manifestPath = join(ROOT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { images: {} };
manifest.images ??= {};
// Se rehacen todas las entradas de salas (también las antiguas sin juego, de antes de separar día y noche).
for (const k of Object.keys(manifest.images)) if (/^((day|night)\/)?C\d_/.test(k)) delete manifest.images[k];
for (const f of readdirSync(ROOT)) if (/^C\d_.*\.webp$/.test(f)) rmSync(join(ROOT, f));

const unknown = [];
for (const { set, src: SRC, parse } of SETS) {
  if (!existsSync(SRC)) { console.log(`${set}: no está ${SRC}, se omite`); continue; }
  const OUT = join(ROOT, set);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  // Rectángulos y centros de cada hueco (huecos.json, solo en el día), en píxeles de 1920×1080.
  const huecos = {};
  for (const f of readdirSync(SRC).filter((f) => f.endsWith('_huecos.json'))) {
    const j = JSON.parse(readFileSync(join(SRC, f), 'utf8'));
    for (const [key, hu] of Object.entries(j.huecos ?? {})) huecos[`${j.sala}:${key}`] = hu;
  }
  let n = 0;
  for (const f of readdirSync(SRC).filter((f) => f.endsWith('.webp')).sort()) {
    const p = parse(f);
    if (p === null) continue;
    if (p === undefined) { unknown.push(`${set}/${f}`); continue; }
    const [room, kind, layer] = p;
    let name;
    if (kind === 'upg') {
      const id = LAYER_ID[layer];
      if (!id) { unknown.push(`${set}/${f}`); continue; }
      name = `${room}_upg_${id}`;
    } else name = `${room}_${kind}`;
    const src = join(SRC, f);
    const { width, height } = await sharp(src).metadata();
    // 1920: se copia tal cual (ya viene en WebP, sin volver a comprimir). 1280: se reduce.
    copyFileSync(src, join(OUT, `${name}-1920.webp`));
    await sharp(src).resize({ width: 1280 }).webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(join(OUT, `${name}-1280.webp`));
    const entry = {
      w: width, h: height, src: `assets/rooms/${set}/${name}-1920.webp`,
      srcset: `assets/rooms/${set}/${name}-1280.webp 1280w, assets/rooms/${set}/${name}-1920.webp 1920w`,
    };
    const hu = layer && huecos[`${room}:${layer}`];
    if (hu) { entry.rect = hu.rect_px; if (hu.centro_px) entry.center = hu.centro_px; }
    manifest.images[`${set}/${name}`] = entry;
    n++;
  }
  console.log(`${set}: ${n} imágenes importadas`);
}
manifest.images = Object.fromEntries(Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
console.log(`→ ${manifestPath}`);
if (unknown.length) console.log(`Sin traducir (revisar nombres): ${unknown.join(', ')}`);
