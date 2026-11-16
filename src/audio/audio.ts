// Sonidos sintetizados con WebAudio: no hacen falta archivos para la demo.
// Si el equipo aporta audio (OGG/MP3), se puede cargar aquí con el mismo API.
// El audio solo arranca tras la primera interacción del usuario (unlock()).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.7;
let stormNode: { stop: () => void } | null = null;

export function unlock() {
  if (ctx) { void ctx.resume(); return; }
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.2, when = 0, slide?: number) {
  if (!ctx || !master || volume <= 0) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.2, filterFreq = 800, when = 0) {
  if (!ctx || !master || volume <= 0) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(filterFreq, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(60, filterFreq / 4), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  click: () => tone(660, 0.06, 'square', 0.06),
  /** Voz de YANA: siempre el mismo sonido corto y suave, uno por letra (como en Undertale). */
  blip: () => blip(),
  /** Movimiento del cursor de la tablet. */
  tick: () => tone(1200, 0.018, 'square', 0.02),
  door: () => { noise(0.45, 0.25, 1400); tone(110, 0.3, 'sawtooth', 0.04, 0.05, 70); },
  alarm: () => { tone(880, 0.18, 'square', 0.08); tone(660, 0.18, 'square', 0.08, 0.2); tone(880, 0.18, 'square', 0.08, 0.4); },
  hour: () => tone(440, 0.12, 'triangle', 0.08),
  ok: () => { tone(523, 0.12, 'triangle', 0.12); tone(659, 0.12, 'triangle', 0.12, 0.1); tone(784, 0.2, 'triangle', 0.12, 0.2); },
  bad: () => { tone(220, 0.25, 'sawtooth', 0.08); tone(165, 0.35, 'sawtooth', 0.08, 0.2); },
  work: () => { noise(0.8, 0.12, 500); tone(180, 0.8, 'sawtooth', 0.03, 0, 260); },
  buy: () => { tone(392, 0.1, 'triangle', 0.12); tone(587, 0.18, 'triangle', 0.12, 0.08); },
  solar: () => { noise(2.2, 0.5, 3000); tone(60, 2.0, 'sawtooth', 0.12, 0, 30); },
};

let lastBlip = 0;
function blip() {
  if (!ctx || !master || volume <= 0) return;
  const t0 = ctx.currentTime;
  if (t0 - lastBlip < 0.025) return; // nunca se solapan
  lastBlip = t0;
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520, t0);
  f.type = 'lowpass';
  f.frequency.value = 1800;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
  o.connect(f).connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + 0.035);
}

/** Ruido grave continuo durante las tormentas. */
export function storm(on: boolean) {
  if (!on) { stormNode?.stop(); stormNode = null; return; }
  if (!ctx || !master || stormNode) return;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = 0.25;
  src.connect(g).connect(master);
  src.start();
  stormNode = { stop: () => { try { src.stop(); } catch { /* ya parado */ } } };
}

/** Música en bucle (por ahora, la del menú: scripts/make-menu-music.mjs). Pasa por el volumen general. */
const tracks: Record<string, Promise<AudioBuffer | null>> = {};
let current: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wanted: string | null = null;

function loadTrack(name: string): Promise<AudioBuffer | null> {
  if (!ctx) return Promise.resolve(null);
  const ac = ctx;
  tracks[name] ??= (async () => {
    // Opus en OGG donde se pueda (Chrome, Firefox, Edge); MP3 si no (Safari antiguo).
    const ext = document.createElement('audio').canPlayType('audio/ogg; codecs="opus"') ? 'ogg' : 'mp3';
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}assets/audio/${name}.${ext}`);
      if (!res.ok) return null;
      return await ac.decodeAudioData(await res.arrayBuffer());
    } catch { return null; }
  })();
  return tracks[name];
}

export const music = {
  /** Empieza (con fundido de entrada) si el audio está desbloqueado; si no, empezará al llamar otra vez. */
  async play(name: string, level = 0.55) {
    wanted = name;
    if (!ctx || !master || current?.name === name) return;
    const buf = await loadTrack(name);
    if (!buf || !ctx || !master || wanted !== name || current?.name === name) return;
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 2);
    src.connect(gain).connect(master);
    src.start();
    current = { name, src, gain };
  },
  /** Para con fundido de salida. */
  stop(fade = 1) {
    wanted = null;
    if (!current || !ctx) return;
    const { src, gain } = current;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    try { src.stop(t + fade + 0.05); } catch { /* ya parada */ }
    current = null;
  },
  /** La que debería sonar ahora (para arrancarla al activar el sonido). */
  get wanted() { return wanted; },
};
