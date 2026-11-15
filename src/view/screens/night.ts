// Pantalla de la noche: reloj en tiempo real, tareas, averías, tormentas y pistas de YANA.
import { CONFIG, FAULTS, FAULT_BY_ID, TASKS, nightDef } from '../../data';
import {
  canTask, dawnBase, display, doTask, estimateEnd, overflowing, repair, report, startNight, takeEmits, tick,
  type NightCtx, type NightEmit, type NightState,
} from '../../rules/night';
import { PROD_ROOMS, RES, type ProdRoom, type RoomId, type Step, type Vec } from '../../rules/types';
import { finishNight, learn, nightSeed } from '../../state/game';
import { t } from '../../i18n/i18n';
import { sfx, storm } from '../../audio/audio';
import { Explorer } from '../explorer';
import type { TabletEntry } from '../tablet';
import { ROOMS, type RoomVisual, type ZoneDef } from '../room/roomView';
import { YANA, scripted, type Line } from '../yana';
import type { AppApi, Screen } from '../app';

const CLOG_STEPS: Step[] = [{ kind: 'click', label: 'Pull out the dusty filter' }, { kind: 'click', label: 'Shake it and put it back' }];
const SOLAR_STEPS: Step[] = [{ kind: 'click', label: 'Press reset' }, { kind: 'hold', label: 'Hold the lever up', ms: 1000 }];
const ACTION_MS = 1100;

