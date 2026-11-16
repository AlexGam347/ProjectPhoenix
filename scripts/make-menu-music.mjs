// Música del menú, compuesta por código: ambiente espacial retro, tranquila y algo misteriosa.
//   node scripts/make-menu-music.mjs   → public/assets/audio/menu.ogg (Opus) y menu.mp3
// 60 BPM, re menor: pad Dm9 · Bbmaj9 · Gm9 · Asus4→A, bajo redondo, arpegio suave tipo caja de música,
// campanitas lejanas y, en la segunda vuelta, una melodía suave. 64 s que encadenan sin corte:
// las colas (pad, eco, reverb) del final se suman al principio. Todo con semilla: sale igual cada vez.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SR = 44100;
const BEAT = 1; // 60 BPM
const BAR = 4 * BEAT;
const CHORD = 2 * BAR; // 8 s por acorde
const LEN = 64; // 2 vueltas de 4 acordes
const TAIL = 8; // colas que se envuelven al principio
const N = (LEN + TAIL) * SR;
const L = new Float32Array(N), R = new Float32Array(N);
const busRev = new Float32Array(N), busDly = new Float32Array(N); // envíos a reverb y eco (mono)

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 20391;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };

// Acordes (MIDI): bajo y voces del pad
const CHORDS = [
  { bass: 38, pad: [50, 53, 57, 60, 64] }, // Dm9
  { bass: 34, pad: [46, 50, 53, 57, 60] }, // Bbmaj9
  { bass: 31, pad: [43, 46, 50, 53, 57] }, // Gm9
  { bass: 33, pad: [45, 50, 52, 57, 64], pad2: [45, 49, 52, 57, 64] }, // Asus4 → A
];

/** Envolvente con ataque y caída lineales. */
const env = (t, dur, a, r) => (t < 0 || t > dur + r ? 0 : t < a ? t / a : t < dur ? 1 : 1 - (t - dur) / r);

function add(i, l, r, rev = 0, dly = 0) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (rev) busRev[i] += (l + r) * 0.5 * rev;
  if (dly) busDly[i] += (l + r) * 0.5 * dly;
}

// Todos los timbres son redondos (senos con pocos armónicos): nada de sierras ni cuadradas, que chillan.
// ---------- pad: senos ligeramente desafinados (coro), entrada y salida lentas ----------
function pad(note, t0, dur, gain, pan) {
  const f = hz(note), n = Math.floor((dur + 2) * SR);
  const ph = rand() * 6.28;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const w = 2 * Math.PI * f * t + ph;
    const s = 0.5 * Math.sin(w * 1.002) + 0.5 * Math.sin(w * 0.998) + 0.18 * Math.sin(2 * w);
    const e = env(t, dur, 1.8, 2) * gain * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.11 * t + note));
    add(Math.floor((t0 + t) * SR), s * e * (1 - pan), s * e * (1 + pan), 0.45);
  }
}

// ---------- bajo: seno puro, notas largas ----------
function bass(note, t0, dur, gain) {
  const f = hz(note), n = Math.floor((dur + 0.6) * SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const w = 2 * Math.PI * f * t;
    const s = Math.sin(w) + 0.12 * Math.sin(2 * w);
    const e = env(t, dur, 0.08, 0.6) * gain * Math.exp(-t * 0.3);
    add(Math.floor((t0 + t) * SR), s * e, s * e, 0.08);
  }
}

// ---------- arpegio: pulsación suave tipo caja de música grave, con eco ----------
function pluck(note, t0, gain, pan) {
  const f = hz(note), n = Math.floor(1.4 * SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const w = 2 * Math.PI * f * t;
    const s = Math.sin(w) + 0.15 * Math.sin(2 * w) * Math.exp(-t * 6);
    const e = gain * Math.min(1, t / 0.012) * Math.exp(-t * 3.2);
    add(Math.floor((t0 + t) * SR), s * e * (1 - pan), s * e * (1 + pan), 0.3, 0.4);
  }
}

// ---------- campanitas lejanas: seno con un armónico suave ----------
function bell(note, t0, gain, pan) {
  const f = hz(note), n = Math.floor(3 * SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const w = 2 * Math.PI * f * t;
    const s = Math.sin(w) + 0.12 * Math.sin(2 * w) * Math.exp(-t * 4);
    const e = gain * Math.min(1, t / 0.01) * Math.exp(-t * 1.4);
    add(Math.floor((t0 + t) * SR), s * e * (1 - pan), s * e * (1 + pan), 0.7, 0.25);
  }
}

// ---------- melodía de la segunda vuelta: seno con vibrato suave ----------
function lead(note, t0, dur, gain) {
  const f = hz(note), n = Math.floor((dur + 1.2) * SR);
  let p = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    p += f * (1 + 0.003 * Math.sin(2 * Math.PI * 4.5 * t) * Math.min(1, t / 0.8)) / SR;
    const s = Math.sin(2 * Math.PI * p) + 0.08 * Math.sin(4 * Math.PI * p);
    const e = env(t, dur, 0.4, 1.4) * gain;
    add(Math.floor((t0 + t) * SR), s * e * 0.9, s * e, 0.55, 0.3);
  }
}

