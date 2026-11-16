// Fondo del menú en pixel art (320×180, escalado sin suavizado): casco de astronauta con la Tierra
// reflejada en el visor, la Luna y estrellas. Se dibuja una vez, píxel a píxel, con colores planos y tramado.
export const ART_W = 320, ART_H = 180;

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Tramado ordenado 4×4: decide entre dos colores para un valor 0..1 sin degradados suaves. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x: number, y: number, t: number) => t > BAYER[(y & 3) * 4 + (x & 3)];

/** Ruido de valor con semilla (suave, para continentes y nubes). */
function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number, s: number) => noise(x, y, s) * 0.55 + noise(x * 2.1, y * 2.1, s + 7) * 0.3 + noise(x * 4.3, y * 4.3, s + 13) * 0.15;

const C = {
  space: hex('#060912'), space2: hex('#0c1426'), star: hex('#cfd8ea'), star2: hex('#6f7c96'),
  shell: hex('#d4d7dc'), shellMid: hex('#a3a8b0'), shellDark: hex('#6b7079'), shellDeep: hex('#3d4148'),
  rim: hex('#22262d'), rimHi: hex('#4a505a'), glow: hex('#ff9a3c'), glowHi: hex('#ffd08a'),
  visor: hex('#04070e'), visor2: hex('#0a1222'),
  ocean: hex('#1c4b93'), ocean2: hex('#2c70c4'), land: hex('#3f7a3a'), land2: hex('#7a6a3c'),
  cloud: hex('#e9eef5'), cloud2: hex('#aebbd0'), night: hex('#071226'), atmo: hex('#7cc4ff'),
  moon: hex('#b9bcc2'), moon2: hex('#8a8e96'), moon3: hex('#5d6168'),
};

export function drawMenuArt(canvas: HTMLCanvasElement) {
  canvas.width = ART_W;
  canvas.height = ART_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(ART_W, ART_H);
  const put = (x: number, y: number, c: RGB) => { const i = (y * ART_W + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; };

  // Casco: un círculo grande; visor: elipse dentro, un poco hacia arriba.
  const hx = 160, hy = 104, hr = 112;
  const vx = 160, vy = 92, vrx = 84, vry = 74;
  // Tierra reflejada (abajo a la izquierda del visor) y Luna (arriba a la derecha).
  const ex = 70, ey = 205, er = 150;
  const mx = 226, my = 74, mr = 9;

  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) {
    const dh = Math.hypot(x - hx, (y - hy) * 1.02) / hr;
    const dv = Math.hypot((x - vx) / vrx, (y - vy) / vry);
    // ---------- fondo: espacio con estrellas ----------
    let c: RGB = dither(x, y, y / ART_H * 0.8) ? C.space2 : C.space;
    const st = hash(x, y, 3);
    if (st > 0.9965) c = C.star; else if (st > 0.992) c = C.star2;
    // Hombros del traje, abajo a los lados
    const sh = Math.min(Math.hypot((x - 18) / 92, (y - 205) / 70), Math.hypot((x - 302) / 92, (y - 205) / 70));
    if (sh < 1) c = sh > 0.86 ? C.shellDeep : dither(x, y, (y - 140) / 60) ? C.shellDark : C.shellMid;
    // ---------- casco ----------
    if (dh < 1) {
      // Luz desde arriba a la izquierda
      const light = 1 - ((x - hx) * 0.6 + (y - hy) * 0.8) / hr * 0.5 - dh * 0.35;
      c = light > 0.95 ? C.shell : light > 0.72 ? (dither(x, y, (light - 0.72) / 0.23) ? C.shell : C.shellMid) : light > 0.5 ? (dither(x, y, (light - 0.5) / 0.22) ? C.shellMid : C.shellDark) : C.shellDark;
      if (dh > 0.97) c = C.shellDeep;
      // Orejeras con luz naranja a los lados
      for (const sx of [hx - hr + 6, hx + hr - 14]) {
        if (x >= sx && x < sx + 8 && y >= 84 && y < 128) c = x === sx || x === sx + 7 ? C.rim : C.rimHi;
        if (x >= sx + 2 && x < sx + 6 && y >= 118 && y < 122) c = C.glow;
      }
    }
    // ---------- aro del visor ----------
    if (dv < 1.1 && dv >= 1) {
      c = dv < 1.04 ? C.rim : C.rimHi;
      // Luces naranjas en el aro (como en la referencia)
      const ang = Math.atan2((y - vy) / vry, (x - vx) / vrx);
      for (const a of [-2.55, -2.2, -0.95, -0.6, 0.75, 2.4]) {
        if (Math.abs(ang - a) < 0.07 && dv > 1.02 && dv < 1.09) c = Math.abs(ang - a) < 0.03 ? C.glowHi : C.glow;
      }
    }
    // ---------- visor: cristal oscuro con la Tierra y la Luna ----------
    if (dv < 1) {
      c = dither(x, y, (1 - dv) * 0.7) ? C.visor2 : C.visor;
      if (st > 0.994) c = C.star2;
      const de = Math.hypot(x - ex, y - ey) / er;
      if (de < 1) {
        const lx = (x - ex) / er, ly = (y - ey) / er;
        const land = fbm(lx * 5 + 3, ly * 5 + 1, 11);
        const cloud = fbm(lx * 7 + 9, ly * 9 + 4, 29);
        c = dither(x, y, 0.5 + lx * 0.6) ? C.ocean2 : C.ocean;
        if (land > 0.56) c = land > 0.66 ? C.land2 : C.land;
        if (cloud > 0.58) c = cloud > 0.66 ? C.cloud : (dither(x, y, (cloud - 0.58) / 0.08) ? C.cloud : C.cloud2);
        // Lado de noche (abajo a la derecha) y borde de la atmósfera
        const shade = lx * 0.7 + ly * 0.4;
        if (shade > 0.35) c = dither(x, y, (shade - 0.35) / 0.25) ? C.night : c;
        if (de > 0.985) c = C.atmo;
      } else if (de < 1.025) c = dither(x, y, 0.5) ? C.atmo : c;
      const dm = Math.hypot(x - mx, y - my) / mr;
      if (dm < 1) {
        c = (x - mx) + (y - my) > 4 ? C.moon2 : C.moon;
        if (hash(Math.floor(x / 2), Math.floor(y / 2), 41) > 0.8) c = C.moon3;
      }
      // Reflejo del cristal: una franja diagonal clara arriba a la izquierda
      const band = (x - vx) + (y - vy) * 1.6;
      if (dv > 0.55 && band > -120 && band < -108 && y < vy) c = dither(x, y, 0.35) ? C.visor2.map((v) => v + 30) as RGB : c;
    }
    put(x, y, c);
  }
  ctx.putImageData(img, 0, 0);
}
