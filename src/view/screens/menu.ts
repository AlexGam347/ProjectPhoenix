// Menú principal: Nueva partida, Continuar, Opciones y Créditos.
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
      h('h1', { class: 'title', style: 'position:relative' }, t('title'), h('small', {}, t('subtitle'))),
      h('p', { class: 'muted', style: 'position:relative;margin:0;max-width:calc(1100 * var(--u))' },
        'La Tierra se ha vuelto inhabitable. Eres el comandante de la Superbase Central y tienes cuatro noches para dejarla lista antes de que lleguen los colonos.'),
      h('div', { style: 'position:relative' }, buttons));
    setTimeout(() => (buttons.querySelector('.btn') as HTMLElement | null)?.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