const ARP = [0, 2, 1, 3, 4, 3, 2, 1];
const MELODY = [[69, 65], [74, 72], [70, 69], [73, 76]]; // dos notas por acorde
for (let loop = 0; loop < 2; loop++) {
  CHORDS.forEach((c, ci) => {
    const t0 = loop * 4 * CHORD + ci * CHORD;
    // Pad: en el último acorde, sus4 la primera mitad y A mayor la segunda
    if (c.pad2) {
      c.pad.forEach((m, k) => pad(m, t0, CHORD / 2, 0.035, (k - 2) * 0.25));
      c.pad2.forEach((m, k) => pad(m, t0 + CHORD / 2, CHORD / 2, 0.035, (k - 2) * 0.25));
    } else c.pad.forEach((m, k) => pad(m, t0, CHORD, 0.035, (k - 2) * 0.25));
    // Bajo: cada 2 tiempos
    for (let b = 0; b < CHORD; b += 2 * BEAT) bass(c.bass, t0 + b, 1.7, 0.22);
    // Arpegio en semicorcheas (0,25 s), una octava sobre el pad
    for (let s = 0; s < CHORD / 0.5; s++) {
      const voices = c.pad2 && s * 0.5 >= CHORD / 2 ? c.pad2 : c.pad;
      const m = voices[ARP[s % 8]];
      pluck(m, t0 + s * 0.5, s % 2 === 0 ? 0.06 : 0.04, Math.sin(s * 0.7) * 0.35);
      if (rand() < 0.08) bell(voices[Math.floor(rand() * voices.length)] + 12, t0 + s * 0.5, 0.025, rand() * 1.2 - 0.6);
    }
    // Melodía solo en la segunda vuelta
    if (loop === 1) MELODY[ci].forEach((m, k) => lead(m - 12, t0 + k * BAR, BAR * 0.9, 0.06));
  });
}

// ---------- eco ping-pong (0,75 s, corchea con puntillo) ----------
{
  const d = Math.floor(0.75 * SR);
  const fb = 0.38;
  const bl = new Float32Array(N), br = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const inL = busDly[i];
    const dl = i >= d ? br[i - d] : 0, dr = i >= d ? bl[i - d] : 0;
    bl[i] = inL + dl * fb;
    br[i] = dr * fb;
    L[i] += dl * 0.5; R[i] += dr * 0.5;
  }
}

// ---------- reverb sencilla (Schroeder: 4 peines + 2 pasatodo) ----------
function schroeder(input, combs, gain) {
  const out = new Float32Array(N);
  for (const [ms, g] of combs) {
    const d = Math.floor(ms * SR / 1000), buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.35 + lp * 0.65; // amortigua bastante los agudos (sin brillo metálico)
      buf[idx] = input[i] + lp * g;
      out[i] += y;
      idx = (idx + 1) % d;
    }
  }
  for (const ms of [5.0, 1.7]) {
    const d = Math.floor(ms * SR / 1000), buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const x = out[i], y = buf[idx];
      const v = x + y * 0.5;
      buf[idx] = v;
      out[i] = y - v * 0.5;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < N; i++) out[i] *= gain;
  return out;
}
const revL = schroeder(busRev, [[29.7, 0.8], [37.1, 0.79], [41.1, 0.78], [43.7, 0.77]], 0.14);
const revR = schroeder(busRev, [[31.3, 0.8], [36.7, 0.79], [40.3, 0.78], [44.9, 0.77]], 0.14);
for (let i = 0; i < N; i++) { L[i] += revL[i]; R[i] += revR[i]; }

// ---------- bucle sin corte: la cola del final se suma al principio ----------
const OUTN = LEN * SR;
for (let i = 0; i < TAIL * SR; i++) { L[i] += L[OUTN + i]; R[i] += R[OUTN + i]; }

// ---------- master: paso bajo suave (quita lo chillón) y pico a −6 dBFS, sin saturar ----------
{
  const k = 1 - Math.exp(-2 * Math.PI * 3500 / SR);
  let l1 = 0, r1 = 0, l2 = 0, r2 = 0;
  for (let i = 0; i < OUTN; i++) {
    l1 += k * (L[i] - l1); l2 += k * (l1 - l2); L[i] = l2;
    r1 += k * (R[i] - r1); r2 += k * (r1 - r2); R[i] = r2;
  }
}
let peak = 0;
for (let i = 0; i < OUTN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 10 ** (-6 / 20) / peak;
const pcm = Buffer.alloc(OUTN * 4);
for (let i = 0; i < OUTN; i++) {
  pcm.writeInt16LE(Math.round(L[i] * g * 32767), i * 4);
  pcm.writeInt16LE(Math.round(R[i] * g * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
const tmp = join(tmpdir(), `menu-music-${process.pid}.wav`);
writeFileSync(tmp, Buffer.concat([header, pcm]));

mkdirSync('public/assets/audio', { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libopus', '-b:a', '96k', 'public/assets/audio/menu.ogg']);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '112k', 'public/assets/audio/menu.mp3']);
rmSync(tmp);
console.log(`menu.ogg y menu.mp3: ${LEN} s, pico −6 dBFS`);
