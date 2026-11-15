// Controlador de la aplicación: escala el escenario 16:9, guarda y pinta la pantalla de cada fase.
import story from '../data/story.en.json';
import { afterVideo, newGame, type Game } from '../state/game';
import { clearSave, load, loadSettings, save, type Settings } from '../state/save';
import { loadFlare, type Flare } from '../nasa/donki';
import { t } from '../i18n/i18n';
import { unlock } from '../audio/audio';
import { h } from './dom';
import { applySettings, openOptions } from './options';
import type { Manifest } from './room/roomView';
import { CreditsScreen } from './screens/credits';
import { DayScreen } from './screens/day';
import { FinalScreen } from './screens/final';
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
    const tap = h('div', { class: 'tap-start', role: 'button', tabindex: '0' }, h('span', {}, t('tapToStart')));
    const go = () => { unlock(); tap.remove(); (this.stage.querySelector('.menu .btn') as HTMLElement | null)?.focus(); };
    tap.addEventListener('click', go);
    tap.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(); });
    this.stage.append(tap);
    tap.focus();
  }

  private show(s: Screen, name: string) {
    this.screen?.destroy();
    this.screen = s;
    this.stage.prepend(s.el);
    this.onScreen(name);
  }

  menu() {
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

  go(g: Game) {
    this.game = g;
    if (g.phase === 'final') clearSave(); else save(g);
    switch (g.phase) {
      case 'dream': {
        const d = (story.dreams as Record<string, { video: string }>)[String(g.n)];
        this.show(new StoryScreen({ video: d.video, label: t('dream', { n: g.n }), icon: 'moon' }, () => this.go(afterVideo(this.game))), `dream${g.n}`);
        break;
      }
      case 'night': this.show(new NightScreen(this), `night${g.n}`); break;
      case 'quiz': this.show(new QuizScreen(this), 'quiz'); break;
      case 'ending': {
        const e = story.endings[g.ending!];
        this.show(new StoryScreen({ video: e.video, label: t(`result.${g.ending}`), icon: g.ending === 'good' ? 'rocket' : g.ending === 'mid' ? 'warn' : 'orbit' }, () => this.go(afterVideo(this.game))), 'ending');
        break;
      }
      case 'result': this.show(new ResultScreen(this), 'result'); break;
      case 'day': this.show(new DayScreen(this), `day${g.n}`); break;
      case 'final': this.show(new FinalScreen(this), 'final'); break;
      default: this.menu();
    }
  }
}
