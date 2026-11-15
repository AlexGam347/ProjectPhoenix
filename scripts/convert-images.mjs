// Convierte los PNG de Blender (art-src/*.png, 1920×1080 o panorámicos 2880×1080) a WebP en dos tamaños
// y escribe public/assets/rooms/manifest.json. El juego usa los renders que encuentre en el manifiesto
// y el boceto provisional para el resto, así que se pueden ir añadiendo sala a sala.
//   Nombres: C{n}_{SALA}_base.png · C{n}_{SALA}_base_tormenta_solar.png · C{n}_{SALA}_upg_{id}.png
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SRC = new URL('../art-src/', import.meta.url);
const OUT = new URL('../public/assets/rooms/', import.meta.url);
const WIDTHS = [1920, 1280];
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => /^C\d_[A-Z]+_.+\.png$/i.test(f));
const images = {};
for (const f of files) {
  const name = f.replace(/\.png$/i, '');
  const img = sharp(new URL(f, SRC));
  const { width, height } = await img.metadata();
  const srcset = [];
  for (const w of WIDTHS) {
    // Los renders panorámicos conservan su proporción: el ancho escala con la altura.
    const tw = Math.round((w / 1920) * (width * (1080 / height)));
    const file = `${name}-${w}.webp`;
    await sharp(new URL(f, SRC)).resize({ width: tw }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(new URL(file, OUT).pathname);
    srcset.push(`assets/rooms/${file} ${tw}w`);
  }
  images[name] = { w: width, h: height, src: srcset[0].split(' ')[0], srcset: srcset.join(', ') };
  console.log(`✓ ${name} (${width}×${height})`);
}
writeFileSync(new URL('manifest.json', OUT), JSON.stringify({ images }, null, 1));
console.log(`${files.length} imágenes → public/assets/rooms/manifest.json`);
if (!files.length) console.log('No hay PNG en art-src/. Nombres esperados: C2_AGUA_base.png, C2_AGUA_upg_rec1.png…');
