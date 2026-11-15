// Día: catálogo de mejoras en el kiosco de Control. Mínimo 3 mejoras con 10 puntos de esfuerzo.
import { CONFIG, UPGRADES, UPG_BY_ID } from '../../data';
import { canBuy } from '../../rules/economy';
import { RES, type Res, type RoomId, type Upgrade } from '../../rules/types';
import { MIN_PER_DAY, buy, canEndDay, endDay, learn, undo } from '../../state/game';
import { fill, t } from '../../i18n/i18n';
import { sfx } from '../../audio/audio';
import { h } from '../dom';
import { Explorer } from '../explorer';
import { resIcon } from '../icons';
import { effectChips } from '../minigames';
import { ROOMS, type RoomVisual, type ZoneDef } from '../room/roomView';
import { YANA, scripted } from '../yana';
import type { AppApi, Screen } from '../app';

const GROUPS: RoomId[] = ['agua', 'oxi', 'com', 'ene', 'control'];

export function effectText(u: Upgrade): string {
  if (u.cap) { const [r, v] = Object.entries(u.cap)[0]; return `Tope +${v} de ${t(`res.${r}.low`)}`; }
  if (u.nuc) return `+${u.nuc} energía cada noche, también con tormenta`;
  if (u.prod) return Object.entries(u.prod).map(([r, v]) => `+${v} ${t(`res.${r}.low`)}`).join(' y ') + ' cada noche';
  return ({
    robot: 'Paneles al 100 % en la tormenta de arena y +2 energía las demás noches',
    blindaje: 'En la tormenta solar caen 2 salas en vez de 4',
    prefiltros: 'En la tormenta de arena se obstruye 1 filtro en vez de 3',
  } as Record<string, string>)[u.flag!] ?? '';
}

const resList = (p: Partial<Record<Res, number>> = {}) =>
  RES.filter((r) => p[r]).map((r) => `${p[r]} de ${t(`res.${r}.low`)}`).join(' y ');

export class DayScreen implements Screen {
  el: HTMLElement;
  private ex: Explorer;
  private catalog: HTMLElement | null = null;
  private confirmEl: HTMLElement | null = null;
  private newUpgrade: string | null = null;

  constructor(private app: AppApi) {
    this.ex = new Explorer({
      manifest: app.manifest,
      onZone: (z, room) => this.onZone(z, room),
      visual: (room) => this.visual(room),
      navExtras: () => [
        h('button', { class: 'btn primary small', onclick: () => this.openCatalog() }, `🛠 ${t('nav.catalog')}`),
        h('button', { class: 'btn small', disabled: !canEndDay(this.app.game), onclick: () => this.endDay() }, `🌙 ${t('day.end')}`),
      ],
    });
    this.el = this.ex.el;
    const g = app.game;
    const lines = [
      ...scripted('dayStart', { night: g.n }, g.yanaSeen),
      ...(g.effortBonus ? scripted('dayStart', { bonus: true }, []) : []),
    ];
    this.app.patch({ ...g, yanaSeen: [...g.yanaSeen, ...lines.map((l) => l.id!).filter(Boolean)] });
    this.ex.yana.say(lines.map((l) => ({ ...l, highlight: l.highlight ?? 'kiosk' })));
    this.updateHud();
    this.openCatalog();
  }

  private updateHud() {
    const g = this.app.game;
    this.ex.hud.update({ values: g.base.R, caps: g.base.C, goal: CONFIG.goals[String(g.n + 1)], label: t('hud.day', { n: g.n }), clock: null, signal: true });
  }

  private visual(_room: RoomId): RoomVisual {
    return { mode: 'day', storm: null, owned: this.app.game.base.owned, newUpgrade: this.newUpgrade, doors: { agua: 'ok', oxi: 'ok', com: 'ok', ene: 'ok' } };
  }

  private onZone(z: ZoneDef, _room: RoomId) {
    sfx.click();
    if (z.nav) this.ex.go(z.nav);
    else if (z.special === 'kiosk') this.openCatalog();
  }

  private refreshAll() {
    this.updateHud();
    this.ex.refresh();
    if (this.catalog) this.renderCatalog();
  }

  openCatalog() {
    if (!this.catalog) {
      this.catalog = h('div', { class: 'catalog panel', role: 'dialog', 'aria-label': 'Catálogo de mejoras' });
      this.el.append(this.catalog);
    }
    this.renderCatalog();
  }

  private closeCatalog() { this.catalog?.remove(); this.catalog = null; }

