import { describe, expect, it } from 'vitest';

import { GAME_CONSTANTS } from '../types/constants';
import { PROJECTILE_KIND, villainYAt } from './combatMath';
import { runCombatScenario } from './combatSimulation';

describe('combat simulation fire authorization', () => {
  it('accepts at most one fire from two requests with one charge', () => {
    const result = runCombatScenario({
      seed: 1,
      charges: 1,
      frames: [
        { dtMs: 16, fire: true },
        { dtMs: 16, fire: true },
      ],
    });

    expect(result.events.filter((event) => event.type === 'powerFired')).toHaveLength(1);
    expect(result.snapshot.charges).toBe(0);
    expect(result.snapshot.activeShots).toBe(1);
  });
});

describe('combat simulation result races', () => {
  it('freezes on the villain hit before a late enemy hit can change win to over', () => {
    const result = runCombatScenario({
      seed: 2,
      villainHp: 1,
      charges: 1,
      lives: 1,
      enemies: [{ x: 650, lane: 1, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }, ...Array.from({ length: 80 }, () => ({ dtMs: 16 }))],
    });

    expect(result.snapshot.screen).toBe('win');
    expect(result.events.some((event) => event.type === 'over')).toBe(false);
  });

  it('removes an enemy hit without awarding dodge score', () => {
    const result = runCombatScenario({
      seed: 3,
      score: 40,
      enemies: [{ x: 120, lane: 1, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16 }],
    });

    expect(result.snapshot.lives).toBe(2);
    expect(result.snapshot.score).toBe(40);
  });
});

describe('combat simulation food bubble', () => {
  it('collects a bubble using the approved collision padding', () => {
    const result = runCombatScenario({
      seed: 5,
      charges: 0,
      bubble: { x: 170, lane: 1 },
      frames: [{ dtMs: 16 }],
    });

    expect(result.events.some((event) => event.type === 'foodCollected')).toBe(true);
    expect(result.snapshot.charges).toBe(1);
  });

  it('keeps charges capped while still emitting pickup feedback', () => {
    const result = runCombatScenario({
      seed: 4,
      score: 300,
      charges: 3,
      bubble: { x: 140, lane: 1 },
      frames: [{ dtMs: 16 }],
    });

    expect(result.snapshot.charges).toBe(3);
    expect(result.events.some((event) => event.type === 'foodCollected')).toBe(true);
  });

  it('queues a bubble after a dodge crosses the score threshold', () => {
    const result = runCombatScenario({
      seed: 6,
      score: 290,
      enemies: [{ x: -200, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16 }, { dtMs: 16 }],
    });

    expect(result.events.some((event) => event.type === 'bubbleSpawned')).toBe(true);
  });
});

