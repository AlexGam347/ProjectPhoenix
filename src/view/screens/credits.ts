// Créditos y fuentes, con el aviso de la NASA tal cual.
import credits from '../../data/credits.json';
import { t } from '../../i18n/i18n';
import { h } from '../dom';
import type { Screen } from '../app';

export class CreditsScreen implements Screen {
  el: HTMLElement;
  constructor(onBack: () => void, flare: { classType: string; peakTime: string; source?: string }) {
    const back = h('button', { class: 'btn primary', style: 'justify-self:start', onclick: onBack }, `◀ ${t('credits.back')}`);
    this.el = h('div', { class: 'screen' }, h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
      h('div', { class: 'credits term', role: 'dialog', 'aria-label': t('credits.title') },
        h('h2', {}, t('credits.title')),
        h('p', {}, credits.team),
        h('ul', {}, ...credits.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.name), h('br'), h('span', { class: 'muted' }, s.use)))),
        h('p', {}, `☀ ${flare.classType}  ${flare.peakTime.slice(0, 10)}  NASA DONKI${flare.source === 'fallback' ? ' (backup copy)' : ''}`),
        h('p', {}, credits.own),
        h('p', {}, credits.ai),
        h('p', { class: 'disclaimer' }, credits.disclaimer),
        back));
    setTimeout(() => back.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
