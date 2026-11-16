// Menú principal: Marte en pixel art (scripts/pixelate-menu.mjs); título y botones de terminal a la derecha.
import { t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { h } from '../dom';
import { yanaSprite } from '../yana';
import type { Screen } from '../app';

export interface MenuActions { newGame(): void; continueGame: (() => void) | null; options(): void; credits(): void }

export class MenuScreen implements Screen {
  el: HTMLElement;
  constructor(a: MenuActions) {
    const b = (label: string, fn: () => void, cls = '') => h('button', { class: `btn ${cls}`, onclick: () => { sfx.click(); fn(); } }, label);
    const buttons = h('div', { class: 'buttons' },
      a.continueGame ? b(t('menu.continue').toLowerCase(), a.continueGame) : null,
      b(t('menu.new').toLowerCase(), a.newGame, a.continueGame ? '' : 'primary'),
      b(t('menu.options').toLowerCase(), a.options));
    const art = h('img', { class: 'menu-art', src: `${import.meta.env.BASE_URL}assets/menu/mars-pixel.png`, alt: '', draggable: 'false' });
    const credits = h('button', { class: 'menu-credits', 'aria-label': t('menu.credits'), title: t('menu.credits').toLowerCase(), onclick: () => { sfx.click(); a.credits(); } }, '!');
    this.el = h('div', { class: 'screen menu' }, art, h('div', { class: 'crt' }),
      h('div', { class: 'menu-side' }, h('h1', { class: 'title', 'aria-label': t('title'), html: t('title').split(' ').join('<br>') }), h('div', { class: 'term menu-box' }, buttons)),
      credits,
      h('div', { class: 'menu-yana', html: yanaSprite('normal', 'lg') }));
    setTimeout(() => (buttons.querySelector('.btn') as HTMLElement | null)?.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
