// Opciones: volumen, reducir parpadeos, texto grande e idioma.
import { t } from '../i18n/i18n';
import { setVolume } from '../audio/audio';
import { saveSettings, type Settings } from '../state/save';
import { h } from './dom';

export function applySettings(s: Settings) {
  document.documentElement.classList.toggle('reduce-flash', s.reduceFlash);
  document.documentElement.classList.toggle('big-text', s.bigText);
  setVolume(s.volume);
}

export function openOptions(host: HTMLElement, s: Settings, onClose: () => void) {
  const backdrop = h('div', { class: 'backdrop', style: 'z-index:59' });
  const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(s.volume), 'aria-label': t('options.volume') }) as HTMLInputElement;
  const flash = h('input', { type: 'checkbox' }) as HTMLInputElement;
  flash.checked = s.reduceFlash;
  const big = h('input', { type: 'checkbox' }) as HTMLInputElement;
  big.checked = s.bigText;
  const change = () => {
    s.volume = +vol.value; s.reduceFlash = flash.checked; s.bigText = big.checked;
    applySettings(s); saveSettings(s);
  };
  [vol, flash, big].forEach((i) => i.addEventListener('input', change));
  const close = () => { el.remove(); backdrop.remove(); onClose(); };
  const el = h('div', { class: 'options panel', role: 'dialog', 'aria-label': t('options.title') },
    h('h2', {}, t('options.title')),
    h('label', {}, `🔊 ${t('options.volume')}`, vol),
    h('label', {}, flash, t('options.reduceFlash')),
    h('label', {}, big, t('options.bigText')),
    h('button', { class: 'btn primary', onclick: close }, t('options.close')));
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  host.append(backdrop, el);
  (el.querySelector('input') as HTMLElement).focus();
}
