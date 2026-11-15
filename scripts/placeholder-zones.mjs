// Calcula las zonas clicables de las salas sobre los bocetos provisionales del dossier,
// proyectando la geometría 3D de cada objeto con la misma cámara que el boceto.
// Cuando lleguen los renders de Blender, las zonas se redibujan con el editor (?zones=edit).
globalThis.window = {};
const { SB } = await import('../src/view/room/placeholder/engine.js');
import { writeFileSync } from 'node:fs';

const W = 960, H = 540;
const r3 = (v) => Math.round(v * 1000) / 1000;
const box = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => [x, y, z])));
const faceX = (x, z0, z1, y0, y1) => [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]];
const faceZ = (z, x0, x1, y0, y1) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
function hull(pts) {
  pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()) { while (up.length >= 2 && cross(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function zone(F, pts3, pad = 0.08) {
  SB.setF(F);
  const p2 = pts3.map((p) => SB.P(...p));
  const h = hull(p2);
  const cx = h.reduce((a, p) => a + p[0], 0) / h.length, cy = h.reduce((a, p) => a + p[1], 0) / h.length;
  return h.map(([x, y]) => [r3(Math.min(1, Math.max(0, (cx + (x - cx) * (1 + pad)) / W))), r3(Math.min(1, Math.max(0, (cy + (y - cy) * (1 + pad)) / H)))]);
}
const rect = (x0, y0, x1, y1) => [[r3(x0 / W), r3(y0 / H)], [r3(x1 / W), r3(y0 / H)], [r3(x1 / W), r3(y1 / H)], [r3(x0 / W), r3(y1 / H)]];
const pt = (F, p) => { SB.setF(F); const [x, y] = SB.P(...p); return [r3(x / W), r3(y / H)]; };

const rooms = {
  control: {
    id: 'control', cam: 'C1', name: 'Sala de Control', short: 'Control', placeholder: 'control',
    image: { w: 1920, h: 1080 }, layers: { base: 'C1_CONTROL_base', solar: 'C1_CONTROL_base_tormenta_solar' },
    zones: [
      { id: 'door.agua', label: 'Puerta a la Planta de Agua', nav: 'agua', poly: zone(480, faceX(-7, 9.8, 10.9, 0, 3.05), 0.04) },
      { id: 'door.ene', label: 'Puerta a la Sala de Energía', nav: 'ene', poly: zone(480, faceX(-7, 7.6, 8.7, 0, 3.05), 0.04) },
      { id: 'door.oxi', label: 'Puerta a la Sala de Oxígeno', nav: 'oxi', poly: zone(480, faceX(7, 9.8, 10.9, 0, 3.05), 0.04) },
      { id: 'door.com', label: 'Puerta al Invernadero', nav: 'com', poly: zone(480, faceX(7, 7.6, 8.7, 0, 3.05), 0.04) },
      { id: 'kiosk', label: 'Catálogo de mejoras', special: 'kiosk', poly: zone(480, box(-5.4, -4.5, 0, 1.15, 6.6, 7.2), 0.25) },
      { id: 'earth', label: 'Pantalla de la Tierra', special: 'earth', poly: zone(480, faceZ(12, -3.95, 3.95, 1.18, 4.32), 0) },
      { id: 'yana', label: 'YANA', special: 'yana', poly: rect(866, 322, 960, 440) },
    ],
    anchors: {
      'door.agua': pt(480, [-7, 2.47, 10.35]), 'door.ene': pt(480, [-7, 2.47, 8.15]),
      'door.oxi': pt(480, [7, 2.47, 10.35]), 'door.com': pt(480, [7, 2.47, 8.15]),
      earth: zone(480, faceZ(12.0, -3.8, 3.8, 1.3, 4.2), 0),
    },
  },
  agua: {
    id: 'agua', cam: 'C2', name: 'Planta de Agua', short: 'Agua', resource: 'agua', placeholder: 'agua',
    image: { w: 1920, h: 1080 }, layers: { base: 'C2_AGUA_base', solar: 'C2_AGUA_base_tormenta_solar' },
    restartZone: 'fundidor', clogZone: 'filtro',
    zones: [
      { id: 'fundidor', label: 'Fundidor de hielo', poly: zone(560, box(-4.9, -2.3, 0, 2.35, 7.0, 8.8)) },
      { id: 'filtro', label: 'Filtro de agua', poly: zone(560, box(0.6, 1.6, 0, 2.0, 8.8, 9.6), 0.15) },
      { id: 'valvula', label: 'Válvula de calor', icon: 'valve', poly: zone(560, faceX(5.98, 7.2, 8.8, 2.4, 3.9), 0.1) },
    ],
    anchors: {},
  },
  oxi: {
    id: 'oxi', cam: 'C3', name: 'Sala de Oxígeno', short: 'Oxígeno', resource: 'oxi', placeholder: 'oxigeno',
    image: { w: 1920, h: 1080 }, layers: { base: 'C3_OXIGENO_base', solar: 'C3_OXIGENO_base_tormenta_solar' },
    restartZone: 'electrolizador', clogZone: 'filtroco2',
    zones: [
      { id: 'electrolizador', label: 'Electrolizador', poly: zone(560, box(-4.9, -2.1, 0, 2.1, 6.8, 8.0)) },
      { id: 'filtroco2', label: 'Filtro de CO₂', poly: zone(560, faceX(5.98, 7.6, 9.6, 1.0, 2.95), 0.1) },
    ],
    anchors: {},
  },
  com: {
    id: 'com', cam: 'C4', name: 'Invernadero', short: 'Invernadero', resource: 'com', placeholder: 'invernadero',
    image: { w: 1920, h: 1080 }, layers: { base: 'C4_INVERNADERO_base', solar: 'C4_INVERNADERO_base_tormenta_solar' },
    restartZone: 'estante', clogZone: 'filtroaire',
    zones: [
      { id: 'estante', label: 'Estante de lechugas', poly: zone(560, box(-4.9, -2.7, 0, 2.05, 5.6, 9.6), 0.05) },
      { id: 'filtroaire', label: 'Filtro de aire', icon: 'filter', poly: zone(560, faceZ(11.98, 4.75, 5.9, 1.0, 2.4), 0.1) },
    ],
    anchors: {},
  },
  ene: {
    id: 'ene', cam: 'C5', name: 'Sala de Energía', short: 'Energía', resource: 'ene', placeholder: 'energia',
    image: { w: 1920, h: 1080 }, layers: { base: 'C5_ENERGIA_base', solar: 'C5_ENERGIA_base_tormenta_solar' },
    restartZone: 'cuadro',
    zones: [
      { id: 'ventanal', label: 'Ventanal del campo solar', poly: zone(560, faceZ(12, -4.6, 4.6, 0.9, 3.9), 0) },
      { id: 'cuadro', label: 'Cuadro eléctrico', poly: zone(560, faceX(5.98, 8.0, 10.6, 1.0, 2.95), 0.1) },
      { id: 'baterias', label: 'Baterías', poly: zone(560, box(-4.9, -2.6, 0, 2.1, 6.4, 9.8), 0.03) },
    ],
    anchors: {},
  },
};
for (const [k, r] of Object.entries(rooms)) {
  r.art = 'placeholder';
  writeFileSync(new URL(`../src/data/rooms/${k}.json`, import.meta.url), JSON.stringify(r, null, 1).replace(/\[\s+([\d.]+),\s+([\d.]+)\s+\]/g, '[$1,$2]') + '\n');
}
console.log('zonas escritas:', Object.keys(rooms).join(', '));
