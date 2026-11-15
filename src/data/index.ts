// Punto único de acceso a los datos editables.
import configJson from './config.json';
import upgradesJson from './upgrades.json';
import tasksJson from './tasks.json';
import faultsJson from './faults.json';
import nightsJson from './nights.json';
import type { Config, Fault, NightDef, Task, Upgrade } from '../rules/types';

export const CONFIG = configJson as unknown as Config;
export const UPGRADES = upgradesJson as unknown as Upgrade[];
export const TASKS = tasksJson as unknown as Task[];
export const FAULTS = faultsJson as unknown as Fault[];
export const NIGHTS = nightsJson as unknown as NightDef[];

export const UPG_BY_ID: Record<string, Upgrade> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const FAULT_BY_ID: Record<string, Fault> = Object.fromEntries(FAULTS.map((f) => [f.id, f]));
export const TASK_BY_ID: Record<string, Task> = Object.fromEntries(TASKS.map((t) => [t.id, t]));
export const nightDef = (n: number): NightDef => NIGHTS.find((d) => d.n === n)!;