  private renderCatalog() {
    const g = this.app.game;
    const total = CONFIG.effortPerDay + g.effortBonus;
    const pips = Array.from({ length: total }, (_, i) => h('i', { class: i < g.effortLeft ? 'on' : '' }));
    const header = h('header', {},
      h('h2', {}, t('day.title', { n: g.n })),
      h('div', { class: 'effort', 'aria-label': `${t('day.effort')}: ${g.effortLeft} de ${total}` }, `${t('day.effort')} `, ...pips, ` ${g.effortLeft}/${total}`),
      h('div', { class: g.dayBought.length >= MIN_PER_DAY ? 'ok' : 'muted' }, t('day.bought', { k: g.dayBought.length, min: MIN_PER_DAY })),
      h('button', { class: 'btn small', disabled: !g.dayBought.length, onclick: () => { sfx.click(); this.app.patch(undo(this.app.game)); this.refreshAll(); } }, `↶ ${t('day.undo')}`),
      h('button', { class: 'btn small primary', disabled: !canEndDay(g), onclick: () => this.endDay() }, `🌙 ${t('day.end')}`),
      h('button', { class: 'btn small ghost', 'aria-label': t('action.close'), onclick: () => this.closeCatalog() }, '✕'),
    );
    const groups = h('div', { class: 'cat-groups' }, ...GROUPS.map((room) => h('section', { class: 'cat-group' },
      h('h3', { html: `${ROOMS[room].resource ? resIcon(ROOMS[room].resource!) : '🛡'} ${room === 'control' ? 'Protecciones' : ROOMS[room].short}` }),
      ...UPGRADES.filter((u) => u.room === room).map((u) => this.card(u)))));
    this.catalog!.replaceChildren(header, groups);
  }

  private card(u: Upgrade) {
    const g = this.app.game;
    const owned = g.base.owned.includes(u.id);
    const chk = canBuy(g.base, u, g.effortLeft);
    let why = '';
    if (!owned && !chk.ok) {
      if (chk.reason === 'req') why = t('day.needReq', { name: UPG_BY_ID[u.req!].name });
      else if (chk.reason === 'effort') why = t('day.noEffort');
      else if (chk.reason === 'resource') why = t('day.noRes', { res: t(`res.${chk.res}.low`) });
    }
    return h('button', { class: `ucard${owned ? ' owned' : ''}`, disabled: !owned && !chk.ok, 'aria-disabled': owned ? 'true' : undefined, onclick: () => !owned && this.confirm(u) },
      h('div', {}, h('span', { class: 'nm' }, u.name), ' ', h('span', { class: `tp ${u.type}` }, t(`day.type.${u.type}`))),
      h('div', {}, effectText(u)),
      h('div', { class: 'eff' }, h('span', { class: 'chip' }, `⚙ ${u.effort}`), ...effectChips({}, u.cost, false)),
      u.up ? h('div', { class: 'muted' }, `${t('day.upkeep')}: −${resList(u.up)}`) : null,
      u.req && !owned ? h('div', { class: 'muted' }, t('day.req', { name: UPG_BY_ID[u.req].name })) : null,
      owned ? h('div', { class: 'ok' }, `✓ ${t('day.owned')}`) : why ? h('div', { class: 'why' }, why) : null,
    );
  }

  private confirm(u: Upgrade) {
    sfx.click();
    this.confirmEl?.remove();
    this.el.querySelectorAll('.toast').forEach((e) => e.remove());
    const warn = u.up ? fill(YANA.buy.upkeep, { list: resList(u.up) }) : YANA.buy.free;
    const cost = fill(YANA.buy.cost, { list: resList(u.cost) });
    const el = h('div', { class: 'confirm panel', role: 'dialog', 'aria-label': u.name },
      h('h2', {}, u.name),
      h('div', {}, effectText(u)),
      h('div', { class: 'row' }, h('span', { class: 'chip' }, `⚙ ${u.effort} de esfuerzo`), ...effectChips({}, u.cost, false)),
      h('div', { class: 'row' }, h('b', {}, 'YANA: '), `${cost} ${warn}`),
      u.fact ? h('div', { class: 'fact' }, `💡 ${u.fact}`) : null,
      h('footer', {},
        h('button', { class: 'btn', onclick: () => { el.remove(); this.confirmEl = null; } }, t('day.cancel')),
        h('button', { class: 'btn primary', onclick: () => this.buy(u) }, t('day.buy'))));
    this.confirmEl = el;
    this.el.append(el);
    (el.querySelector('.btn.primary') as HTMLElement).focus();
  }

  private buy(u: Upgrade) {
    let g = buy(this.app.game, u.id);
    if (g === this.app.game) return;
    sfx.buy();
    g = learn(g, u.fact);
    this.app.patch(g);
    this.confirmEl?.remove();
    this.confirmEl = null;
    this.newUpgrade = u.id;
    this.refreshAll();
    const see = u.room;
    this.ex.yana.say({ text: `${u.name}: instalada. ${u.fact}`, state: 'normal' }, { interrupt: true });
    // Botón para ver la mejora en su sala.
    const toast = h('div', { class: 'toast panel', role: 'status' },
      h('div', { class: 'row' }, `✓ ${u.name}`),
      h('footer', {},
        h('button', { class: 'btn', onclick: () => toast.remove() }, t('action.close')),
        h('button', { class: 'btn primary', onclick: () => { toast.remove(); this.closeCatalog(); if (this.ex.room === see) this.ex.refresh(); else void this.ex.go(see); } }, `👁 ${t('day.see')}`)));
    this.el.querySelectorAll('.toast').forEach((e) => e.remove());
    this.el.append(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  private endDay() {
    if (!canEndDay(this.app.game)) return;
    sfx.click();
    this.app.go(endDay(this.app.game));
  }

  destroy() { this.ex.destroy(); }
}
