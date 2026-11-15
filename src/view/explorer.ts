// Explorador de la base: sala actual, navegación en estrella con compuertas, HUD, YANA y barra inferior.
// Lo comparten la noche y el día.
import type { ProdRoom, RoomId } from '../rules/types';
import { PROD_ROOMS } from '../rules/types';
import { t } from '../i18n/i18n';
import { sfx } from '../audio/audio';
import { h, sleep } from './dom';
import { Hud } from './hud';
import { resIcon } from './icons';
import { ROOMS, RoomView, type Manifest, type RoomVisual, type ZoneDef } from './room/roomView';
import { Yana } from './yana';

export interface ExplorerOpts {
  manifest: Manifest | null;
  onZone: (z: ZoneDef, room: RoomId) => void;
  visual: (room: RoomId) => RoomVisual;
  navBadge?: (room: ProdRoom) => boolean;
  navExtras?: () => HTMLElement[];
  onEnterRoom?: (room: RoomId) => void;
}

export class Explorer {
  el: HTMLElement;
  hud = new Hud();
  yana = new Yana();
  room: RoomId = 'control';
  view: RoomView;
  private roomLayer: HTMLElement;
  private navbar: HTMLElement;
  private doors: HTMLElement;
  private moving = false;
  private hlId: string | null = null;

  constructor(private opts: ExplorerOpts) {
    this.roomLayer = h('div', { class: 'layer' });
    this.navbar = h('nav', { class: 'navbar', 'aria-label': 'Navegación' });
    this.doors = h('div', { class: 'doors' }, h('i', { class: 'l' }), h('i', { class: 'r' }));
    this.view = this.makeView('control');
    this.roomLayer.append(this.view.el);
    this.el = h('div', { class: 'screen' }, this.roomLayer, this.hud.el, this.navbar, this.yana.el, this.doors);
    this.yana.onHighlight = (id) => this.highlight(id);
    this.refresh();
  }

  private makeView(room: RoomId) {
    return new RoomView(ROOMS[room], this.opts.manifest, (z) => this.opts.onZone(z, room));
  }

  async go(room: RoomId) {
    if (this.moving || room === this.room) return;
    this.moving = true;
    sfx.door();
    this.doors.classList.add('closed');
    await sleep(340);
    this.view.destroy();
    this.room = room;
    this.view = this.makeView(room);
    this.roomLayer.append(this.view.el);
    this.refresh();
    await sleep(120);
    this.doors.classList.remove('closed');
    this.moving = false;
    this.opts.onEnterRoom?.(room);
  }

  refresh() {
    this.view.update(this.opts.visual(this.room));
    this.renderNav();
    if (this.hlId) this.highlight(this.hlId);
  }

  private navKey = '';

  renderNav(force = false) {
    // Solo se repinta si cambia algo: repintar en cada fotograma rompería los clics a medias.
    const key = [this.room, ...PROD_ROOMS.map((r) => this.opts.navBadge?.(r) ?? false), ...(this.opts.navExtras?.() ?? []).map((e) => e.outerHTML)].join('|');
    if (!force && key === this.navKey) return;
    this.navKey = key;
    const items: HTMLElement[] = [];
    if (this.room === 'control') {
      for (const r of PROD_ROOMS) {
        const warn = this.opts.navBadge?.(r);
        items.push(h('button', { class: 'btn', 'data-nav': r, onclick: () => this.go(r) },
          h('span', { html: resIcon(r) }), ROOMS[r].short, warn ? h('span', { class: 'warn', 'aria-label': 'avería' }, '⚠') : null));
      }
    } else {
      items.push(h('button', { class: 'btn', 'data-nav': 'control', onclick: () => this.go('control') }, `◀ ${t('nav.back')}`));
    }
    const extras = this.opts.navExtras?.() ?? [];
    this.navbar.replaceChildren(
      h('div', { class: 'room-name' }, `${ROOMS[this.room].cam} · ${ROOMS[this.room].name}`),
      h('div', { class: 'center' }, ...items),
      h('div', { class: 'right' }, ...extras),
    );
  }

  /** Resalta una zona, una puerta o una parte del HUD (pistas y tutorial de YANA). */
  highlight(id: string | null) {
    this.hlId = id;
    this.hud.highlight(id === 'hud' || id === 'clock' ? id : null);
    this.navbar.querySelectorAll('.btn').forEach((b) => b.classList.remove('hl'));
    let zone: string | null = null;
    if (id && id !== 'hud' && id !== 'clock') {
      if (id.startsWith('door.') && this.room !== 'control') {
        this.navbar.querySelector('[data-nav="control"]')?.classList.add('hl');
      } else if (id.startsWith('nav.')) {
        this.navbar.querySelector(`[data-nav="${id.slice(4)}"]`)?.classList.add('hl');
      } else if (this.view.zone(id)) {
        zone = id;
        if (id.startsWith('door.')) this.navbar.querySelector(`[data-nav="${id.slice(5)}"]`)?.classList.add('hl');
      }
    }
    this.view.highlight(zone);
  }

  destroy() { this.yana.clear(); this.view.destroy(); this.el.remove(); }
}
