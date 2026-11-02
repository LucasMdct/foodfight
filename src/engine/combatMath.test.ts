import { describe, expect, it } from 'vitest';

import {
  PROJECTILE_KIND,
  attackPhaseAt,
  nextRngState,
  powerChargeAfterPickup,
  projectileKindAt,
  projectileSpeedMultiplier,
  rngUnit,
  villainYAt,
} from './combatMath';

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

  it('applies type multipliers to current ramped speed', () => {
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.lolli)).toBe(1);
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.donut)).toBe(1);
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.candy)).toBe(1.3);
    expect(projectileSpeedMultiplier(PROJECTILE_KIND.zumbi)).toBe(0.8);
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
});
