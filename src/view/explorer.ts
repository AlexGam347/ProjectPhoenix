// Turno de noche: sala actual con compuertas, HUD arriba a la derecha, tablet abajo a la izquierda
// y YANA abajo a la derecha. En las salas, una flecha abajo vuelve a Control (como en FNAF 6).
import type { RoomId } from '../rules/types';
import { sfx } from '../audio/audio';
import { h, sleep } from './dom';
import { Hud } from './hud';
import { px } from './pixelIcons';
import { ROOMS, RoomView, type Manifest, type RoomVisual, type ZoneDef } from './room/roomView';
import { Tablet } from './tablet';
import { Yana } from './yana';

export interface ExplorerOpts {
  manifest: Manifest | null;
  onZone: (z: ZoneDef, room: RoomId) => void;
  visual: (room: RoomId) => RoomVisual;
  onEnterRoom?: (room: RoomId) => void;
}

export class Explorer {
  el: HTMLElement;
  hud = new Hud();
  yana = new Yana();
  tablet = new Tablet();
  room: RoomId = 'control';
  view: RoomView;
  private roomLayer: HTMLElement;
  private label: HTMLElement;
  private back: HTMLElement;
  private doors: HTMLElement;
  private moving = false;
  private hlId: string | null = null;

  constructor(private opts: ExplorerOpts) {
    this.roomLayer = h('div', { class: 'layer' });
    this.label = h('div', { class: 'cam-label' });
    this.back = h('button', { class: 'edge-arrow down', 'aria-label': 'Back to Control', html: px('down'), onclick: () => this.go('control') });
    this.doors = h('div', { class: 'doors' }, h('i', { class: 'l' }), h('i', { class: 'r' }));
    this.view = this.makeView('control');
    this.roomLayer.append(this.view.el);
    this.el = h('div', { class: 'screen night' }, this.roomLayer, h('div', { class: 'crt' }), this.label, this.hud.el, this.back,
      this.tablet.el, this.yana.el, this.doors);
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
    this.label.textContent = ROOMS[this.room].name.toLowerCase();
    this.back.classList.toggle('hidden', this.room === 'control');
    if (this.hlId) this.highlight(this.hlId);
  }

  /** Resalta una zona, una puerta, la tablet o una parte del HUD (pistas y tutorial de YANA). */
  highlight(id: string | null) {
    this.hlId = id;
    this.hud.highlight(id === 'hud' || id === 'clock' ? id : null);
    this.back.classList.remove('hl');
    let zone: string | null = null;
    let entry: string | null = null;
    if (id && id !== 'hud' && id !== 'clock') {
      if (id === 'tablet') entry = 'bar';
      else if (id.startsWith('door.') && this.room !== 'control') { this.back.classList.add('hl'); entry = 'nav.control'; }
      else if (id.startsWith('nav.')) { entry = id; if (id === 'nav.control') this.back.classList.add('hl'); }
      else if (this.view.zone(id)) {
        zone = id;
        entry = id.startsWith('door.') ? `nav.${id.slice(5)}` : `zone.${id}`;
      }
    }
    this.view.highlight(zone);
    // La entrada de la tablet se ilumina si está abierta; si no, se ilumina la barra para invitar a subirla.
    if (entry && entry !== 'bar' && !this.tablet.open) this.tablet.highlight('bar');
    else this.tablet.highlight(entry);
  }

  destroy() { this.yana.clear(); this.view.destroy(); this.el.remove(); }
}
