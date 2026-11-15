// Comprueba que los renders encajan con el diseño del equipo:
//  1. compone cada sala como el juego (fondo + todas las capas de mejora) y la compara con «*_dia_completa»;
//  2. mide dónde está de verdad cada capa (píxeles visibles) frente a su rectángulo de huecos.json.
//   node scripts/check-renders.mjs [carpeta]   (por defecto art-src/dia)   → imprime una tabla Markdown
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2] ?? 'art-src/dia';
const W = 480, H = 270; // comparación a escala reducida: suficiente para ver capas desplazadas o que faltan

async function gray(input) {
  return sharp(input).resize(W, H).grayscale().raw().toBuffer();
}

function stats(a, b) {
  let sad = 0, se = 0, bad = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); sad += d; se += d * d; if (d > 24) bad++; }
  const mse = se / a.length;
  return { mae: sad / a.length, psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse), diffPct: (bad / a.length) * 100 };
}

/** Píxeles bien opacos (alfa > 128) de una capa: cuántos hay y su caja, en píxeles de 1920×1080.
 *  Se ignoran los semitransparentes casi invisibles (sombras y ruido del render) que hay por toda la imagen. */
async function alphaBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1, count = 0, faint = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[y * info.width + x];
    if (a > 128) { count++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    else if (a > 10) faint++;
  }
  return { box: x1 < 0 ? null : [x0, y0, x1, y1], count, faint };
}

const files = readdirSync(SRC);
const rooms = [...new Set(files.map((f) => f.match(/^(C\d_[A-Z]+)_dia_/)?.[1]).filter(Boolean))].sort();
console.log('| Sala | Capas | Similitud con «completa» (PSNR) | Píxeles distintos | Capas fuera de su hueco |');
console.log('|---|---|---|---|---|');
const layerRows = [];
for (const room of rooms) {
  const base = join(SRC, `${room}_dia_base.webp`);
  const layers = files.filter((f) => f.startsWith(`${room}_dia_upg_`)).sort().map((f) => join(SRC, f));
  const composed = await sharp(base).composite(layers.map((input) => ({ input }))).png().toBuffer();
  const s = stats(await gray(composed), await gray(join(SRC, `${room}_dia_completa.webp`)));
  const huecos = JSON.parse(readFileSync(join(SRC, `${room}_dia_huecos.json`), 'utf8')).huecos;
  let off = 0;
  for (const f of layers) {
    const key = f.split('_dia_upg_')[1].replace('.webp', '');
    const { box, count, faint } = await alphaBox(f), rect = huecos[key]?.rect_px;
    // Margen de 40 px: el hueco es aproximado (sombra, bordes) y lo importante es que la capa caiga en su sitio.
    const inside = box && rect && box[0] >= rect[0] - 40 && box[1] >= rect[1] - 40 && box[2] <= rect[2] + 40 && box[3] <= rect[3] + 40;
    if (!inside) off++;
    layerRows.push(`| ${room} | ${key} | ${count} | ${box ? box.join(', ') : '**vacía**'} | ${rect ? rect.join(', ') : 'sin hueco'} | ${inside ? 'sí' : '**no**'} | ${faint} |`);
  }
  console.log(`| ${room} | ${layers.length} | ${s.psnr === Infinity ? 'idéntica' : s.psnr.toFixed(1) + ' dB'} | ${s.diffPct.toFixed(2)} % | ${off} |`);
}
console.log('\n| Sala | Capa | Píxeles opacos | Caja de los píxeles opacos (x0, y0, x1, y1) | Hueco en huecos.json | Dentro | Píxeles casi invisibles |');
console.log('|---|---|---|---|---|---|---|');
for (const r of layerRows) console.log(r);
