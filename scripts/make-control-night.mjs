// Render de noche provisional de Control, vista desde el centro de la sala como las demás,
// hasta que el equipo renderice un C1_CONTROL_noche de verdad (el zip solo trae Control en vista cenital).
// Parte de la sala de Energía de noche (misma arquitectura de módulo, casi vacía) y la convierte en Control:
//  - el ventanal pasa a ser la pantalla grande con la Tierra (sacada del render cenital de Control);
//  - se borran los carteles de Energía y se pone «01 / SALA DE CONTROL»;
//  - en primer plano, la consola con sus monitores a contraluz.
//   node scripts/make-control-night.mjs   → art-src/sala/C1_CONTROL_noche.webp
import { rmSync } from 'node:fs';
import sharp from 'sharp';

const W = 1920, H = 1080;
const SHELL = 'art-src/sala/C5_ENERGIA_noche.webp';
const TOP = 'art-src/dia/C1_CONTROL_dia_base.webp';
const OUT = 'art-src/sala/C1_CONTROL_noche.webp';

/** Cristal del ventanal de Energía = pantalla de Control (px de 1920×1080). */
export const SCREEN = { x0: 604, y0: 414, x1: 1318, y1: 734 };

const { data } = await sharp(SHELL).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const img = Buffer.from(data);
const at = (x, y) => (y * W + x) * 3;

/** Borra una zona interpolando cada columna entre la fila de encima y la de debajo (pared lisa con juntas verticales). */
function fillColumns(x0, y0, x1, y1) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const k = (y - y0 + 1) / (y1 - y0 + 2);
    for (let c = 0; c < 3; c++) img[at(x, y) + c] = img[at(x, y0 - 1) + c] * (1 - k) + img[at(x, y1 + 1) + c] * k;
  }
}
/** Borra el texto de una placa: cada fila toma el color de sus extremos. */
function fillRows(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = (x - x0 + 1) / (x1 - x0 + 2);
    for (let c = 0; c < 3; c++) img[at(x, y) + c] = img[at(x0 - 1, y) + c] * (1 - k) + img[at(x1 + 1, y) + c] * k;
  }
}
// Carteles de las baterías (placas blancas a la izquierda)
fillRows(80, 533, 186, 547); fillRows(336, 535, 392, 546); fillRows(482, 535, 514, 545);
// «05», «SALA DE ENERGÍA», el texto pequeño y el icono de energía (pared derecha)
fillColumns(1672, 370, 1704, 406); fillColumns(1776, 408, 1846, 428); fillColumns(1784, 492, 1836, 512); fillColumns(1750, 532, 1864, 676);

// ---------- pantalla con la Tierra ----------
const sw = SCREEN.x1 - SCREEN.x0, sh = SCREEN.y1 - SCREEN.y0;
// En el render cenital la pantalla se ve desde arriba (achatada): se estira a lo alto al recortarla.
const earth = await sharp(TOP).extract({ left: 824, top: 307, width: 278, height: 92 })
  .resize(sw - 24, sh - 24, { fit: 'fill', kernel: 'lanczos3' }).modulate({ brightness: 1.15, saturation: 1.15 }).blur(0.6).png().toBuffer();
let scan = '';
for (let y = 0; y < sh; y += 3) scan += `<rect x="0" y="${y}" width="${sw}" height="1" fill="#000" opacity=".18"/>`;
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" rx="10" fill="#0b0f14"/></svg>`);
const lines = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}">${scan}
  <rect x="6" y="6" width="${sw - 12}" height="${sh - 12}" rx="6" fill="none" stroke="#9fd2ff" stroke-opacity=".15" stroke-width="2"/></svg>`);
const screen = await sharp(bg).composite([{ input: earth, left: 12, top: 12 }, { input: lines }]).png().toBuffer();

// ---------- luz de la pantalla, consola en primer plano y carteles nuevos ----------
const cx = (SCREEN.x0 + SCREEN.x1) / 2;
const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="spill" cx="${cx}" cy="${SCREEN.y1 + 40}" r="620" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5f8fc4" stop-opacity=".28"/><stop offset="1" stop-color="#5f8fc4" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo" cx="${cx}" cy="${(SCREEN.y0 + SCREEN.y1) / 2}" r="520" gradientUnits="userSpaceOnUse">
      <stop offset=".45" stop-color="#7fb0e0" stop-opacity=".14"/><stop offset="1" stop-color="#7fb0e0" stop-opacity="0"/></radialGradient>
    <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a20"/><stop offset=".08" stop-color="#07090c"/><stop offset="1" stop-color="#020304"/></linearGradient>
    <linearGradient id="mon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10151b"/><stop offset="1" stop-color="#05070a"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>
  <ellipse cx="${cx}" cy="${SCREEN.y1 + 110}" rx="700" ry="150" fill="url(#spill)" filter="url(#soft)"/>
  <!-- luz de los monitores de la consola sobre la pared del fondo -->
  <g filter="url(#soft)" opacity=".35">
    ${[-1, 0, 1].map((i) => `<ellipse cx="${cx + i * 200}" cy="${H - 250}" rx="120" ry="34" fill="#79b8ff"/>`).join('')}
  </g>
  <!-- consola -->
  <path d="M420 ${H - 130} L1500 ${H - 130} L1680 ${H} L240 ${H} Z" fill="url(#desk)"/>
  <path d="M420 ${H - 130} L1500 ${H - 130}" stroke="#8fb8e6" stroke-opacity=".4" stroke-width="2"/>
  ${[-1, 0, 1].map((i) => {
    const x = cx + i * 200 - 80, y = H - 245;
    return `<rect x="${x}" y="${y}" width="160" height="100" rx="5" fill="url(#mon)"/>
      <path d="M${x + 5} ${y + 1} H${x + 155}" stroke="#a9d4ff" stroke-opacity=".5" stroke-width="2"/>
      <path d="M${x} ${y + 6} V${y + 96} M${x + 160} ${y + 6} V${y + 96}" stroke="#6fa3d8" stroke-opacity=".25" stroke-width="2"/>
      <rect x="${x + 68}" y="${y + 100}" width="24" height="16" fill="#06080b"/>`;
  }).join('')}
  ${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${cx - 420 + k * 16}" y="${H - 104}" width="8" height="5" fill="${k % 3 ? '#3fd47a' : '#e0a640'}" opacity=".6"/>`).join('')}
  <!-- carteles de Control en la pared derecha, como los de las otras salas -->
  <text x="1675" y="402" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#1d1f22" fill-opacity=".8">01</text>
  <text x="1776" y="424" font-family="DejaVu Sans, Arial, sans-serif" font-size="13" fill="#1d1f22" fill-opacity=".75" letter-spacing="1">SALA DE CONTROL</text>
</svg>`);

await sharp(img, { raw: { width: W, height: H, channels: 3 } })
  .composite([{ input: screen, left: SCREEN.x0, top: SCREEN.y0 }, { input: overlay }])
  .webp({ quality: 88, effort: 5 }).toFile(OUT);
// La capa del blindaje de la versión cenital no encaja con esta cámara: sin capa, sale en la lista de mejoras.
rmSync('art-src/sala/C1_CONTROL_upg_Blindaje.webp', { force: true });
console.log(`→ ${OUT}`);