export class NightScreen implements Screen {
  el: HTMLElement;
  private ctx: NightCtx;
  private s: NightState;
  private ex: Explorer;
  private raf = 0;
  private last = 0;
  private lastInput = performance.now();
  private anim: { from: Vec; fromT: number; start: number } | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (this.ended || this.ex.yana.busy && (e.key === 'Enter' || e.key === ' ') && !this.ex.tablet.open) return;
    if (this.ex.tablet.key(e)) { e.preventDefault(); this.lastInput = performance.now(); }
  };
  private visualKey = '';
  private taskCount: Record<string, number> = {};
  private ended = false;
  private tutorial: boolean;
  private currentHl: string | null = null;

  constructor(private app: AppApi) {
    const g = app.game;
    const def = nightDef(g.n);
    this.tutorial = !!def.tutorial;
    this.ctx = { cfg: CONFIG, def, faults: FAULTS, tasks: TASKS };
    this.s = startNight(this.ctx, g.base, nightSeed(g));
    this.ex = new Explorer({
      manifest: app.manifest,
      onZone: (z, room) => this.onZone(z, room),
      visual: (room) => this.visual(room),
      onEnterRoom: (room) => this.enterRoom(room),
    });
    this.ex.tablet.onToggle = () => { this.refreshTablet(); this.ex.highlight(this.currentHl); };
    window.addEventListener('keydown', this.onKey);
    this.refreshTablet();
    this.el = this.ex.el;
    this.el.addEventListener('pointerdown', () => (this.lastInput = performance.now()), true);
    this.el.addEventListener('keydown', () => (this.lastInput = performance.now()), true);
    this.ex.yana.onHighlight = (id) => { this.currentHl = id === 'fault' ? this.faultTarget() : id; this.ex.highlight(this.currentHl); };
    const lines = scripted('nightStart', { night: g.n, flags: g.base.flags }, g.yanaSeen);
    this.say(lines);
    if (def.storm === 'sand') storm(true);
    this.updateHud();
    this.last = performance.now();
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }

  // ---------- bucle ----------
  private paused() {
    return this.ex.yana.blocking || !!this.anim || this.app.modalOpen || document.hidden;
  }

  private frame(now: number) {
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (!this.ended && !this.paused()) {
      tick(this.ctx, this.s, (dt / this.ctx.def.secondsPerHour) * this.app.debug.speed);
      this.handle(takeEmits(this.s));
    }
    if (this.anim && now - this.anim.start >= ACTION_MS) this.endAnim();
    this.updateHud(now);
    const key = this.computeKey();
    if (key !== this.visualKey) { this.visualKey = key; this.ex.refresh(); this.refreshTablet(); }
    if (!this.ended && !this.paused() && !this.ex.tablet.open && !this.ex.yana.busy && now - this.lastInput > 15000) {
      this.lastInput = now;
      this.hint();
    }
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }

  private computeKey() {
    const r = this.s.rooms;
    return [this.s.signal, ...PROD_ROOMS.map((k) => `${r[k].down}${r[k].cause}${r[k].down && this.s.t >= r[k].graceUntil}`)].join('|');
  }

  private updateHud(now = performance.now()) {
    let values = display(this.ctx, this.s);
    let clock = this.s.t;
    if (this.anim) {
      const p = Math.min(1, (now - this.anim.start) / ACTION_MS);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      const from = this.anim.from;
      values = Object.fromEntries(RES.map((r) => [r, from[r] + (values[r] - from[r]) * e])) as Vec;
      clock = this.anim.fromT + (this.s.t - this.anim.fromT) * e;
    }
    this.ex.hud.update({
      values, caps: this.s.start.C, goal: CONFIG.goals[String(this.s.n)], over: overflowing(this.s),
      label: t('hud.night', { n: this.s.n }), clock, signal: this.s.signal,
    });
  }

  // ---------- eventos del motor ----------
  private handle(emits: NightEmit[]) {
    for (const e of emits) {
      if (e.type === 'fault') {
        sfx.alarm();
        const f = FAULT_BY_ID[e.faultId];
        this.say(scripted('fault', { night: this.s.n }, this.app.game.yanaSeen, { room: ROOMS[e.room].name, fault: f.name }));
      } else if (e.type === 'clog') {
        sfx.alarm();
        this.say(scripted('clog', {}, [], { room: ROOMS[e.room].name }));
      } else if (e.type === 'solar') {
        sfx.solar();
        storm(true);
        this.ex.yana.noSignal = true;
        this.say(scripted('solar', {}, []), true);
      } else if (e.type === 'graceOver') {
        this.say(scripted('graceOver', {}, [], { room: ROOMS[e.room].name }));
      } else if (e.type === 'hour') {
        sfx.hour();
      } else if (e.type === 'dawn') {
        this.dawn();
      }
    }
    if (emits.length) this.ex.refresh();
  }

  private dawn() {
    if (this.ended) return;
    this.ended = true;
    this.ex.tablet.done();
    this.ex.tablet.hide();
    storm(false);
    this.ex.yana.noSignal = false;
    this.say(scripted('dawn', {}, []), true);
    setTimeout(() => {
      const rep = report(this.ctx, this.s);
      this.app.go(finishNight(this.app.game, rep, dawnBase(this.ctx, this.s)));
    }, 2200);
  }

  // ---------- YANA ----------
  private say(lines: Line[], interrupt = false) {
    if (!lines.length) return;
    let g = this.app.game;
    for (const l of lines) if (l.id && !g.yanaSeen.includes(l.id)) g = { ...g, yanaSeen: [...g.yanaSeen, l.id] };
    this.app.patch(g);
    // En el tutorial, todo lo que dice YANA para el reloj hasta que se lee.
    this.ex.yana.say(this.tutorial ? lines.map((l) => ({ ...l, block: true })) : lines, { interrupt });
  }

  private faultTarget(): string | null {
    const down = PROD_ROOMS.find((r) => this.s.rooms[r].down);
    if (!down) return null;
    if (this.ex.room === 'control') return `door.${down}`;
    if (this.ex.room === down) return this.problemZone(down);
    return 'nav.control';
  }

  private hint() {
    const H = YANA.hint;
    const goal = CONFIG.goals[String(this.s.n)];
    const est = estimateEnd(this.ctx, this.s);
    const need = (r: ProdRoom) => (goal[r] - est[r]) / goal[r];
    const down = PROD_ROOMS.filter((r) => this.s.rooms[r].down);
    const room = this.ex.room;
    let line: Line;
    if (room === 'control') {
      if (!this.s.signal && down.length) line = { text: H.blind, state: 'nosignal' };
      else if (down.length) line = { text: fillT(H.doorFault, { room: ROOMS[down[0]].name }), state: 'hint', highlight: `door.${down[0]}` };
      else {
        const r = PROD_ROOMS.reduce((a, b) => (need(b) > need(a) ? b : a));
        line = need(r) > -0.05
          ? { text: fillT(H.door, { res: cap(t(`res.${r}.low`)), room: ROOMS[r].name }), state: 'hint', highlight: `door.${r}` }
          : { text: H.wait, state: 'hint' };
      }
    } else {
      const r = room as ProdRoom;
      const task = TASKS.find((x) => x.room === r)!;
      if (this.s.rooms[r].down) {
        const z = this.problemZone(r)!;
        line = { text: fillT(H.zoneFault, { zone: ROOMS[r].zones.find((q) => q.id === z)?.label.toLowerCase() ?? z }), state: 'hint', highlight: z };
      } else if (need(r) > -0.05) {
        const zl = ROOMS[r].zones.find((q) => q.id === task.zone)?.label.toLowerCase() ?? task.zone;
        line = { text: fillT(H.zone, { zone: zl }), state: 'hint', highlight: task.zone };
      } else line = { text: H.back, state: 'hint', highlight: 'nav.control' };
    }
    this.say([line]);
  }

  private enterRoom(room: RoomId) {
    this.lastInput = performance.now();
    this.refreshTablet();
    const lines = scripted('enterRoom', { room }, this.app.game.yanaSeen);
    if (lines.length) this.say(lines);
  }

  // ---------- salas ----------
  private problemZone(r: ProdRoom): string | null {
    const st = this.s.rooms[r];
    if (!st.down) return null;
    if (st.cause === 'fault') return FAULT_BY_ID[st.faultId!].zone;
    if (st.cause === 'clog') return ROOMS[r].clogZone ?? null;
    return ROOMS[r].restartZone ?? null;
  }

  private visual(room: RoomId): RoomVisual {
    const v: RoomVisual = {
      mode: 'night', storm: !this.s.signal ? 'solar' : this.ctx.def.storm === 'sand' ? 'sand' : null,
      owned: this.s.start.owned,
    };
    if (room === 'control') {
      v.doors = Object.fromEntries(PROD_ROOMS.map((r) => [r, !this.s.signal ? 'dead' : this.s.rooms[r].down ? 'red' : 'ok']));
      if (this.ctx.def.storm === 'solar') { v.earth = this.s.signal ? 'flare' : 'nosignal'; v.flare = this.app.flare; }
    } else {
      const r = room as ProdRoom, st = this.s.rooms[r];
      if (st.down) {
        const zone = this.problemZone(r)!;
        const fx = st.cause === 'fault' ? FAULT_BY_ID[st.faultId!].fx : st.cause === 'clog' ? 'dust' : '';
        v.problem = { zone, fx, off: this.s.t >= st.graceUntil - 1e-9 };
        v.alertZones = [zone];
      }
    }
    return v;
  }

  /** Entradas de la tablet para la sala actual (en Control, las salas). */
  private entries(room: RoomId): TabletEntry[] {
    const out: TabletEntry[] = [];
    const wait: TabletEntry = { id: 'wait', label: 'wait 1 hour', kind: 'wait', run: () => this.wait() };
    if (room === 'control') {
      for (const r of PROD_ROOMS) out.push({ id: `nav.${r}`, label: ROOMS[r].name.toLowerCase(), kind: 'nav', alert: this.s.signal && this.s.rooms[r].down, run: () => void this.ex.go(r) });
      return [...out, wait];
    }
    const r = room as ProdRoom, st = this.s.rooms[r];
    const zone = this.problemZone(r) ?? undefined;
    const fix = (label: string, steps: Step[], minus: Partial<Vec> | undefined, what: Parameters<NightScreen['act']>[1]): TabletEntry =>
      ({ id: `fix.${r}`, label, kind: 'repair', alert: true, minus, steps, zone, run: () => this.act(() => repair(this.ctx, this.s, r), what) });
    if (st.down && st.cause === 'fault') { const f = FAULT_BY_ID[st.faultId!]; out.push(fix(`fix ${f.name.toLowerCase()}`, f.steps, f.cost, { repair: f.id })); }
    else if (st.down && st.cause === 'clog') out.push(fix('clean the dusty filter', CLOG_STEPS, this.ctx.def.clogCost, { clog: true }));
    else if (st.down) out.push(fix('restart the room', SOLAR_STEPS, undefined, { solar: true }));
    for (const task of TASKS.filter((x) => x.room === r)) {
      out.push({
        id: `task.${task.id}`, label: task.name.toLowerCase(), kind: 'task', plus: task.plus, minus: task.minus, steps: task.steps, zone: task.zone,
        disabled: !canTask(this.ctx, this.s, task.id).ok, run: () => this.act(() => doTask(this.ctx, this.s, task.id), { task: task.id }),
      });
    }
    return [...out, wait, { id: 'nav.control', label: 'back to control', kind: 'nav', run: () => void this.ex.go('control') }];
  }

  private refreshTablet() {
    this.ex.tablet.set(ROOMS[this.ex.room].name.toLowerCase(), this.entries(this.ex.room));
  }

  private onZone(z: ZoneDef, room: RoomId) {
    sfx.click();
    this.lastInput = performance.now();
    if (z.nav) { void this.ex.go(z.nav); return; }
    if (z.special === 'kiosk') { this.say([{ text: 'The catalog opens during the day.', state: 'hint' }]); return; }
    if (z.special === 'earth') {
      this.say([{ text: this.ctx.def.storm === 'solar'
        ? 'Solar flares throw particles that damage electronics. NASA records them in DONKI.'
        : 'A signal takes 3 to 22 minutes to travel between Earth and Mars.', state: 'normal' }]);
      return;
    }
    if (z.special === 'yana') { this.hint(); return; }
    if (room === 'control') return;
    if (z.id === 'baterias') { this.say([{ text: 'Batteries store energy for the night and for storms.', state: 'normal' }]); return; }
    // El objeto abre la tablet con su tarea (o su reparación) seleccionada.
    this.refreshTablet();
    const r = room as ProdRoom;
    const sel = this.s.rooms[r].down && this.problemZone(r) === z.id ? `fix.${r}` : `zone.${z.id}`;
    this.ex.tablet.show(sel);
  }

  /** Ejecuta una acción: ocupa la hora en curso y anima el salto del reloj. */
  private act(fn: () => void, what: { task?: string; repair?: string; clog?: boolean; solar?: boolean }) {
    if (this.ended) return;
    const from = display(this.ctx, this.s), fromT = this.s.t;
    fn();
    sfx.work();
    this.anim = { from, fromT, start: performance.now() };
    const hh = Math.floor(this.s.t);
    if (!this.ex.tablet.open) this.ex.tablet.show();
    this.ex.tablet.working(`${hh === 0 ? 12 : hh} am`);
    this.pendingAfter = what;
  }
  private pendingAfter: { task?: string; repair?: string; clog?: boolean; solar?: boolean } | null = null;

  private endAnim() {
    this.anim = null;
    this.ex.tablet.done();
    this.refreshTablet();
    const what = this.pendingAfter;
    this.pendingAfter = null;
    const emits = takeEmits(this.s);
    if (what) this.afterAction(what);
    this.handle(emits);
  }

  private afterAction(what: { task?: string; repair?: string; clog?: boolean; solar?: boolean }) {
    sfx.ok();
    let g = this.app.game;
    if (what.task) {
      const facts = YANA.taskFacts[what.task] ?? [];
      const i = this.taskCount[what.task] ?? 0;
      this.taskCount[what.task] = i + 1;
      const fact = facts[i % Math.max(1, facts.length)];
      if (fact) { this.say([{ text: fact, state: 'happy' }]); g = learn(g, fact); }
    } else if (what.repair) {
      const f = FAULT_BY_ID[what.repair];
      const repeated = g.seenFaults.includes(f.id);
      if (!repeated) g = { ...g, seenFaults: [...g.seenFaults, f.id] };
      g = learn(g, f.fact);
      this.app.patch(g);
      if (repeated) {
        // Si la avería se repite, YANA pregunta en vez de explicar.
        const q = f.question;
        this.say([{
          text: q.q, state: 'hint', choices: q.options.map((label) => ({ label })),
          onChoice: (i) => {
            const ok = i === q.answer;
            ok ? sfx.ok() : sfx.bad();
            this.ex.yana.resolveChoice(ok ? `Correct! ${f.fact}` : `Not quite. ${f.fact}`, ok ? 'happy' : 'hint');
          },
        }]);
      } else this.say([{ text: f.fact, state: 'happy' }]);
      if (this.tutorial) this.say(scripted('firstRepair', { night: this.s.n }, this.app.game.yanaSeen));
      return;
    } else if (what.clog) {
      this.say([{ text: YANA.clogRepair, state: 'happy' }]);
      g = learn(g, YANA.clogRepair);
    } else if (what.solar) {
      this.say([{ text: YANA.solarRepair, state: 'nosignal' }]);
    }
    this.app.patch(g);
  }

  private wait() {
    if (this.ended || this.anim) return;
    sfx.click();
    this.act(() => tick(this.ctx, this.s, Math.min(CONFIG.hours, Math.floor(this.s.t + 1e-9) + 1) - this.s.t), {});
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    cancelAnimationFrame(this.raf);
    storm(false);
    this.ex.destroy();
  }
}

const fillT = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
