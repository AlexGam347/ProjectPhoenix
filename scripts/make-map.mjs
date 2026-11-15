// Mapa del día: une las 5 vistas cenitales del equipo (art-src/dia) en una sola imagen de la base,
// rodeada de suelo de Marte para que los bordes del mapa queden fuera de la base.
//  - Energía y Agua, y Oxígeno e Invernadero, se solapan de verdad (mismo encuadre desplazado, medido por
//    correlación); Control va en medio. Cada sala manda en su franja y las uniones se funden.
//  - El suelo de alrededor se hace con trocitos de suelo de los propios renders, girados y repartidos al azar.
// Lo llama import-renders.mjs. Las capas de mejora no van aquí: el juego las pone encima (MAP de baseMap.ts).
import sharp from 'sharp';
import { join } from 'node:path';

/** Igual que en src/view/day/baseMap.ts. */
export const MAP = {
  strip: { w: 5440, h: 1044 },
  margin: { l: 640, r: 640, t: 480, b: 480 },
  tiles: [
    { cam: 'C5_ENERGIA', x: 0, y: 0 },
    { cam: 'C2_AGUA', x: 660, y: -36 },
    { cam: 'C1_CONTROL', x: 1760, y: -36 },
    { cam: 'C3_OXIGENO', x: 2860, y: -36 },
    { cam: 'C4_INVERNADERO', x: 3520, y: -36 },
  ],
  /** Fronteras entre salas (x de la tira): a medio camino entre una sala y la siguiente. */
  seams: [1290, 2170, 3270, 4150],
};
const SEAM = 110, EDGE = 260;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Generador pseudoaleatorio con semilla (el mapa sale igual cada vez). */
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }

async function ground(src, W, H) {
  const rand = rng(7);
  // Trozos de suelo liso (sin sombras grandes ni edificios), buscados por uniformidad.
  const sources = [
    { file: 'C2_AGUA_dia_base.webp', left: 1480, top: 280 },
    { file: 'C5_ENERGIA_dia_base.webp', left: 120, top: 160 },
  ];
  const patches = await Promise.all(sources.map((s) => sharp(join(src, s.file)).extract({ left: s.left, top: s.top, width: 400, height: 400 }).removeAlpha().raw().toBuffer()));
  const P = 200, alpha = Buffer.alloc(P * P);
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const d = Math.hypot(x - P / 2 + 0.5, y - P / 2 + 0.5) / (P / 2);
    alpha[y * P + x] = 255 * smooth(1, 0.45, d);
  }
  const inputs = [];
  const n = Math.ceil((W * H) / (110 * 110));
  for (let i = 0; i < n; i++) {
    const p = patches[Math.floor(rand() * patches.length)];
    const ox = Math.floor(rand() * (400 - P)), oy = Math.floor(rand() * (400 - P));
    const rot = Math.floor(rand() * 4), flip = rand() < 0.5;
    const buf = Buffer.alloc(P * P * 4);
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      let sx = x, sy = y;
      if (flip) sx = P - 1 - sx;
      for (let r = 0; r < rot; r++) [sx, sy] = [sy, P - 1 - sx];
      const s = ((oy + sy) * 400 + ox + sx) * 3, d = (y * P + x) * 4;
      buf[d] = p[s]; buf[d + 1] = p[s + 1]; buf[d + 2] = p[s + 2]; buf[d + 3] = alpha[y * P + x];
    }
    inputs.push({ input: buf, raw: { width: P, height: P, channels: 4 }, left: Math.floor(rand() * (W + P)) - P, top: Math.floor(rand() * (H + P)) - P });
  }
  const base = sharp({ create: { width: W, height: H, channels: 3, background: { r: 150, g: 84, b: 34 } } });
  // sharp no admite entradas que se salgan del lienzo: se recortan los trozos del borde.
  const safe = [];
  for (const it of inputs) {
    const l = Math.max(0, it.left), t = Math.max(0, it.top), r = Math.min(W, it.left + P), b = Math.min(H, it.top + P);
    if (r <= l || b <= t) continue;
    if (l === it.left && t === it.top && r - l === P && b - t === P) { safe.push(it); continue; }
    const cut = await sharp(it.input, { raw: it.raw }).extract({ left: l - it.left, top: t - it.top, width: r - l, height: b - t }).raw().toBuffer();
    safe.push({ input: cut, raw: { width: r - l, height: b - t, channels: 4 }, left: l, top: t });
  }
  return base.composite(safe).removeAlpha().raw().toBuffer();
}

export async function makeMap(src, out) {
  const { strip, margin: M, tiles, seams } = MAP;
  const W = strip.w + M.l + M.r, H = strip.h + M.t + M.b;
  const img = await ground(src, W, H);
  const tileData = await Promise.all(tiles.map((t) => sharp(join(src, `${t.cam}_dia_base.webp`)).removeAlpha().raw().toBuffer()));
  // Franja de cada sala: [frontera anterior, frontera siguiente], con fundido de ±SEAM.
  const own = (i, x) => {
    const left = i === 0 ? 1 : smooth(seams[i - 1] - SEAM, seams[i - 1] + SEAM, x);
    const right = i === tiles.length - 1 ? 1 : 1 - smooth(seams[i] - SEAM, seams[i] + SEAM, x);
    return left * right;
  };
  for (let y = 0; y < strip.h; y++) {
    const wy = y + M.t;
    if (wy < 0 || wy >= H) continue;
    for (let x = 0; x < strip.w; x++) {
      const wx = x + M.l;
      if (wx < 0 || wx >= W) continue;
      // Fundido con el suelo en los bordes de la tira (los renders se acaban ahí).
      const e = Math.min(smooth(0, EDGE, x), smooth(0, EDGE, strip.w - x), smooth(0, EDGE * 0.7, y), smooth(0, EDGE * 0.7, strip.h - y));
      if (e <= 0) continue;
      let r = 0, g = 0, b = 0, wsum = 0;
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i], tx = Math.min(1919, Math.max(0, x - t.x)), ty = Math.min(1079, Math.max(0, y - t.y));
        if (x - t.x < -1 || x - t.x > 1920) continue;
        const w = own(i, x);
        if (w <= 0) continue;
        const s = (ty * 1920 + tx) * 3, d = tileData[i];
        r += d[s] * w; g += d[s + 1] * w; b += d[s + 2] * w; wsum += w;
      }
      if (!wsum) continue;
      const k = (wy * W + wx) * 3;
      img[k] = img[k] * (1 - e) + (r / wsum) * e;
      img[k + 1] = img[k + 1] * (1 - e) + (g / wsum) * e;
      img[k + 2] = img[k + 2] * (1 - e) + (b / wsum) * e;
    }
  }
  const full = join(out, 'MAP_base-full.webp'), half = join(out, 'MAP_base-half.webp');
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 80, effort: 5 }).toFile(full);
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).resize({ width: Math.round(W / 2) }).webp({ quality: 80, effort: 5 }).toFile(half);
  return { w: W, h: H, full: 'MAP_base-full.webp', half: 'MAP_base-half.webp' };
}
