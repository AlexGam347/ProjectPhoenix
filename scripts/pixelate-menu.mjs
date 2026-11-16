// Fondo del menú: pixela la imagen de Marte del equipo (art-src/menu/mars.webp).
//   node scripts/pixelate-menu.mjs
// Reduce a 320×180 y limita la paleta con tramado para que parezca pixel art; el juego la escala sin suavizado.
import sharp from 'sharp';

const SRC = 'art-src/menu/mars.webp';
const OUT = 'public/assets/menu/mars-pixel.png';
const W = 320, H = 180;

// Primero una reducción con buen filtro (sin que el planeta pierda forma) y un poco más de contraste,
// luego la paleta corta con tramado.
const small = await sharp(SRC).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).modulate({ saturation: 1.12 }).linear(1.08, -6).toBuffer();
await sharp(small).png({ palette: true, colours: 32, dither: 0.6, effort: 10 }).toFile(OUT);
console.log(`${OUT}: ${W}×${H}, 32 colores`);