describe('combat simulation coverage', () => {
  it('uses the selected difficulty for spawn cadence', () => {
    const frames = Array.from({ length: 40 }, () => ({ dtMs: 16 }));
    const easy = runCombatScenario({ seed: 10, difficulty: 'mfacil', frames });
    const impossible = runCombatScenario({ seed: 10, difficulty: 'impossivel', frames });

    expect(easy.events.filter((event) => event.type === 'projectileSpawned')).toHaveLength(0);
    expect(
      impossible.events.filter((event) => event.type === 'projectileSpawned').length
    ).toBeGreaterThan(0);
  });

  it('honours the 400ms handoff warmup before the first spawn', () => {
    const beforeWarmup = runCombatScenario({
      seed: 15,
      difficulty: 'impossivel',
      frames: Array.from({ length: 8 }, () => ({ dtMs: 16 })),
    });
    const result = runCombatScenario({
      seed: 15,
      difficulty: 'impossivel',
      frames: Array.from({ length: 9 }, () => ({ dtMs: 16 })),
    });

    expect(beforeWarmup.events.filter((event) => event.type === 'projectileSpawned')).toHaveLength(
      0
    );
    expect(
      result.events.filter((event) => event.type === 'projectileSpawned').length
    ).toBeGreaterThan(0);
  });

  it('emits one three-zombie burst and one capped charge at a 100-point milestone', () => {
    const result = runCombatScenario({
      seed: 11,
      score: 90,
      enemies: [{ x: -200, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16 }],
    });

    expect(result.events.filter((event) => event.type === 'villainBurst')).toEqual([
      { type: 'villainBurst', count: GAME_CONSTANTS.VILLAIN_BURST_COUNT, lane: 1 },
    ]);
    expect(result.events.filter((event) => event.type === 'powerChargeGranted')).toEqual([
      { type: 'powerChargeGranted', charges: 1 },
    ]);
  });

  it('staggers burst slots at the handoff timestamps', () => {
    const scenario = (frameCount: number) =>
      runCombatScenario({
        seed: 17,
        score: 90,
        enemies: [{ x: -200, lane: 0, kind: PROJECTILE_KIND.lolli }],
        frames: Array.from({ length: frameCount }, () => ({ dtMs: 16 })),
      });

    expect(scenario(9).snapshot.activeEnemies).toBe(0);
    expect(scenario(10).snapshot.activeEnemies).toBe(1);
    expect(scenario(29).snapshot.activeEnemies).toBe(2);
    expect(scenario(48).snapshot.activeEnemies).toBe(3);
  });

  it('clears normal projectiles but preserves resistant burst projectiles in power mode', () => {
    const result = runCombatScenario({
      seed: 12,
      charges: 1,
      enemies: [
        { x: 300, lane: 0, kind: PROJECTILE_KIND.lolli },
        { x: 300, lane: 0, kind: PROJECTILE_KIND.zumbi, resistant: true },
      ],
      frames: [{ dtMs: 16, fire: true }],
    });

    expect(result.events.filter((event) => event.type === 'powerCleared')).toHaveLength(1);
    expect(result.snapshot.activeEnemies).toBe(1);
  });

  it('queues a food bubble when power clearing crosses a 300-point threshold', () => {
    const result = runCombatScenario({
      seed: 14,
      score: 290,
      charges: 1,
      enemies: [{ x: 300, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }],
    });

    expect(result.events.some((event) => event.type === 'powerCleared')).toBe(true);
    expect(result.events.some((event) => event.type === 'bubbleSpawned')).toBe(true);
  });

  it('does not power-clear a projectile that is already behind the hero', () => {
    const result = runCombatScenario({
      seed: 16,
      charges: 1,
      enemies: [{ x: 50, lane: 1, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }],
    });

    expect(result.events.filter((event) => event.type === 'powerCleared')).toHaveLength(0);
    expect(result.events.filter((event) => event.type === 'heroHit')).toHaveLength(1);
  });

  it('spawns normal projectiles from the Barão current lane', () => {
    const result = runCombatScenario({
      seed: 13,
      difficulty: 'impossivel',
      frames: Array.from({ length: 40 }, () => ({ dtMs: 16 })),
    });
    const spawn = result.events.find((event) => event.type === 'projectileSpawned');
    const expectedLane = Math.floor(
      (villainYAt(144, 520, GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT) +
        GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2) /
        (520 / GAME_CONSTANTS.LANE_COUNT)
    );

    expect(spawn).toMatchObject({ type: 'projectileSpawned', lane: expectedLane });
  });

  it('uses the larger zombie hitbox from the handoff', () => {
    const result = runCombatScenario({
      seed: 7,
      lives: 2,
      enemies: [{ x: 40, lane: 1, kind: PROJECTILE_KIND.zumbi }],
      frames: [{ dtMs: 16 }],
    });

    expect(result.events.some((event) => event.type === 'heroHit')).toBe(true);
  });

  it('spawns the phase-four sugar-rain double when the seeded roll is below one half', () => {
    const result = runCombatScenario({
      seed: 1,
      score: 400,
      difficulty: 'impossivel',
      frames: Array.from({ length: 40 }, () => ({ dtMs: 16 })),
    });

    expect(result.snapshot.activeEnemies).toBe(2);
  });

  it('reports a skipped spawn when the fixed enemy pool is full', () => {
    const result = runCombatScenario({
      seed: 8,
      autoSpawn: true,
      difficulty: 'facil',
      enemies: Array.from({ length: 10 }, (_, index) => ({
        x: 600,
        lane: index % 3,
        kind: PROJECTILE_KIND.lolli,
      })),
      frames: Array.from({ length: 80 }, () => ({ dtMs: 16 })),
    });

    expect(result.events.some((event) => event.type === 'spawnSkipped')).toBe(true);
  });

  it('does not apply a second enemy hit during the invulnerability window', () => {
    const result = runCombatScenario({
      seed: 9,
      lives: 3,
      enemies: [
        { x: 120, lane: 1, kind: PROJECTILE_KIND.lolli },
        { x: 120, lane: 1, kind: PROJECTILE_KIND.donut },
      ],
      frames: [{ dtMs: 16 }, { dtMs: 16 }],
    });

    expect(result.events.filter((event) => event.type === 'heroHit')).toHaveLength(1);
    expect(result.snapshot.lives).toBe(2);
  });
});
