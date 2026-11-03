import { GAME_CONSTANTS } from '../types/constants';
import type { Difficulty } from '../types/game';

export interface DifficultyConfig {
  readonly label: string;
  readonly speed: number;
  readonly interval: number;
  readonly doubleSpawnChance: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  mfacil: {
    label: 'Muito Fácil',
    speed: 215,
    interval: 1450,
    doubleSpawnChance: 0,
  },
  facil: {
    label: 'Fácil',
    speed: 300,
    interval: 1050,
    doubleSpawnChance: 0.1,
  },
  dificil: {
    label: 'Difícil',
    speed: 430,
    interval: 760,
    doubleSpawnChance: 0.3,
  },
  impossivel: {
    label: 'Impossível',
    speed: 560,
    interval: 540,
    doubleSpawnChance: 0.55,
  },
};

export const difficultyConfigAt = (difficulty: Difficulty): DifficultyConfig => {
  'worklet';
  return DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.facil;
};

export const difficultyIndexAt = (difficulty: Difficulty): number => {
  'worklet';
  if (difficulty === 'mfacil') return 0;
  if (difficulty === 'dificil') return 2;
  if (difficulty === 'impossivel') return 3;
  return 1;
};

export const difficultyAtIndex = (index: number): Difficulty => {
  'worklet';
  if (index === 0) return 'mfacil';
  if (index === 2) return 'dificil';
  if (index === 3) return 'impossivel';
  return 'facil';
};

export const milestoneCountAt = (score: number): number => {
  'worklet';
  return Math.floor(score / GAME_CONSTANTS.MILESTONE_SCORE_STEP);
};

export const PROJECTILE_KIND = {
  lolli: 0,
  candy: 1,
  donut: 2,
  zumbi: 3,
} as const;

export type ProjectileKind = (typeof PROJECTILE_KIND)[keyof typeof PROJECTILE_KIND];

export const attackPhaseAt = (score: number): number => {
  'worklet';
  return Math.min(
    GAME_CONSTANTS.ATTACK_PHASE_MAX,
    Math.floor(score / GAME_CONSTANTS.ATTACK_PHASE_SCORE_STEP)
  );
};

export const projectileKindAt = (phase: number, random01: number): ProjectileKind => {
  'worklet';
  if (phase === 0) return PROJECTILE_KIND.lolli;
  if (phase === 1) return PROJECTILE_KIND.candy;
  if (phase === 2) return PROJECTILE_KIND.donut;
  if (phase === 3) return PROJECTILE_KIND.zumbi;
  if (random01 < 0.3) return PROJECTILE_KIND.zumbi;
  if (random01 < 0.55) return PROJECTILE_KIND.candy;
  if (random01 < 0.8) return PROJECTILE_KIND.lolli;
  return PROJECTILE_KIND.donut;
};

export const projectileSpeedMultiplier = (kind: ProjectileKind): number => {
  'worklet';
  if (kind === PROJECTILE_KIND.candy) return 1.3;
  if (kind === PROJECTILE_KIND.zumbi) return 0.8;
  return 1;
};

/** Allocation-free 32-bit LCG state transition for production and harness. */
export const nextRngState = (state: number): number => {
  'worklet';
  return (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
};

export const rngUnit = (state: number): number => {
  'worklet';
  return (state >>> 0) / 4_294_967_296;
};

export const powerChargeAfterPickup = (charges: number): number => {
  'worklet';
  return Math.min(GAME_CONSTANTS.POWER_MAX_CHARGES, charges + 1);
};

export const trackShotY = (
  currentY: number,
  targetY: number,
  dtMs: number,
  trackingDurationMs: number
): number => {
  'worklet';
  const amount = Math.min(1, Math.max(0, dtMs / trackingDurationMs));
  return currentY + (targetY - currentY) * amount;
};

/** Top-Y of the villain, centred in the playfield and clamped away from edges. */
export const villainYAt = (
  elapsedMs: number,
  height: number,
  villainHeight = GAME_CONSTANTS.VILLAIN_HEIGHT
): number => {
  'worklet';
  const centreY = height / 2 - villainHeight / 2;
  const maxAmplitude = Math.max(
    0,
    height / 2 - villainHeight / 2 - GAME_CONSTANTS.VILLAIN_EDGE_MARGIN
  );
  const amplitude = Math.min(height * GAME_CONSTANTS.VILLAIN_AMPLITUDE_RATIO, maxAmplitude);
  const phase = (elapsedMs / GAME_CONSTANTS.VILLAIN_CYCLE_MS) * 2 * Math.PI;
  return centreY + Math.sin(phase) * amplitude;
};
