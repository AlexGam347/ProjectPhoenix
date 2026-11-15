// Render de noche provisional de Control, hecho a partir del render de día del equipo (vista cenital),
// hasta que llegue un C1_CONTROL_noche de verdad. Recorta la sala, la apaga, deja encendidas las pantallas
// y las luces de los paneles y añade el brillo de los monitores.
//   node scripts/make-control-night.mjs   → art-src/sala/C1_CONTROL_noche.webp y C1_CONTROL_upg_Blindaje.webp
import sharp from 'sharp';

const SRC = 'art-src/dia', OUT = 'art-src/sala';
const CROP = { left: 253, top: 195, width: 1413, height: 795 }; // la sala de Control en el render de 1920×1080
const W = 1920, H = 1080;

/** Zonas que emiten luz (pantallas, consola, paneles), en 0..1 del recorte. */
const EMIT = [
  [0.395, 0.125, 0.61, 0.27], // pantalla grande
  [0.40, 0.25, 0.61, 0.33], // pantallas de la consola
  [0.635, 0.15, 0.685, 0.195], // pantalla pequeña de arriba a la derecha
  [0.268, 0.15, 0.31, 0.72], // paneles de la pared izquierda
  [0.69, 0.15, 0.742, 0.72], // paneles de la pared derecha
  [0.33, 0.6, 0.38, 0.7], // pantalla del quiosco
  [0.39, 0.39, 0.61, 0.46], // luces bajo la mesa
];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

async function night(file, out) {
  const { data } = await sharp(file).extract(CROP).resize(W, H, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Float32Array(W * H * 3), em = Buffer.alloc(W * H * 3), alpha = Buffer.alloc(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    alpha[i] = data[i * 4 + 3];
    const u = x / W, v = y / H, lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    // Luz de los monitores sobre la mesa y el suelo, y el exterior (tejados, suelo de Marte) casi negro.
    const pool = Math.exp(-(((u - 0.5) / 0.2) ** 2 + ((v - 0.36) / 0.28) ** 2));
    const room = smooth(0.2, 0.3, u) * smooth(0.8, 0.7, u) * smooth(0.9, 0.8, v);
    const k = 0.1 + 0.12 * room + 0.32 * pool;
    let e = 0;
    for (const [x0, y0, x1, y1] of EMIT) if (u >= x0 && u <= x1 && v >= y0 && v <= y1) { e = r > g * 1.2 && r > b * 1.4 ? 0 : smooth(0.32, 0.6, lum); break; } // lo naranja es la pared, no luz
    px[i * 3] = r * k * 0.72; px[i * 3 + 1] = g * k * 0.86; px[i * 3 + 2] = b * k * 1.2;
    em[i * 3] = r * e; em[i * 3 + 1] = g * e; em[i * 3 + 2] = b * e;
  }
  const glow = await sharp(em, { raw: { width: W, height: H, channels: 3 } }).blur(16).raw().toBuffer();
  const res = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) {
    res[i * 4 + c] = Math.min(255, Math.max(px[i * 3 + c], em[i * 3 + c] * 0.95) + glow[i * 3 + c] * 0.55);
    res[i * 4 + 3] = alpha[i];
  }
  await sharp(res, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 90, effort: 5 }).toFile(out);
  console.log(`→ ${out}`);
}

await night(`${SRC}/C1_CONTROL_dia_base.webp`, `${OUT}/C1_CONTROL_noche.webp`);
await night(`${SRC}/C1_CONTROL_dia_upg_Blindaje.webp`, `${OUT}/C1_CONTROL_upg_Blindaje.webp`);
