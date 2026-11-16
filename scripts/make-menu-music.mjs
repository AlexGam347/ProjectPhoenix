// Música del menú, compuesta por código: ambiente espacial retro, tranquila y algo misteriosa.
//   node scripts/make-menu-music.mjs   → public/assets/audio/menu.ogg (Opus) y menu.mp3
// 60 BPM, re menor: pad Dm9 · Bbmaj9 · Gm9 · Asus4→A, bajo redondo, arpegio cuadrado filtrado,
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

// ---------- pad: dos sierras desafinadas por voz, filtradas, entrada y salida lentas ----------
function pad(note, t0, dur, gain, pan) {
  const f = hz(note), n = Math.floor((dur + 2) * SR);
  let p1 = rand(), p2 = rand(), lp1 = 0, lp2 = 0;
  const k = 1 - Math.exp(-2 * Math.PI * 900 / SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    p1 = (p1 + f * 1.003 / SR) % 1; p2 = (p2 + f * 0.997 / SR) % 1;
    let s = (p1 * 2 - 1) + (p2 * 2 - 1);
    lp1 += k * (s - lp1); lp2 += k * (lp1 - lp2); s = lp2;
    const e = env(t, dur, 1.6, 2) * gain * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.11 * t + note));
    add(Math.floor((t0 + t) * SR), s * e * (1 - pan), s * e * (1 + pan), 0.55);
  }
}

// ---------- bajo: seno con un poco de armónico, notas largas ----------
function bass(note, t0, dur, gain) {
  const f = hz(note), n = Math.floor((dur + 0.6) * SR);
  let p = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    p += f / SR;
    const s = Math.tanh(1.6 * (Math.sin(2 * Math.PI * p) + 0.25 * Math.sin(4 * Math.PI * p)));
    const e = env(t, dur, 0.04, 0.5) * gain * Math.exp(-t * 0.25);
    add(Math.floor((t0 + t) * SR), s * e, s * e, 0.1);
  }
}

// ---------- arpegio: cuadrada filtrada, corta, con eco ----------
function pluck(note, t0, gain, pan) {
  const f = hz(note), n = Math.floor(0.6 * SR);
  let p = 0, lp = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    p = (p + f / SR) % 1;
    const sq = p < 0.5 ? 1 : -1;
    const cut = 400 + 2600 * Math.exp(-t * 14);
    lp += (1 - Math.exp(-2 * Math.PI * cut / SR)) * (sq - lp);
    const e = gain * Math.min(1, t / 0.004) * Math.exp(-t * 7);
    add(Math.floor((t0 + t) * SR), lp * e * (1 - pan), lp * e * (1 + pan), 0.25, 0.5);
  }
}

// ---------- campanitas lejanas: seno con parcial inarmónico ----------
function bell(note, t0, gain, pan) {
  const f = hz(note), n = Math.floor(3 * SR);
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const s = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3);
    const e = gain * Math.min(1, t / 0.003) * Math.exp(-t * 1.6);
    add(Math.floor((t0 + t) * SR), s * e * (1 - pan), s * e * (1 + pan), 0.8, 0.3);
  }
}

// ---------- melodía de la segunda vuelta: triangular con vibrato suave ----------
function lead(note, t0, dur, gain) {
  const f = hz(note), n = Math.floor((dur + 1.2) * SR);
  let p = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    p = (p + f * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t / 0.8)) / SR) % 1;
    const s = 1 - 4 * Math.abs(p - 0.5);
    const e = env(t, dur, 0.25, 1.2) * gain;
    add(Math.floor((t0 + t) * SR), s * e * 0.9, s * e, 0.6, 0.35);
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
    for (let s = 0; s < CHORD / 0.25; s++) {
      const voices = c.pad2 && s * 0.25 >= CHORD / 2 ? c.pad2 : c.pad;
      const m = voices[ARP[s % 8]] + 12;
      pluck(m, t0 + s * 0.25, s % 4 === 0 ? 0.05 : 0.032, Math.sin(s * 0.7) * 0.4);
      if (rand() < 0.07) bell(voices[Math.floor(rand() * voices.length)] + 24, t0 + s * 0.25, 0.03, rand() * 1.4 - 0.7);
    }
    // Melodía solo en la segunda vuelta
    if (loop === 1) MELODY[ci].forEach((m, k) => lead(m, t0 + k * BAR, BAR * 0.9, 0.05));
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
      lp = y * 0.7 + lp * 0.3; // amortigua agudos
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
const revL = schroeder(busRev, [[29.7, 0.84], [37.1, 0.83], [41.1, 0.82], [43.7, 0.81]], 0.22);
const revR = schroeder(busRev, [[31.3, 0.84], [36.7, 0.83], [40.3, 0.82], [44.9, 0.81]], 0.22);
for (let i = 0; i < N; i++) { L[i] += revL[i]; R[i] += revR[i]; }

// ---------- bucle sin corte: la cola del final se suma al principio ----------
const OUTN = LEN * SR;
for (let i = 0; i < TAIL * SR; i++) { L[i] += L[OUTN + i]; R[i] += R[OUTN + i]; }

// ---------- normalizar a −1,5 dBFS con saturación suave ----------
let peak = 0;
for (let i = 0; i < OUTN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const target = 10 ** (-1.5 / 20);
const g = target / peak;
const pcm = Buffer.alloc(OUTN * 4);
for (let i = 0; i < OUTN; i++) {
  const l = Math.tanh(L[i] * g * 1.1) / Math.tanh(1.1), r = Math.tanh(R[i] * g * 1.1) / Math.tanh(1.1);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), i * 4 + 2);
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
console.log(`menu.ogg y menu.mp3: ${LEN} s, pico ${(20 * Math.log10(peak * g)).toFixed(1)} dBFS antes de saturar`);
