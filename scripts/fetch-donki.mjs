// Descarga en tiempo de build la llamarada solar más fuerte de los últimos 12 meses (NASA DONKI)
// y la deja en public/data/donki-flare.json. La clave va como secreto de CI (NASA_API_KEY), nunca en el cliente.
// Si la API falla, se usa la copia de respaldo (src/data/donki-fallback.json). Nunca rompe el build.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const key = process.env.NASA_API_KEY || 'DEMO_KEY';
const out = new URL('../public/data/donki-flare.json', import.meta.url);
const fallback = JSON.parse(readFileSync(new URL('../src/data/donki-fallback.json', import.meta.url), 'utf8'));
mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });

const day = (d) => d.toISOString().slice(0, 10);
const end = new Date();
const start = new Date(end.getTime() - 365 * 864e5);
const rank = (c = '') => ({ X: 4, M: 3, C: 2, B: 1, A: 0 }[c[0]] ?? -1) * 100 + (parseFloat(c.slice(1)) || 0);

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).host}`);
  return res.json();
}

/** 1) Servicio web de DONKI (CCMC, sin clave). 2) api.nasa.gov en tramos de 30 días. */
async function fetchFlares() {
  const errors = [];
  try {
    return await getJson(`https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=${day(start)}&endDate=${day(end)}`);
  } catch (e) { errors.push(e.message); }
  try {
    const all = [];
    for (let t = start.getTime(); t < end.getTime(); t += 30 * 864e5) {
      const a = new Date(t), b = new Date(Math.min(end.getTime(), t + 30 * 864e5));
      const part = await getJson(`https://api.nasa.gov/DONKI/FLR?startDate=${day(a)}&endDate=${day(b)}&api_key=${key}`);
      if (Array.isArray(part)) all.push(...part);
    }
    return all;
  } catch (e) { errors.push(e.message); }
  throw new Error(errors.join('; '));
}

try {
  const list = await fetchFlares();
  if (!Array.isArray(list) || !list.length) throw new Error('sin llamaradas');
  const best = list.reduce((a, b) => (rank(b.classType) > rank(a.classType) ? b : a));
  const flare = {
    source: 'donki', classType: best.classType, peakTime: best.peakTime || best.beginTime,
    activeRegionNum: best.activeRegionNum ?? null, link: best.link ?? null, fetchedAt: new Date().toISOString(),
  };
  writeFileSync(out, JSON.stringify(flare, null, 2));
  console.log(`DONKI: llamarada ${flare.classType} del ${flare.peakTime}`);
} catch (e) {
  writeFileSync(out, JSON.stringify(fallback, null, 2));
  console.warn(`DONKI no disponible (${e.message}): se usa la copia de respaldo ${fallback.classType} del ${fallback.peakTime}`);
}
