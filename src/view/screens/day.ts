// Día estilo FNAF 6: dos paneles, el plano (BLUEPRINT) y el catálogo (CATALOG).
// El trabajo (esfuerzo) se gasta al mandar construir; mínimo 3 mejoras al día.
import { CONFIG, UPGRADES, UPG_BY_ID } from '../../data';
import { canBuy } from '../../rules/economy';
import { RES, type Res, type RoomId, type Upgrade } from '../../rules/types';
import { MIN_PER_DAY, buy, canEndDay, endDay, learn, undo } from '../../state/game';
import { t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { fmt, h } from '../dom';
import { RES_COLOR, resIcon } from '../icons';
import { blueprint, type SlotState } from '../day/blueprint';
import { TYPE_ICON, level, upgradeArt } from '../day/upgradeArt';
import { Yana, scripted } from '../yana';
import type { AppApi, Screen } from '../app';

const CATS: RoomId[] = ['agua', 'oxi', 'com', 'ene', 'control'];
const CAT_ICON = (c: RoomId) => (c === 'control' ? '🛡' : resIcon(c as Res));

export class DayScreen implements Screen {
  el: HTMLElement;
  private bpLayer: HTMLElement;
  private catLayer: HTMLElement;
  private yana = new Yana();
  private cat: RoomId = 'agua';
  private sel: string = UPGRADES[0].id;
  private fresh: string | null = null;

  constructor(private app: AppApi) {
    this.bpLayer = h('div', { class: 'day-panel bp' });
    this.catLayer = h('div', { class: 'day-panel cat hidden' });
    this.el = h('div', { class: 'screen day' }, this.bpLayer, this.catLayer, this.yana.el);
    const g = app.game;
    const lines = [...scripted('dayStart', { night: g.n }, g.yanaSeen), ...(g.effortBonus ? scripted('dayStart', { bonus: true }, []) : [])];
    this.app.patch({ ...g, yanaSeen: [...g.yanaSeen, ...lines.map((l) => l.id!).filter(Boolean)] });
    this.yana.say(lines);
    this.render();
  }

  private get g() { return this.app.game; }

  private slotState = (u: Upgrade): SlotState =>
    this.g.base.owned.includes(u.id) ? 'owned' : canBuy(this.g.base, u, this.g.effortLeft).ok ? 'open' : 'locked';

  private render() {
    this.renderBlueprint();
    this.renderCatalog();
  }

  private show(v: 'blueprint' | 'catalog') {
    sfx.door();
    this.bpLayer.classList.toggle('hidden', v !== 'blueprint');
    this.catLayer.classList.toggle('hidden', v !== 'catalog');
    if (v === 'blueprint') { this.renderBlueprint(); (this.bpLayer.querySelector('.tab') as HTMLElement)?.focus(); }
    else { this.renderCatalog(); (this.catLayer.querySelector('.buy') as HTMLElement)?.focus(); }
  }

  // ---------- caja de estado (como la de FNAF 6) ----------
  private statBox() {
    const g = this.g, goal = CONFIG.goals[String(g.n + 1)], max = CONFIG.barMax;
    return h('div', { class: 'term statbox', role: 'group', 'aria-label': 'Base status' },
      ...RES.map((r) => h('div', { class: 'sb-row', 'aria-label': `${t(`res.${r}`)} ${fmt(g.base.R[r])} of ${g.base.C[r]}, goal ${goal[r]}` },
        h('span', { html: resIcon(r) }),
        h('div', { class: 'sb-track' },
          h('i', { class: 'cap', style: `width:${(g.base.C[r] / max) * 100}%` }),
          h('i', { class: 'fill', style: `width:${(Math.min(g.base.R[r], g.base.C[r]) / max) * 100}%;background:${RES_COLOR[r]}` }),
          h('i', { class: 'goal', style: `left:${(goal[r] / max) * 100}%` })),
        h('b', {}, fmt(g.base.R[r])))),
      this.workPips());
  }

  private workPips(cost = 0) {
    const g = this.g, total = CONFIG.effortPerDay + g.effortBonus;
    return h('div', { class: 'work', 'aria-label': `${t('day.work')} ${g.effortLeft} of ${total}` },
      h('span', { class: 'lbl' }, t('day.work')),
      ...Array.from({ length: total }, (_, i) => h('i', {
        class: i < g.effortLeft - cost ? 'on' : i < g.effortLeft ? 'cost' : '',
      })));
  }

  private renderBlueprint() {
    const g = this.g;
    const map = blueprint({
      manifest: this.app.manifest, state: this.slotState, fresh: this.fresh,
      onSlot: (u) => { sfx.click(); this.cat = u.room; this.sel = u.id; this.show('catalog'); },
      onRoom: (r) => { sfx.click(); this.cat = r; this.sel = UPGRADES.find((u) => u.room === r)!.id; this.show('catalog'); },
    });
    const finished = h('button', { class: 'btn primary finished', disabled: !canEndDay(g), onclick: () => this.finish() },
      `${t('day.finished')}`, h('span', { class: 'count' }, `${Math.min(g.dayBought.length, MIN_PER_DAY)}/${MIN_PER_DAY}`));
    this.bpLayer.replaceChildren(map,
      h('button', { class: 'tab left', onclick: () => this.show('catalog') }, t('day.catalog')),
      h('div', { class: 'daytag' }, t('hud.day', { n: g.n })),
      this.statBox(), finished);
    this.fresh = null;
  }

  // ---------- catálogo ----------
  private renderCatalog() {
    const g = this.g;
    const list = UPGRADES.filter((u) => u.room === this.cat);
    if (!list.some((u) => u.id === this.sel)) this.sel = list[0].id;
    const u = UPG_BY_ID[this.sel];
    const idx = list.indexOf(u);
    const owned = g.base.owned.includes(u.id);
    const chk = canBuy(g.base, u, g.effortLeft);

    const cats = h('div', { class: 'cats' }, ...CATS.map((c) => h('button', {
      class: `catbtn${c === this.cat ? ' on' : ''}`, 'aria-pressed': String(c === this.cat),
      onclick: () => { sfx.click(); this.cat = c; this.sel = UPGRADES.find((x) => x.room === c)!.id; this.renderCatalog(); },
      html: `<span class="ci">${CAT_ICON(c)}</span><span>${t(`cat.${c}`)}</span>`,
    })));

    // Fichas de nivel: la línea I, II, III de esta mejora.
    const line = list.filter((x) => x.id.slice(0, -1) === u.id.slice(0, -1) && /\d$/.test(x.id));
    const lv = h('div', { class: 'levels', 'aria-label': `level ${level(u)}` },
      ...line.map((x) => h('i', { class: `${g.base.owned.includes(x.id) ? 'own' : ''}${x.id === u.id ? ' cur' : ''}` }, ['I', 'II', 'III'][level(x) - 1])));

    const why = owned ? `✓ ${t('day.owned')}`
      : chk.ok ? ''
        : chk.reason === 'req' ? `🔒 ${UPG_BY_ID[u.req!].name}`
          : chk.reason === 'effort' ? `⚙ ${t('day.noWork')}`
            : `${resIcon(chk.res as Res)} ${t('day.noRes', { res: t(`res.${chk.res}`) })}`;

    const card = h('div', { class: 'ucard term' },
      h('button', { class: 'arrow', 'aria-label': 'Previous', disabled: idx <= 0, onclick: () => { this.sel = list[idx - 1].id; this.renderCatalog(); } }, '◀'),
      h('div', { class: 'ucard-body' },
        h('div', { class: 'ucard-art', html: upgradeArt(u, this.app.manifest, 'lg') }),
        h('div', { class: 'ucard-info' },
          h('div', { class: 'ucard-name' }, h('span', { class: 'type', 'aria-label': u.type }, TYPE_ICON[u.type]), u.name),
          line.length > 1 ? lv : null,
          this.effectBars(u),
          u.fact ? h('p', { class: 'fact' }, `💡 ${u.fact}`) : null)),
      h('button', { class: 'arrow', 'aria-label': 'Next', disabled: idx >= list.length - 1, onclick: () => { this.sel = list[idx + 1].id; this.renderCatalog(); } }, '▶'));

    const actions = h('div', { class: 'cat-actions' },
      this.workPips(owned || !chk.ok ? 0 : u.effort),
      why ? h('div', { class: `why${owned ? ' ok' : ''}`, html: why }) : null,
      h('button', { class: 'btn', disabled: !g.dayBought.length, onclick: () => { sfx.click(); this.app.patch(undo(this.g)); this.render(); } }, `↶ ${t('day.undo')}`),
      h('button', { class: 'btn primary buy', disabled: owned || !chk.ok, onclick: () => this.buy(u) }, `${t('day.buy')}  ⚙${u.effort}`));

    this.catLayer.replaceChildren(
      h('div', { class: 'cat-head' }, h('h2', {}, t('day.catalog')), h('span', { class: 'chip' }, `${g.dayBought.length}/${MIN_PER_DAY}`)),
      cats, card, actions,
      h('button', { class: 'tab right', onclick: () => this.show('blueprint') }, t('day.blueprint')));
  }

  /** Antes y después en las 4 barras: coste inmediato, tope, producción y gasto de cada noche. */
  private effectBars(u: Upgrade) {
    const b = this.g.base, max = CONFIG.barMax;
    return h('div', { class: 'fx-bars' }, ...RES.map((r) => {
      const cost = u.cost[r] ?? 0, cap = u.cap?.[r] ?? 0, prod = (u.prod?.[r] ?? 0) + (r === 'ene' ? u.nuc ?? 0 : 0), up = u.up?.[r] ?? 0;
      const after = b.R[r] - cost;
      const tags: HTMLElement[] = [];
      if (cost) tags.push(h('span', { class: 'chip minus', 'aria-label': `costs ${cost} now` }, `−${cost}`));
      if (cap) tags.push(h('span', { class: 'chip cap', 'aria-label': `storage plus ${cap}` }, `▣ +${cap}`));
      if (prod) tags.push(h('span', { class: 'chip plus', 'aria-label': `plus ${prod} per night` }, `+${prod}${t('day.perNight')}`));
      if (up) tags.push(h('span', { class: 'chip warn', 'aria-label': `uses ${up} every night` }, `⚠ −${up}${t('day.perNight')}`));
      return h('div', { class: `fx-row${tags.length ? '' : ' idle'}` },
        h('span', { html: resIcon(r) }),
        h('div', { class: 'fx-track' },
          h('i', { class: 'cap', style: `width:${(b.C[r] / max) * 100}%` }),
          cap ? h('i', { class: 'cap-new', style: `left:${(b.C[r] / max) * 100}%;width:${(cap / max) * 100}%` }) : null,
          h('i', { class: 'fill', style: `width:${(Math.max(0, after) / max) * 100}%;background:${RES_COLOR[r]}` }),
          cost ? h('i', { class: 'spent', style: `left:${(Math.max(0, after) / max) * 100}%;width:${(Math.min(cost, b.R[r]) / max) * 100}%` }) : null),
        h('div', { class: 'fx-tags' }, ...tags));
    }));
  }

  private buy(u: Upgrade) {
    let g = buy(this.g, u.id);
    if (g === this.g) return;
    sfx.buy();
    g = learn(g, u.fact);
    this.app.patch(g);
    this.fresh = u.id;
    this.yana.say({ text: `${u.name} ✓`, state: 'normal' }, { interrupt: true });
    this.renderCatalog();
    this.catLayer.querySelector('.ucard-art')?.classList.add('bought');
  }

  private finish() {
    if (!canEndDay(this.g)) return;
    sfx.click();
    this.app.go(endDay(this.g));
  }

  destroy() { this.yana.clear(); this.el.remove(); }
}
