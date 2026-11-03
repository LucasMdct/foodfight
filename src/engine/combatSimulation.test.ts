import { describe, expect, it } from 'vitest';

import { PROJECTILE_KIND } from './combatMath';
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
      frames: Array.from({ length: 60 }, () => ({ dtMs: 16 })),
    });

    expect(result.snapshot.activeEnemies).toBe(2);
  });

  it('reports a skipped spawn when the fixed enemy pool is full', () => {
    const result = runCombatScenario({
      seed: 8,
      autoSpawn: true,
      enemies: Array.from({ length: 10 }, (_, index) => ({
        x: 600,
        lane: index % 3,
        kind: PROJECTILE_KIND.lolli,
      })),
      frames: Array.from({ length: 60 }, () => ({ dtMs: 16 })),
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
