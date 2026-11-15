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
      h('div', { class: 'credits panel', role: 'dialog', 'aria-label': t('credits.title') },
        h('h2', {}, t('credits.title')),
        h('p', { style: 'margin:0' }, credits.team),
        h('h3', {}, 'Datos y recursos de NASA Space Apps'),
        h('ul', {}, ...credits.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.name), ` — ${s.use}`))),
        h('p', { style: 'margin:0' }, `Llamarada mostrada en la Noche 4: clase ${flare.classType}, ${flare.peakTime.slice(0, 10)} (NASA DONKI${flare.source === 'fallback' ? ', copia de respaldo' : ''}).`),
        h('h3', {}, 'Diseño propio'),
        h('p', { style: 'margin:0' }, credits.own),
        h('p', { style: 'margin:0' }, credits.ai),
        h('p', { class: 'disclaimer', lang: 'en' }, credits.disclaimer),
        back));
    setTimeout(() => back.focus(), 50);
  }
  destroy() { this.el.remove(); }
}
