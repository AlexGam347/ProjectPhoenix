// Llamarada solar real (NASA DONKI). Se descarga en el build (scripts/fetch-donki.mjs) a public/data/donki-flare.json;
// el cliente nunca llama a la API ni ve la clave. Si falta el archivo, se usa la copia de respaldo.
import fallback from '../data/donki-fallback.json';

export interface Flare { classType: string; peakTime: string; activeRegionNum?: number | null; source?: string }

export async function loadFlare(): Promise<Flare> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/donki-flare.json`, { cache: 'no-cache' });
    if (r.ok) {
      const j = (await r.json()) as Flare;
      if (j.classType && j.peakTime) return j;
    }
  } catch { /* sin red: respaldo */ }
  return fallback as Flare;
}
