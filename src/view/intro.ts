// Escenas de despertar, encima de la pantalla que sigue a un sueño.
//  - playIntro (tras el Sueño 1): negro, «wake up» tres veces, el comandante abre los ojos sobre Control,
//    YANA en primer plano se presenta y explica la misión, y luego se va a su esquina.
//  - playWake (tras los Sueños 2 y 3): los párpados se abren y la imagen se aclara.
import { sfx } from '../audio/audio';
import { t } from '../i18n/i18n';
import { h } from './dom';
import { px } from './pixelIcons';
import { yanaSprite, type YanaState } from './yana';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const reduced = () => document.documentElement.classList.contains('reduce-flash');
const SILENT = /[\s.,!?;:'"()…*-]/;

/** Párpados y bruma: se abren con un parpadeo y la imagen de debajo se aclara. */
async function openEyes(root: HTMLElement, slow: boolean) {
  const top = h('div', { class: 'lid top' }), bottom = h('div', { class: 'lid bottom' }), haze = h('div', { class: 'eye-haze' });
  root.append(haze, top, bottom);
  root.classList.add('eyes');
  await wait(60);
  if (reduced()) { root.classList.add('open'); await wait(slow ? 1200 : 800); return; }
  root.classList.add(slow ? 'blink-slow' : 'blink');
  await wait(slow ? 3200 : 2200);
  root.classList.add('open');
}

export async function playWake(stage: HTMLElement): Promise<void> {
  const root = h('div', { class: 'cutscene wake', 'aria-hidden': 'true' });
  stage.append(root);
  await openEyes(root, false);
  await wait(500);
  root.remove();
}

export async function playIntro(stage: HTMLElement, lines: { text: string; state?: YanaState }[]): Promise<void> {
  let skipped = false;
  let resolveSkip: () => void = () => {};
  const skipP = new Promise<void>((r) => (resolveSkip = r));
  const skip = h('button', { class: 'btn intro-skip', onclick: () => { skipped = true; resolveSkip(); } }, t('story.skip').toLowerCase());
  const root = h('div', { class: 'cutscene intro', role: 'dialog', 'aria-label': 'Wake up' }, skip);
  stage.append(root);
  // La YANA de la noche no se ve hasta que la de la escena llega a su esquina.
  stage.classList.add('intro-on');
  const until = (p: Promise<unknown>) => Promise.race([p, skipP]);

  // 1. Negro y «wake up» tres veces, cada vez más cerca
  const voice = h('div', { class: 'wake-voice', 'aria-live': 'polite' });
  root.append(voice);
  const word = t('intro.wake').toLowerCase();
  for (let i = 0; i < 3 && !skipped; i++) {
    voice.className = `wake-voice v${i}`;
    voice.textContent = '';
    for (const ch of word) {
      if (skipped) break;
      voice.textContent += ch;
      if (!SILENT.test(ch)) sfx.blip();
      await until(wait(90));
    }
    await until(wait(900));
    voice.classList.add('out');
    await until(wait(i < 2 ? 700 : 300));
  }
  voice.remove();

  // 2. Abre los ojos: Control aparece borroso y oscuro, y se aclara
  if (!skipped) await until(openEyes(root, true));

  // 3. YANA en primer plano
  const sprite = h('div', { class: 'intro-yana', html: yanaSprite('normal', 'lg') });
  const txt = h('div', { class: 'txt' });
  const more = h('div', { class: 'more', html: px('down') });
  const box = h('div', { class: 'ubox intro-box', role: 'button', tabindex: '0', 'aria-label': 'Continue' }, txt, more);
  if (!skipped) {
    root.classList.add('talk');
    root.append(sprite, box);
    await wait(50);
    root.classList.add('yana-in');
    for (const line of lines) {
      if (skipped) break;
      sprite.innerHTML = yanaSprite(line.state ?? 'normal', 'lg');
      more.style.visibility = 'hidden';
      let typing = true, shown = 0;
      txt.textContent = '* ';
      const advanced = new Promise<void>((r) => {
        const go = () => {
          if (typing) { typing = false; shown = line.text.length; txt.textContent = `* ${line.text}`; more.style.visibility = 'visible'; return; }
          box.removeEventListener('click', go); window.removeEventListener('keydown', key); sfx.click(); r();
        };
        const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
        box.addEventListener('click', go);
        window.addEventListener('keydown', key);
      });
      box.focus({ preventScroll: true });
      while (typing && shown < line.text.length && !skipped) {
        const ch = line.text[shown++];
        txt.textContent = `* ${line.text.slice(0, shown)}`;
        if (ch && !SILENT.test(ch)) sfx.blip();
        await wait(32);
      }
      typing = false;
      txt.textContent = `* ${line.text}`;
      more.style.visibility = 'visible';
      await until(advanced);
    }
  }

  // 4. YANA se va a su sitio (abajo a la derecha) y la noche empieza
  root.classList.add('leave');
  skip.remove();
  await wait(skipped ? 400 : 1100);
  stage.classList.remove('intro-on');
  root.remove();
}
