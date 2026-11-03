import { GAME_CONSTANTS } from '../types/constants';

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
export const villainYAt = (elapsedMs: number, height: number): number => {
  'worklet';
  const centreY = height / 2 - GAME_CONSTANTS.VILLAIN_HEIGHT / 2;
  const maxAmplitude = Math.max(
    0,
    height / 2 - GAME_CONSTANTS.VILLAIN_HEIGHT / 2 - GAME_CONSTANTS.VILLAIN_EDGE_MARGIN
  );
  const amplitude = Math.min(height * GAME_CONSTANTS.VILLAIN_AMPLITUDE_RATIO, maxAmplitude);
  const phase = (elapsedMs / GAME_CONSTANTS.VILLAIN_CYCLE_MS) * 2 * Math.PI;
  return centreY + Math.sin(phase) * amplitude;
};
