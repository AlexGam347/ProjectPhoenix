// Menú principal.
import { t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { h } from '../dom';
import type { Screen } from '../app';

export interface MenuActions { newGame(): void; continueGame: (() => void) | null; options(): void; credits(): void }

export class MenuScreen implements Screen {
  el: HTMLElement;
  constructor(a: MenuActions) {
    const b = (label: string, fn: () => void, cls = '') => h('button', { class: `btn ${cls}`, onclick: () => { sfx.click(); fn(); } }, label);
    const buttons = h('div', { class: 'buttons' },
      a.continueGame ? b(`▶ ${t('menu.continue')}`, a.continueGame, 'primary') : null,
      b(`✦ ${t('menu.new')}`, a.newGame, a.continueGame ? '' : 'primary'),
      b(`⚙ ${t('menu.options')}`, a.options),
      b(`ⓘ ${t('menu.credits')}`, a.credits));
    this.el = h('div', { class: 'screen menu' }, h('div', { class: 'mars-bg' }),
      h('div', { class: 'logo', 'aria-hidden': 'true' }, '🔥'),
      h('h1', { class: 'title' }, t('title')),
      h('div', { class: 'term menu-box' }, buttons));
    setTimeout(() => (buttons.querySelector('.btn') as HTMLElement | null)?.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
