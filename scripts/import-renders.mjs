// Importa los renders del equipo (nomenclatura de Blender) al juego.
//   node scripts/import-renders.mjs [carpeta]      (por defecto art-src/dia)
// Entrada:  C2_AGUA_dia_base.webp · C2_AGUA_dia_upg_C1_DepositoI.webp · C2_AGUA_dia_huecos.json · …_dia_completa.webp
// Salida:   public/assets/rooms/C2_AGUA_base-1920.webp (+ -1280) · C2_AGUA_upg_dep1-1920.webp … y manifest.json
// La versión «completa» no se carga en el juego: la usa scripts/check-renders.mjs para comprobar que las capas encajan.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const SRC = process.argv[2] ?? 'art-src/dia';
const OUT = 'public/assets/rooms';
mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { images: {} };
manifest.images ??= {};

// Rectángulos de cada capa (huecos.json), en píxeles de 1920×1080.
const rects = {};
for (const f of readdirSync(SRC).filter((f) => f.endsWith('_huecos.json'))) {
  const j = JSON.parse(readFileSync(join(SRC, f), 'utf8'));
  for (const [key, h] of Object.entries(j.huecos ?? {})) rects[`${j.sala}:${key}`] = h.rect_px;
}

let n = 0;
const unknown = [];
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.webp')).sort()) {
  const m = f.match(/^(C\d_[A-Z]+)_dia_(base|completa|upg_(.+))\.webp$/);
  if (!m) { unknown.push(f); continue; }
  const [, room, kind, layer] = m;
  if (kind === 'completa') continue;
  let name;
  if (kind === 'base') name = `${room}_base`;
  else {
    const id = LAYER_ID[layer];
    if (!id) { unknown.push(f); continue; }
    name = `${room}_upg_${id}`;
  }
  const src = join(SRC, f);
  const { width, height } = await sharp(src).metadata();
  // 1920: se copia tal cual (ya viene en WebP, sin volver a comprimir). 1280: se reduce.
  copyFileSync(src, join(OUT, `${name}-1920.webp`));
  await sharp(src).resize({ width: 1280 }).webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(join(OUT, `${name}-1280.webp`));
  const entry = {
    w: width, h: height, src: `assets/rooms/${name}-1920.webp`,
    srcset: `assets/rooms/${name}-1280.webp 1280w, assets/rooms/${name}-1920.webp 1920w`,
  };
  if (layer && rects[`${room}:${layer}`]) entry.rect = rects[`${room}:${layer}`];
  manifest.images[name] = entry;
  n++;
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${n} capas importadas → ${manifestPath}`);
if (unknown.length) console.log(`Sin traducir (revisar nombres): ${unknown.join(', ')}`);
