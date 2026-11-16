// Créditos y fuentes. Los recursos oficiales del NASA Space Apps Challenge van en su propia sección,
// separados del resto de fuentes. El aviso de la NASA va tal cual.
import credits from '../../data/credits.json';
import { t } from '../../i18n/i18n';
import { h } from '../dom';
import type { Screen } from '../app';

interface Source { name: string; use: string; url: string; inGame?: boolean }

const list = (items: Source[]) => h('ul', {}, ...items.map((s) => h('li', {},
  h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.name),
  s.inGame ? h('span', { class: 'chip plus' }, 'used in game') : null,
  h('br'), h('span', { class: 'muted' }, s.use))));

export class CreditsScreen implements Screen {
  el: HTMLElement;
  constructor(onBack: () => void, flare: { classType: string; peakTime: string; source?: string }) {
    const back = h('button', { class: 'btn primary', style: 'justify-self:start', onclick: onBack }, t('credits.back').toLowerCase());
    this.el = h('div', { class: 'screen' }, h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
      h('div', { class: 'credits term', role: 'dialog', 'aria-label': t('credits.title') },
        h('h2', {}, t('credits.title')),
        h('p', {}, credits.team),
        h('h3', {}, 'NASA Space Apps Challenge resources'),
        list(credits.spaceApps as Source[]),
        h('p', {}, `Night 4 solar flare: ${flare.classType}, ${flare.peakTime.slice(0, 10)}, NASA DONKI${flare.source === 'fallback' ? ' (backup copy)' : ''}.`),
        h('h3', {}, 'Other sources'),
        list(credits.other as Source[]),
        h('h3', {}, 'Music'),
        h('p', {}, `Menu music: "${credits.music.title}" by ${credits.music.author}. `, h('span', { class: 'muted' }, credits.music.license)),
        h('p', {}, credits.own),
        h('p', {}, credits.ai),
        h('p', { class: 'disclaimer' }, credits.disclaimer),
        back));
    setTimeout(() => back.focus({ preventScroll: true }), 50);
  }
  destroy() { this.el.remove(); }
}
