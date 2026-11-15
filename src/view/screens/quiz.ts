// Pregunta de YANA antes de dormir: 3 botones grandes con icono. Si se acierta, +1 de trabajo mañana.
import questions from '../../data/questions.en.json';
import { answerQuiz } from '../../state/game';
import { t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { h } from '../dom';
import { SB } from '../room/placeholder/engine.js';
import type { AppApi, Screen } from '../app';

interface Q { q: string; options: string[]; icons: string[]; answer: number; why?: string }

export class QuizScreen implements Screen {
  el: HTMLElement;
  constructor(private app: AppApi) {
    const q = (questions.sleep as Record<string, Q>)[String(app.game.n)];
    const feedback = h('p', { class: 'quiz-why' });
    const sleepBtn = h('button', { class: 'btn primary', style: 'justify-self:center;visibility:hidden' }, `🌙 ${t('quiz.sleep')}`);
    let ok = false;
    const opts = q.options.map((label, i) => h('button', {
      class: 'opt', onclick: () => {
        ok = i === q.answer;
        opts.forEach((b, j) => { (b as HTMLButtonElement).disabled = true; if (j === q.answer) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
        (ok ? sfx.ok : sfx.bad)();
        feedback.textContent = `${ok ? '✓ +1 ⚙' : '✗'}  ${q.why ?? ''}`;
        sleepBtn.style.visibility = 'visible';
        sleepBtn.focus();
      },
    }, h('span', { class: 'ico' }, q.icons[i]), h('span', {}, label)));
    sleepBtn.addEventListener('click', () => { sfx.click(); this.app.go(answerQuiz(this.app.game, ok)); });
    this.el = h('div', { class: 'screen' }, h('div', { class: 'mars-bg' }), h('div', { class: 'backdrop' }),
      h('div', { class: 'quiz term', role: 'dialog', 'aria-label': q.q },
        h('div', { class: 'quiz-head' },
          h('div', { class: 'yana-face', html: `<svg viewBox="-70 -125 190 200">${SB.ari('hint')}</svg>` }),
          h('h2', {}, q.q)),
        h('div', { class: 'opts' }, ...opts), feedback, sleepBtn));
  }
  destroy() { this.el.remove(); }
}
