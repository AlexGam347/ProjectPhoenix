// Controlador de la aplicación: escala el escenario 16:9, guarda y pinta la pantalla de cada fase.
import story from '../data/story.en.json';
import { afterVideo, newGame, type Game } from '../state/game';
import { clearSave, load, loadSettings, save, saveSettings, type Settings } from '../state/save';
import { loadFlare, type Flare } from '../nasa/donki';
import { fill, t } from '../i18n/i18n';
import { CONFIG } from '../data';
import { playIntro, playWake } from './intro';
import { YANA } from './yana';
import { music, unlock } from '../audio/audio';
import { h } from './dom';
import { px } from './pixelIcons';
import { applySettings, openOptions } from './options';
import type { Manifest } from './room/roomView';
import { CreditsScreen } from './screens/credits';
import { DayScreen } from './screens/day';
import { FinalScreen } from './screens/final';
import { EpilogueScreen } from './screens/epilogue';
import { MenuScreen } from './screens/menu';
import { NightScreen } from './screens/night';
import { QuizScreen } from './screens/quiz';
import { ResultScreen } from './screens/result';
import { StoryScreen } from './screens/story';

export interface Screen { el: HTMLElement; destroy(): void }

export interface AppApi {
  game: Game;
  settings: Settings;
  manifest: Manifest | null;
  flare: Flare;
  debug: { speed: number };
  modalOpen: boolean;
  /** Escena de despertar en curso: las pantallas esperan a que acabe para que YANA empiece a hablar. */
  cutscene: Promise<void> | null;
  go(g: Game): void;
  patch(g: Game): void;
  newGame(): void;
  credits(): void;
  menu(): void;
}

export class App implements AppApi {
  game: Game = newGame();
  settings = loadSettings();
  manifest: Manifest | null = null;
  flare: Flare = { classType: 'X9.0', peakTime: '2024-10-03T12:18Z', source: 'fallback' };
  debug = { speed: 1 };
  modalOpen = false;
  cutscene: Promise<void> | null = null;
  private screen: Screen | null = null;
  onScreen: (name: string) => void = () => {};

  constructor(public stage: HTMLElement) {
    applySettings(this.settings);
    const fit = () => stage.style.setProperty('--u', `${stage.clientWidth / 1920}px`);
    new ResizeObserver(fit).observe(stage);
    fit();
    document.body.append(h('div', { class: 'rotate' }, t('rotate')));
  }

  async boot() {
    const base = import.meta.env.BASE_URL;
    const [manifest, flare] = await Promise.all([
      fetch(`${base}assets/rooms/manifest.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      loadFlare(),
    ]);
    this.manifest = manifest;
    this.flare = flare;
    this.menu();
    // El audio solo puede arrancar tras la primera interacción.
    // Los navegadores solo dejan sonar audio y vídeo tras un gesto del jugador: se le pregunta al empezar.
    const choose = (muted: boolean) => {
      this.settings.muted = muted;
      saveSettings(this.settings);
      applySettings(this.settings);
      if (!muted) { unlock(); if (music.wanted) void music.play(music.wanted); }
      gate.remove();
      (this.stage.querySelector('.menu .btn') as HTMLElement | null)?.focus();
    };
    const on = h('button', { class: 'menu-item', onclick: () => choose(false), html: `${px('sound')} ${t('audio.on').toLowerCase()}` });
    const off = h('button', { class: 'menu-item', onclick: () => choose(true), html: `${px('mute')} ${t('audio.off').toLowerCase()}` });
    const gate = h('div', { class: 'audio-gate', role: 'dialog', 'aria-label': 'Sound' },
      h('div', { class: 'gate-icon', html: px('sound') }), h('div', { class: 'gate-opts' }, on, off));
    this.stage.append(gate);
    (this.settings.muted ? off : on).focus();
  }

  private show(s: Screen, name: string) {
    this.screen?.destroy();
    this.screen = s;
    this.stage.prepend(s.el);
    this.onScreen(name);
  }

  menu() {
    // Música del menú: sigue sonando en opciones y créditos; para al entrar en la partida (go).
    void music.play('menu');
    const saved = load();
    this.show(new MenuScreen({
      newGame: () => this.newGame(),
      continueGame: saved ? () => this.go(saved) : null,
      options: () => this.options(),
      credits: () => this.credits(),
    }), 'menu');
  }

  options() {
    this.modalOpen = true;
    openOptions(this.stage, this.settings, () => (this.modalOpen = false));
  }

  credits() { this.show(new CreditsScreen(() => this.menu(), this.flare), 'credits'); }

  newGame() { clearSave(); this.go(newGame()); }

  patch(g: Game) { this.game = g; }

  /** Al acabar un sueño: la pantalla siguiente y, encima, el comandante despertando (la presentación tras el Sueño 1). */
  private wakeUp() {
    const prev = this.game;
    let next = afterVideo(prev);
    const intro = prev.n === 1 && !prev.lastReport && !prev.yanaSeen.includes('intro');
    if (intro) next = { ...next, yanaSeen: [...next.yanaSeen, 'intro'] };
    this.modalOpen = true;
    const lines = YANA.intro.map((l) => ({ ...l, text: fill(l.text, { year: CONFIG.gameYear }) }));
    this.cutscene = new Promise<void>((resolve) => {
      queueMicrotask(() => {
        (intro ? playIntro(this.stage, lines) : playWake(this.stage)).then(() => {
          this.modalOpen = false;
          this.cutscene = null;
          resolve();
        });
      });
    });
    this.go(next);
  }

  go(g: Game) {
    music.stop();
    this.game = g;
    if (g.phase === 'final') clearSave(); else save(g);
    switch (g.phase) {
      case 'dream': {
        const d = (story.dreams as Record<string, { video: string; subs?: boolean }>)[String(g.n)];
        this.show(new StoryScreen({ video: d.video, subs: d.subs, ai: true, label: t('dream', { n: g.n }), icon: 'moon' }, () => this.wakeUp(), this.settings), `dream${g.n}`);
        break;
      }
      case 'night': this.show(new NightScreen(this), `night${g.n}`); break;
      case 'quiz': this.show(new QuizScreen(this), 'quiz'); break;
      case 'ending': {
        // Cinemática final (la misma en los tres finales, hecha con ayuda de IA), luego el epílogo y el cartel del final.
        const end = g.ending!;
        const miss = g.lastReport?.miss[0];
        const res = miss ? t(`res.${miss}.low`) : '';
        this.show(new StoryScreen({ video: story.finale.video, ai: true, label: 'Arrival on Mars', icon: 'rocket' }, () => {
          if (this.game !== g) return;
          this.show(new EpilogueScreen(end, res, () => { if (this.game === g) this.go(afterVideo(this.game)); }), 'epilogue');
        }, this.settings), 'ending');
        break;
      }
      case 'result': this.show(new ResultScreen(this), 'result'); break;
      case 'day': this.show(new DayScreen(this), `day${g.n}`); break;
      case 'final': this.show(new FinalScreen(this), 'final'); break;
      default: this.menu();
    }
  }
}
