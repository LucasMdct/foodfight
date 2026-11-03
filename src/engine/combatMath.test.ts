import { describe, expect, it } from 'vitest';

import { GAME_CONSTANTS } from '../types/constants';
import {
  PROJECTILE_KIND,
  attackPhaseAt,
  difficultyAtIndex,
  difficultyConfigAt,
  difficultyIndexAt,
  milestoneCountAt,
  nextRngState,
  powerChargeAfterPickup,
  projectileKindAt,
  projectileSpeedMultiplier,
  rngUnit,
  trackShotY,
  villainYAt,
} from './combatMath';

describe('v0.0.4 fixed difficulty presets', () => {
  it('exposes the four handoff presets', () => {
    expect(difficultyConfigAt('mfacil')).toMatchObject({
      label: 'Muito Fácil',
      speed: 215,
      interval: 1450,
      doubleSpawnChance: 0,
    });
    expect(difficultyConfigAt('facil').label).toBe('Fácil');
    expect(difficultyConfigAt('dificil').label).toBe('Difícil');
    expect(difficultyConfigAt('impossivel')).toMatchObject({
      label: 'Impossível',
      speed: 560,
      interval: 540,
      doubleSpawnChance: 0.55,
    });
  });

  it('falls back to the regular preset for an invalid runtime key', () => {
    expect(difficultyConfigAt('invalid' as never)).toEqual(difficultyConfigAt('facil'));
  });

  it('keeps speed and spawn interval fixed within each preset', () => {
    const easy = difficultyConfigAt('mfacil');
    const hard = difficultyConfigAt('dificil');
    const impossible = difficultyConfigAt('impossivel');

    expect(easy.speed).toBeLessThan(impossible.speed);
    expect(hard.speed).toBe(430);
    expect(hard.interval).toBe(760);
    expect(hard.doubleSpawnChance).toBe(0.3);
    expect('acceleration' in easy).toBe(false);
    expect('acceleration' in hard).toBe(false);
    expect('acceleration' in impossible).toBe(false);
  });

  it('counts score milestones at each 100-point boundary', () => {
    expect(milestoneCountAt(99)).toBe(0);
    expect(milestoneCountAt(100)).toBe(1);
    expect(milestoneCountAt(199)).toBe(1);
    expect(milestoneCountAt(200)).toBe(2);
  });

  it('maps difficulty keys to a UI-thread-safe numeric mirror', () => {
    expect(difficultyIndexAt('mfacil')).toBe(0);
    expect(difficultyIndexAt('impossivel')).toBe(3);
    expect(difficultyAtIndex(2)).toBe('dificil');
    expect(difficultyAtIndex(99)).toBe('facil');
  });
});

describe('attack phases', () => {
  it.each([
    [0, 0],
    [99, 0],
    [100, 1],
    [199, 1],
    [200, 2],
    [299, 2],
    [300, 3],
    [399, 3],
    [400, 4],
    [10_000, 4],
  ])('maps score %i to phase %i', (score, expected) => {
    expect(attackPhaseAt(score)).toBe(expected);
  });
});

describe('projectile kinds', () => {
  it('uses the phase kind before the sugar-rain phase', () => {
    expect(projectileKindAt(0, 0.99)).toBe(PROJECTILE_KIND.lolli);
    expect(projectileKindAt(1, 0.99)).toBe(PROJECTILE_KIND.candy);
    expect(projectileKindAt(2, 0.99)).toBe(PROJECTILE_KIND.donut);
    expect(projectileKindAt(3, 0.99)).toBe(PROJECTILE_KIND.zumbi);
  });

  it('uses the approved phase-four distribution', () => {
    expect(projectileKindAt(4, 0.0)).toBe(PROJECTILE_KIND.zumbi);
    expect(projectileKindAt(4, 0.3)).toBe(PROJECTILE_KIND.candy);
    expect(projectileKindAt(4, 0.55)).toBe(PROJECTILE_KIND.lolli);
    expect(projectileKindAt(4, 0.8)).toBe(PROJECTILE_KIND.donut);
    expect(projectileKindAt(4, 0.999)).toBe(PROJECTILE_KIND.donut);
  });

  it('applies type multipliers to the selected preset speed', () => {
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.lolli)).toBe(1);
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.donut)).toBe(1);
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.candy)).toBe(1.3);
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.zumbi)).toBe(0.8);
  });
});

describe('v0.0.4 handoff constants', () => {
  it.each([
    ['ENEMY_POOL_SIZE', 12],
    ['BURST_EFFECT_POOL_SIZE', 8],
    ['ENEMY_SPAWN_FROM_RIGHT', 210],
    ['ENEMY_DESPAWN_X', -120],
    ['BUBBLE_RENDER_SIZE', 84],
    ['BUBBLE_DESPAWN_X', -90],
    ['VILLAIN_RENDER_WIDTH', 224],
    ['VILLAIN_RENDER_HEIGHT', 242],
    ['VILLAIN_SHOT_HIT_X_OFFSET', 230],
    ['VILLAIN_SHOT_EXPLOSION_X_OFFSET', 150],
    ['VILLAIN_DEFEAT_DURATION_MS', 2500],
    ['DIALOGUE_CHAR_INTERVAL_MS', 65],
    ['VILLAIN_TAUNT_DURATION_MS', 2800],
    ['VILLAIN_OUCH_DURATION_MS', 2200],
    ['VILLAIN_TALK_DELAY_MS', 800],
    ['VILLAIN_BRAVO_DURATION_MS', 1400],
    ['VILLAIN_SHAKE_DURATION_MS', 450],
    ['BUBBLE_EVERY', 100],
  ] as const)('sets %s to %i', (name, expected) => {
    expect(GAME_CONSTANTS[name]).toBe(expected);
  });

  it('uses the three v0.0.4 burst offsets', () => {
    expect(GAME_CONSTANTS.VILLAIN_BURST_DELAYS_MS).toEqual([160, 460, 760]);
  });
});

describe('deterministic random source', () => {
  it('produces repeatable non-negative unit values from a seed', () => {
    const first = nextRngState(12345);
    const second = nextRngState(12345);

    expect(first).toBe(second);
    expect(rngUnit(first)).toBeGreaterThanOrEqual(0);
    expect(rngUnit(first)).toBeLessThan(1);
  });
});

describe('combat thresholds and villain motion', () => {
  it('caps food charges at three', () => {
    expect(powerChargeAfterPickup(0)).toBe(1);
    expect(powerChargeAfterPickup(2)).toBe(3);
    expect(powerChargeAfterPickup(3)).toBe(3);
  });

  it('centres the villain at the start and keeps it inside a short viewport', () => {
    expect(villainYAt(0, 400)).toBe(200 - 71);
    expect(villainYAt(425, 400)).toBe(200 - 71 + 121);
    expect(villainYAt(1275, 400)).toBe(200 - 71 - 121);
  });

  it('moves a power shot toward the villain without teleporting', () => {
    expect(trackShotY(100, 300, 110, 220)).toBeCloseTo(200);
    expect(trackShotY(100, 300, 440, 220)).toBe(300);
  });
});
