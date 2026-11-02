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
});
