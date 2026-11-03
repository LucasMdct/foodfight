import { describe, expect, it } from 'vitest';

import { GAME_CONSTANTS } from '../types/constants';
import { PROJECTILE_KIND, villainYAt } from './combatMath';
import { runCombatScenario } from './combatSimulation';

describe('combat simulation fire authorization', () => {
  it('rejects a saturated shot pool without spending or clearing enemies', () => {
    const result = runCombatScenario({
      seed: 1,
      charges: 3,
      enemies: [{ x: 950, lane: 0, kind: PROJECTILE_KIND.lolli }],
      bubble: { x: 140, lane: 1 },
      frames: Array.from({ length: 4 }, () => ({ dtMs: 0, fire: true })),
    });

    expect(result.events.filter((event) => event.type === 'powerFired')).toHaveLength(3);
    expect(result.events.filter((event) => event.type === 'spawnSkipped')).toHaveLength(1);
    expect(result.snapshot.charges).toBe(1);
    expect(result.snapshot.activeEnemies).toBe(1);
  });

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
  it('freezes on the villain hit, stages defeat confetti, and delays win without late heroHit or score', () => {
    const beforeCompletion = runCombatScenario({
      seed: 2,
      villainHp: 1,
      charges: 1,
      lives: 1,
      enemies: [{ x: 650, lane: 1, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }, ...Array.from({ length: 80 }, () => ({ dtMs: 16 }))],
    });

    expect(beforeCompletion.events.some((event) => event.type === 'villainDefeatStarted')).toBe(
      true
    );
    expect(beforeCompletion.snapshot.screen).toBe('game');
    expect(beforeCompletion.events.some((event) => event.type === 'win')).toBe(false);
    expect(beforeCompletion.events.some((event) => event.type === 'heroHit')).toBe(false);
    expect(beforeCompletion.events.some((event) => event.type === 'score')).toBe(false);

    const completed = runCombatScenario({
      seed: 2,
      villainHp: 1,
      charges: 1,
      lives: 1,
      enemies: [{ x: 650, lane: 1, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }, ...Array.from({ length: 240 }, () => ({ dtMs: 16 }))],
    });

    const defeatIndex = completed.events.findIndex(
      (event) => event.type === 'villainDefeatStarted'
    );
    const winIndex = completed.events.findIndex((event) => event.type === 'win');

    expect(defeatIndex).toBeGreaterThanOrEqual(0);
    expect(winIndex).toBeGreaterThan(defeatIndex);
    expect(completed.snapshot.screen).toBe('win');
    expect(completed.events.some((event) => event.type === 'over')).toBe(false);
    expect(completed.events.some((event) => event.type === 'heroHit')).toBe(false);
    expect(completed.events.some((event) => event.type === 'score')).toBe(false);
  });

  it('triggers the Barão hit at W - 230 and spawns the hit explosion at W - 150 before the nine defeat bursts', () => {
    const atOldBoundary = runCombatScenario({
      seed: 2,
      villainHp: 2,
      charges: 1,
      enemies: [],
      frames: [{ dtMs: 50, fire: true }, ...Array.from({ length: 15 }, () => ({ dtMs: 50 }))],
    });

    expect(atOldBoundary.events).toContainEqual({ type: 'villainHit', villainHp: 1 });
    expect(atOldBoundary.events).toContainEqual(
      expect.objectContaining({
        type: 'confettiSpawned',
        x: 900 - GAME_CONSTANTS.VILLAIN_SHOT_EXPLOSION_X_OFFSET,
      })
    );

    const defeatSequence = runCombatScenario({
      seed: 2,
      villainHp: 1,
      charges: 1,
      enemies: [],
      frames: [{ dtMs: 50, fire: true }, ...Array.from({ length: 70 }, () => ({ dtMs: 50 }))],
    });

    expect(defeatSequence.events.filter((event) => event.type === 'confettiSpawned')).toHaveLength(
      1 + GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_COUNT
    );
    expect(defeatSequence.snapshot.screen).toBe('win');
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
  it('uses the 84px bubble bounds for collection', () => {
    const result = runCombatScenario({
      seed: 1,
      enemies: [],
      bubble: { x: 10, lane: 1 },
      frames: [{ dtMs: 0 }],
    });

    expect(result.snapshot.charges).toBe(1);
    expect(result.events).toContainEqual({ type: 'foodCollected', charges: 1 });
  });

  it('queues each crossed threshold and serves one bubble after the active bubble passes -90', () => {
    const result = runCombatScenario({
      seed: 1,
      score: 90,
      charges: 1,
      enemies: Array.from({ length: 12 }, () => ({
        x: 600,
        lane: 0,
        kind: PROJECTILE_KIND.lolli,
      })),
      bubble: { x: -91, lane: 0 },
      frames: [{ dtMs: 0, fire: true }, { dtMs: 0 }],
    });

    expect(result.snapshot.score).toBe(210);
    expect(result.events.filter((event) => event.type === 'bubbleSpawned')).toHaveLength(1);
    expect(result.snapshot).toMatchObject({ bubbleActive: true, bubblePending: 1, charges: 0 });
  });

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

  it('queues bubbles across the 100, 200, and 300 point thresholds one at a time', () => {
    const result = runCombatScenario({
      seed: 6,
      score: 90,
      enemies: Array.from({ length: 21 }, (_, index) => ({
        x: -200,
        lane: index % 3,
        kind: PROJECTILE_KIND.lolli,
      })).slice(0, 12),
      frames: [{ dtMs: 16 }],
    });

    expect(result.snapshot.score).toBe(210);
    expect(result.events.filter((event) => event.type === 'bubbleSpawned')).toHaveLength(1);
    expect(result.snapshot.bubbleActive).toBe(true);
    expect(result.snapshot.bubblePending).toBe(1);
  });
});

describe('combat simulation full-screen clear', () => {
  it('releases an already-scored slot without awarding it again', () => {
    const result = runCombatScenario({
      seed: 1,
      charges: 1,
      score: 10,
      enemies: [{ x: 300, lane: 0, kind: PROJECTILE_KIND.lolli, scored: true }],
      frames: [{ dtMs: 0, fire: true }, ...Array.from({ length: 100 }, () => ({ dtMs: 50 }))],
    });

    expect(result.snapshot.activeEnemies).toBe(0);
    expect(result.snapshot.score).toBe(10);
    expect(result.events.filter((event) => event.type === 'score')).toHaveLength(0);
  });

  it('requests confetti at each cleared sprite center', () => {
    const result = runCombatScenario({
      seed: 1,
      charges: 1,
      enemies: [
        { x: 300, lane: 0, kind: PROJECTILE_KIND.lolli },
        { x: 600, lane: 2, kind: PROJECTILE_KIND.zumbi, resistant: true },
      ],
      frames: [{ dtMs: 0, fire: true }],
    });

    const effects = result.events.filter((event) => event.type === 'confettiSpawned');
    expect(effects).toHaveLength(2);
    expect(effects[0].x).toBeCloseTo(333.8);
    expect(effects[0].y).toBeCloseTo(520 / 6);
    expect(effects[1].x).toBe(648);
    expect(effects[1].y).toBeCloseTo((520 * 5) / 6);
  });

  it('still clears and scores all enemies when the fixed confetti pool saturates', () => {
    const result = runCombatScenario({
      seed: 1,
      charges: 1,
      enemies: Array.from({ length: 12 }, () => ({
        x: 600,
        lane: 0,
        kind: PROJECTILE_KIND.zumbi,
        resistant: true,
      })),
      frames: [{ dtMs: 0, fire: true }],
    });

    expect(result.snapshot.score).toBe(120);
    expect(result.snapshot.activeEnemies).toBe(0);
    expect(result.events.filter((event) => event.type === 'confettiSpawned')).toHaveLength(8);
    expect(result.events.filter((event) => event.type === 'spawnSkipped')).toHaveLength(4);
  });

  it('leaves offscreen enemies alone and does not keep clearing after fire', () => {
    const result = runCombatScenario({
      seed: 1,
      charges: 1,
      enemies: [{ x: 920, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 0, fire: true }, ...Array.from({ length: 30 }, () => ({ dtMs: 50 }))],
    });

    expect(result.snapshot.activeEnemies).toBe(1);
    expect(result.snapshot.score).toBe(0);
    expect(result.events.filter((event) => event.type === 'powerCleared')).toHaveLength(0);
    expect(result.events.filter((event) => event.type === 'villainHit')).toHaveLength(1);
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

  it('keeps the selected spawn interval fixed as match time advances', () => {
    const result = runCombatScenario({
      seed: 10,
      difficulty: 'dificil',
      frames: Array.from({ length: 1117 }, () => ({ dtMs: 1, lane: 0 })),
    });

    expect(result.events.filter((event) => event.type === 'projectileSpawned')).toHaveLength(2);
  });

  it('keeps projectile travel speed fixed over a long match', () => {
    const result = runCombatScenario({
      seed: 18,
      difficulty: 'mfacil',
      enemies: [{ x: 2000, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: Array.from({ length: 200 }, () => ({ dtMs: 50, lane: 1 })),
    });

    expect(result.snapshot.activeEnemies).toBe(1);
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

  it('queues a bubble and a three-zombie burst at 100 without granting power', () => {
    const result = runCombatScenario({
      seed: 11,
      score: 90,
      enemies: [{ x: -200, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16 }],
    });

    expect(result.events.filter((event) => event.type === 'villainBurst')).toEqual([
      { type: 'villainBurst', count: GAME_CONSTANTS.VILLAIN_BURST_COUNT, lane: 1 },
    ]);
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ type: 'powerChargeGranted' })
    );
    expect(result.events.filter((event) => event.type === 'bubbleSpawned')).toHaveLength(1);
    expect(result.snapshot.charges).toBe(0);
  });

  it('staggers burst slots at the handoff timestamps', () => {
    const scenario = (frameCount: number) =>
      runCombatScenario({
        seed: 17,
        score: 90,
        enemies: [{ x: -200, lane: 0, kind: PROJECTILE_KIND.lolli }],
        frames: Array.from({ length: frameCount }, () => ({ dtMs: 16 })),
      });

    expect(scenario(10).snapshot.activeEnemies).toBe(0);
    expect(scenario(11).snapshot.activeEnemies).toBe(1);
    expect(scenario(29).snapshot.activeEnemies).toBe(1);
    expect(scenario(30).snapshot.activeEnemies).toBe(2);
    expect(scenario(49).snapshot.activeEnemies).toBe(3);
  });

  it('clears sweets and resistant zombies across the screen in one accepted fire', () => {
    const result = runCombatScenario({
      seed: 12,
      charges: 1,
      enemies: [
        { x: 300, lane: 0, kind: PROJECTILE_KIND.lolli },
        { x: 300, lane: 0, kind: PROJECTILE_KIND.zumbi, resistant: true },
        { x: 750, lane: 2, kind: PROJECTILE_KIND.donut },
      ],
      frames: [{ dtMs: 16, fire: true }],
    });

    expect(result.events.filter((event) => event.type === 'powerCleared')).toHaveLength(3);
    expect(result.snapshot.activeEnemies).toBe(0);
    expect(result.snapshot.score).toBe(30);
    expect(result.snapshot.activeShots).toBe(1);
    expect(result.snapshot.villainHp).toBe(5);
  });

  it('queues a food bubble when power clearing crosses a 100-point threshold', () => {
    const result = runCombatScenario({
      seed: 14,
      score: 90,
      charges: 1,
      enemies: [{ x: 300, lane: 0, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }],
    });

    expect(result.events.some((event) => event.type === 'powerCleared')).toBe(true);
    expect(result.events.some((event) => event.type === 'bubbleSpawned')).toBe(true);
  });

  it('clears a visible projectile behind the hero before it can hit', () => {
    const result = runCombatScenario({
      seed: 16,
      charges: 1,
      enemies: [{ x: 50, lane: 1, kind: PROJECTILE_KIND.lolli }],
      frames: [{ dtMs: 16, fire: true }],
    });

    expect(result.events.filter((event) => event.type === 'powerCleared')).toHaveLength(1);
    expect(result.events.filter((event) => event.type === 'heroHit')).toHaveLength(0);
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
      enemies: Array.from({ length: 12 }, (_, index) => ({
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
