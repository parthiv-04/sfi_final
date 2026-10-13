import { ROUND2_CONFIG as CONFIG } from './config';
type Path = 'contract' | 'maeTha';
import { makeRng, subSeed } from './rng';


export type MiniMode = 'spray' | 'hand';
export const modeForPath = (path: Path): MiniMode => (path === 'contract' ? 'spray' : 'hand');

export interface SpawnEvent {
  t: number; // seconds from start
  pick: number; // 0..1: which living plant it targets (resolved when it spawns)
  drift: number; // -1..1: small horizontal offset from the plant
}

/** Seeded spawn schedule. Same seed + mode => identical schedule. */
export function spawnSchedule(seed: number, mode: MiniMode): SpawnEvent[] {
  const rng = makeRng(subSeed(seed, mode === 'spray' ? 1 : 2));
  const cfg = CONFIG.minigame[mode];
  const out: SpawnEvent[] = [];
  for (let t = 0.8; t < CONFIG.minigame.durationSec; t += cfg.spawnIntervalSec) {
    out.push({ t, pick: rng(), drift: rng() * 2 - 1 });
  }
  return out;
}

export interface Pest {
  id: number;
  plant: number; // index of target plant
  x: number;
  y: number;
}

export interface MiniState {
  time: number;
  nextSpawn: number;
  nextId: number;
  pests: Pest[];
  alive: boolean[]; // per plant
  killed: number;
}

export const plantX = (index: number): number => {
  const n = CONFIG.minigame.plants;
  const w = CONFIG.minigame.fieldWidthPx;
  return ((index + 0.5) * w) / n;
};

export function initMini(): MiniState {
  return {
    time: 0,
    nextSpawn: 0,
    nextId: 1,
    pests: [],
    alive: Array.from({ length: CONFIG.minigame.plants }, () => true),
    killed: 0,
  };
}

/** Advance the mini-game by dt seconds. Pure: returns a new state. */
export function stepMini(state: MiniState, dt: number, mode: MiniMode, schedule: SpawnEvent[]): MiniState {
  const cfg = CONFIG.minigame;
  const speed = cfg[mode].fallSpeedPx;
  const hitY = cfg.fieldHeightPx - cfg.plantBandPx;
  const time = state.time + dt;
  let { nextSpawn, nextId } = state;
  const alive = [...state.alive];
  const pests: Pest[] = state.pests.map((p) => ({ ...p, y: p.y + speed * dt }));

  while (nextSpawn < schedule.length && schedule[nextSpawn].t <= time) {
    const ev = schedule[nextSpawn++];
    const living = alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
    if (living.length > 0) {
      const plant = living[Math.floor(ev.pick * living.length)];
      pests.push({ id: nextId++, plant, x: plantX(plant) + ev.drift * 14, y: -10 });
    }
  }

  const remaining: Pest[] = [];
  for (const p of pests) {
    if (p.y >= hitY) alive[p.plant] = false; // reached its plant: destroyed
    else remaining.push(p);
  }
  // A pest whose plant was already destroyed leaves the field.
  return { ...state, time, nextSpawn, nextId, alive, pests: remaining.filter((p) => alive[p.plant]) };
}

export function spraySpot(
  state: MiniState,
  x: number,
  y: number,
  radius: number = CONFIG.minigame.spray.sprayRadiusPx,
): MiniState {
  const survivors = state.pests.filter((p) => Math.hypot(p.x - x, p.y - y) > radius);
  return { ...state, pests: survivors, killed: state.killed + (state.pests.length - survivors.length) };
}

export function tapPest(state: MiniState, id: number): MiniState {
  const survivors = state.pests.filter((p) => p.id !== id);
  return { ...state, pests: survivors, killed: state.killed + (state.pests.length - survivors.length) };
}

export const destroyedPlants = (state: MiniState): number => state.alive.filter((a) => !a).length;

/** Headless play for tests: a bot that kills every pest once it is on screen, or does nothing. */
export function runBot(seed: number, mode: MiniMode, killEveryPest: boolean): MiniState {
  const schedule = spawnSchedule(seed, mode);
  let s = initMini();
  const dt = 0.05;
  for (let t = 0; t < CONFIG.minigame.durationSec; t += dt) {
    s = stepMini(s, dt, mode, schedule);
    if (killEveryPest) for (const p of [...s.pests]) if (p.y > 40) s = tapPest(s, p.id);
  }
  return s;
}
