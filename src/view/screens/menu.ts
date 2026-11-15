// Menú principal.
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
      b(t('menu.new').toLowerCase(), a.newGame),
      b(t('menu.options').toLowerCase(), a.options),
      b(t('menu.credits').toLowerCase(), a.credits));
    this.el = h('div', { class: 'screen menu' }, h('div', { class: 'mars-bg' }),
      h('div', { class: 'logo', html: yanaSprite('normal', 'lg') }),
      h('h1', { class: 'title' }, t('title')),
      h('div', { class: 'term menu-box' }, buttons));
    setTimeout(() => (buttons.querySelector('.btn') as HTMLElement | null)?.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
