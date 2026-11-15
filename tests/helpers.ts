import { CONFIG, FAULTS, TASKS, nightDef } from '../src/data';
import type { NightCtx } from '../src/rules/night';

export const ctxFor = (n: number): NightCtx => ({ cfg: CONFIG, def: nightDef(n), faults: FAULTS, tasks: TASKS });
