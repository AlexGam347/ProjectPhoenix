// Tipos compartidos por las reglas. Nada de DOM aquí.

export type Res = 'agua' | 'oxi' | 'com' | 'ene';
export const RES: Res[] = ['agua', 'oxi', 'com', 'ene'];
export type Vec = Record<Res, number>;

/** Salas que producen: cada una produce el recurso del mismo nombre. */
export type ProdRoom = Res;
export type RoomId = 'control' | ProdRoom;
export const PROD_ROOMS: ProdRoom[] = ['agua', 'oxi', 'com', 'ene'];

export type Flag = 'robot' | 'blindaje' | 'prefiltros';

export interface Config {
  crew: number;
  effortPerDay: number;
  hours: number;
  R0: Vec;
  C0: Vec;
  P0: Vec;
  U0: Vec;
  crewUse: Vec;
  goals: Record<string, Vec>;
  barMax: number;
  robotBonus: number;
}

export interface Upgrade {
  id: string;
  room: RoomId;
  type: 'C' | 'P' | 'Pr';
  name: string;
  effort: number;
  cost: Partial<Vec>;
  cap?: Partial<Vec>;
  prod?: Partial<Vec>;
  up?: Partial<Vec>;
  nuc?: number;
  flag?: Flag;
  req?: string;
  fact: string;
  layer: string;
}

export interface Step {
  kind: 'click' | 'hold';
  label: string;
  ms?: number;
}

export interface Task {
  id: string;
  room: ProdRoom;
  zone: string;
  name: string;
  plus: Partial<Vec>;
  minus: Partial<Vec>;
  steps: Step[];
  fact: string;
}

export interface Question {
  q: string;
  options: string[];
  answer: number;
}

export interface Fault {
  id: string;
  room: ProdRoom;
  zone: string;
  name: string;
  fx: string;
  steps: Step[];
  cost: Partial<Vec>;
  fact: string;
  question: Question;
}

export type NightEvent =
  | { at: number; kind: 'fault'; fault?: string; pool?: string[] }
  | { at: number; kind: 'clog'; room: ProdRoom; skipIf?: Flag }
  | { at: number; kind: 'solar'; rooms: number; roomsIf?: Partial<Record<Flag, number>> };

export interface NightDef {
  n: number;
  label: string;
  secondsPerHour: number;
  tutorial?: boolean;
  storm?: 'sand' | 'solar';
  panels?: number;
  events: NightEvent[];
  clogCost?: Partial<Vec>;
  /** Tras la tormenta solar todas las máquinas rinden menos el resto de la noche. */
  solarEfficiency?: number;
  solarEfficiencyIf?: Partial<Record<Flag, number>>;
}

/** Estado de la base entre noches: lo que se guarda y lo que cambian las mejoras. */
export interface Base {
  R: Vec; // reserva
  C: Vec; // tope
  P: Vec; // producción por noche
  U: Vec; // mantenimiento por noche
  nuc: number; // energía del reactor (inmune a tormentas)
  flags: Flag[];
  owned: string[];
}
