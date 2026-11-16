// Subtítulos de los sueños: convierte los .srt del equipo (art-src/subs) a WebVTT (public/assets/video).
//   node scripts/srt-to-vtt.mjs
// Cada subtítulo queda en una sola línea corta, y las rayas largas pasan a comas (regla de texto del equipo).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DASH = /[ \t]*[—–][ \t]*/g;
/** Posición por vídeo: el Sueño 2 ya trae cuadros de texto abajo, así que sus subtítulos van arriba. */
const SETTINGS = { 'dream2.en.srt': ' line:4% position:50% align:center' };

for (const f of readdirSync('art-src/subs').filter((f) => f.endsWith('.srt'))) {
  const srt = readFileSync(`art-src/subs/${f}`, 'utf8').replace(/^﻿/, '').replace(/\r/g, '');
  const cues = srt.trim().split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    const time = lines[i].replace(/,/g, '.') + (SETTINGS[f] ?? '');
    const text = lines.slice(i + 1).join(' ').replace(DASH, ', ').replace(/,\s*$/, ',').replace(/\s+/g, ' ').trim();
    return `${time}\n${text}`;
  });
  const out = `public/assets/video/${f.replace(/\.srt$/, '.vtt')}`;
  writeFileSync(out, `WEBVTT\n\n${cues.join('\n\n')}\n`);
  console.log(`${out}: ${cues.length} subtítulos`);
}
