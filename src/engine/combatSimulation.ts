import {
  attackPhaseAt,
  difficultyConfigAt,
  milestoneCountAt,
  nextRngState,
  powerChargeAfterPickup,
  projectileKindAt,
  projectileSpeedMultiplier,
  PROJECTILE_KIND,
  ProjectileKind,
  rngUnit,
  trackShotY,
  villainYAt,
} from './combatMath';
import { rectsOverlapX } from './math';
import { GAME_CONSTANTS } from '../types/constants';
import type { Difficulty } from '../types/game';

const SIMULATION_WIDTH = 900;
const HERO_X = SIMULATION_WIDTH * GAME_CONSTANTS.HERO_X_RATIO;
const HERO_LEFT = HERO_X + GAME_CONSTANTS.HERO_HITBOX_PADDING;
const HERO_RIGHT = HERO_X + GAME_CONSTANTS.HERO_WIDTH - GAME_CONSTANTS.HERO_HITBOX_PADDING;
const VILLAIN_X = SIMULATION_WIDTH - 100;
const SIMULATION_HEIGHT = 520;
const LANE_HEIGHT = SIMULATION_HEIGHT / GAME_CONSTANTS.LANE_COUNT;

export type CombatSimulationScreen = 'game' | 'over' | 'win';

export interface CombatFrame {
  readonly dtMs: number;
  readonly lane?: number;
  readonly fire?: boolean;
}

export interface CombatEnemySeed {
  readonly x: number;
  readonly lane: number;
  readonly kind: ProjectileKind;
  readonly resistant?: boolean;
}

export interface CombatScenario {
  readonly seed: number;
  readonly score?: number;
  readonly villainHp?: number;
  readonly charges?: number;
  readonly lives?: number;
  readonly difficulty?: Difficulty;
  readonly enemies?: readonly CombatEnemySeed[];
  readonly autoSpawn?: boolean;
  readonly bubble?: { readonly x: number; readonly lane: number };
  readonly frames: readonly CombatFrame[];
}

export type CombatEvent =
  | { readonly type: 'powerFired'; readonly powerIndex: number }
  | { readonly type: 'villainHit'; readonly villainHp: number }
  | { readonly type: 'heroHit'; readonly lives: number }
  | { readonly type: 'foodCollected'; readonly charges: number }
  | { readonly type: 'score'; readonly score: number }
  | { readonly type: 'win' }
  | { readonly type: 'over' }
  | { readonly type: 'bubbleSpawned' }
  | { readonly type: 'projectileSpawned'; readonly lane: number; readonly kind: ProjectileKind }
  | { readonly type: 'villainBurst'; readonly count: number; readonly lane: number }
  | { readonly type: 'powerChargeGranted'; readonly charges: number }
  | { readonly type: 'powerCleared'; readonly score: number }
  | { readonly type: 'spawnSkipped' };

export interface CombatSnapshot {
  readonly screen: CombatSimulationScreen;
  readonly score: number;
  readonly villainHp: number;
  readonly charges: number;
  readonly lives: number;
  readonly activeEnemies: number;
  readonly activeShots: number;
}

export interface CombatResult {
  readonly events: readonly CombatEvent[];
  readonly snapshot: CombatSnapshot;
}

interface EnemySlot {
  active: boolean;
  x: number;
  lane: number;
  kind: ProjectileKind;
  resistant: boolean;
}

interface ShotSlot {
  active: boolean;
  x: number;
  y: number;
  lane: number;
  powerIndex: number;
}

const clampLane = (lane: number): number =>
  Math.max(0, Math.min(GAME_CONSTANTS.LANE_COUNT - 1, lane));

export const runCombatScenario = (scenario: CombatScenario): CombatResult => {
  const enemies: EnemySlot[] = Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    lane: 0,
    kind: PROJECTILE_KIND.lolli,
    resistant: false,
  }));
  const shots: ShotSlot[] = Array.from({ length: GAME_CONSTANTS.POWER_SHOT_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    lane: 0,
    powerIndex: 0,
  }));
  const events: CombatEvent[] = [];
  let rngState = scenario.seed >>> 0;
  let score = scenario.score ?? 0;
  let villainHp = scenario.villainHp ?? GAME_CONSTANTS.VILLAIN_HP;
  let charges = Math.max(0, Math.min(GAME_CONSTANTS.POWER_MAX_CHARGES, scenario.charges ?? 0));
  let lives = scenario.lives ?? 3;
  let screen: CombatSimulationScreen = 'game';
  let elapsedMs = 0;
  let powerIndex = 0;
  let spawnAccumulatorMs = 0;
  let powerUntilScore = -1;
  let milestonesHandled = Math.floor(score / GAME_CONSTANTS.MILESTONE_SCORE_STEP);
  const difficulty = difficultyConfigAt(scenario.difficulty ?? 'facil');

  for (let index = 0; index < (scenario.enemies?.length ?? 0); index += 1) {
    const seed = scenario.enemies?.[index];
    if (!seed) continue;
    enemies[index].active = true;
    enemies[index].x = seed.x;
    enemies[index].lane = clampLane(seed.lane);
    enemies[index].kind = seed.kind;
    enemies[index].resistant = seed.resistant === true;
  }

  let bubbleActive = scenario.bubble !== undefined;
  let bubbleX = scenario.bubble?.x ?? 0;
  let bubbleLane = clampLane(scenario.bubble?.lane ?? 0);
  let bubblePending = 0;
  let bubbleThreshold =
    (Math.floor(score / GAME_CONSTANTS.BUBBLE_EVERY) + 1) * GAME_CONSTANTS.BUBBLE_EVERY;
  let invulnerableUntilMs = 0;

  for (let frameIndex = 0; frameIndex < scenario.frames.length; frameIndex += 1) {
    if (screen !== 'game') break;

    const frame = scenario.frames[frameIndex];
    const dtMs = Math.max(0, Math.min(GAME_CONSTANTS.MAX_FRAME_DELTA_MS, frame.dtMs));
    const lane = clampLane(frame.lane ?? 1);

    if (frame.fire && charges > 0) {
      let shotSlot = -1;
      for (let shotIndex = 0; shotIndex < shots.length; shotIndex += 1) {
        if (!shots[shotIndex].active) {
          shotSlot = shotIndex;
          break;
        }
      }
      if (shotSlot >= 0) {
        charges -= 1;
        powerUntilScore = score + GAME_CONSTANTS.POWER_MODE_SCORE_DURATION;
        shots[shotSlot].active = true;
        shots[shotSlot].x = HERO_X + GAME_CONSTANTS.HERO_WIDTH;
        shots[shotSlot].y = lane * LANE_HEIGHT + (LANE_HEIGHT - GAME_CONSTANTS.HERO_HEIGHT) / 2;
        shots[shotSlot].lane = lane;
        shots[shotSlot].powerIndex = powerIndex;
        events.push({ type: 'powerFired', powerIndex });
        powerIndex = (powerIndex + 1) % 3;
      } else {
        events.push({ type: 'spawnSkipped' });
      }
    }

    elapsedMs += dtMs;
    const speed = difficulty.speed + Math.min(280, elapsedMs * difficulty.acceleration);

    for (let shotIndex = 0; shotIndex < shots.length; shotIndex += 1) {
      const shot = shots[shotIndex];
      if (!shot.active) continue;
      shot.x += (GAME_CONSTANTS.POWER_SHOT_SPEED * dtMs) / 1000;
      shot.y = trackShotY(
        shot.y,
        villainYAt(elapsedMs, SIMULATION_HEIGHT, GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT) +
          (GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT - GAME_CONSTANTS.HERO_HEIGHT) / 2,
        dtMs,
        220
      );
      if (shot.x >= VILLAIN_X) {
        shot.active = false;
        villainHp = Math.max(0, villainHp - 1);
        events.push({ type: 'villainHit', villainHp });
        if (villainHp === 0) {
          screen = 'win';
          events.push({ type: 'win' });
          break;
        }
      }
    }

    if (screen !== 'game') break;

    for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
      const enemy = enemies[enemyIndex];
      if (!enemy.active) continue;
      enemy.x -= (speed * projectileSpeedMultiplier(enemy.kind) * dtMs) / 1000;
      const enemySize =
        enemy.kind === PROJECTILE_KIND.zumbi
          ? GAME_CONSTANTS.ZOMBIE_RENDER_SIZE
          : GAME_CONSTANTS.CANDY_SIZE * GAME_CONSTANTS.PROJECTILE_SIZE_MULTIPLIER;
      if (enemy.x + enemySize < GAME_CONSTANTS.ENEMY_DESPAWN_X) {
        enemy.active = false;
        score += GAME_CONSTANTS.SCORE_PER_DODGE;
        events.push({ type: 'score', score });
        while (score >= bubbleThreshold) {
          bubblePending += 1;
          bubbleThreshold += GAME_CONSTANTS.BUBBLE_EVERY;
        }
      } else if (score < powerUntilScore && !enemy.resistant && enemy.x < SIMULATION_WIDTH * 0.62) {
        enemy.active = false;
        score += GAME_CONSTANTS.SCORE_PER_DODGE;
        events.push({ type: 'powerCleared', score });
        while (score >= bubbleThreshold) {
          bubblePending += 1;
          bubbleThreshold += GAME_CONSTANTS.BUBBLE_EVERY;
        }
      } else if (
        elapsedMs >= invulnerableUntilMs &&
        enemy.lane === lane &&
        rectsOverlapX(enemy.x, enemy.x + enemySize, HERO_LEFT, HERO_RIGHT)
      ) {
        enemy.active = false;
        lives = Math.max(0, lives - 1);
        invulnerableUntilMs = elapsedMs + GAME_CONSTANTS.INVULN_DURATION;
        events.push({ type: 'heroHit', lives });
        if (lives === 0) {
          screen = 'over';
          events.push({ type: 'over' });
          break;
        }
      }
    }

    if (screen !== 'game') break;

    const milestoneCount = milestoneCountAt(score);
    while (milestonesHandled < milestoneCount) {
      milestonesHandled += 1;
      charges = powerChargeAfterPickup(charges);
      events.push({ type: 'powerChargeGranted', charges });
      const villainLane = clampLane(
        Math.floor(
          (villainYAt(elapsedMs, SIMULATION_HEIGHT, GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT) +
            GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2) /
            LANE_HEIGHT
        )
      );
      let burstCount = 0;
      for (let burstIndex = 0; burstIndex < GAME_CONSTANTS.VILLAIN_BURST_COUNT; burstIndex += 1) {
        let slot = -1;
        for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
          if (!enemies[enemyIndex].active) {
            slot = enemyIndex;
            break;
          }
        }
        if (slot < 0) break;
        const burst = enemies[slot];
        burst.active = true;
        burst.x = VILLAIN_X + burstIndex * 24;
        burst.lane = villainLane;
        burst.kind = PROJECTILE_KIND.zumbi;
        burst.resistant = true;
        burstCount += 1;
      }
      events.push({ type: 'villainBurst', count: burstCount, lane: villainLane });
    }

    if (!bubbleActive && bubblePending > 0) {
      bubblePending -= 1;
      bubbleActive = true;
      rngState = nextRngState(rngState);
      bubbleLane = Math.floor(rngUnit(rngState) * GAME_CONSTANTS.LANE_COUNT);
      bubbleX = SIMULATION_WIDTH + GAME_CONSTANTS.ENEMY_SPAWN_X_OFFSET;
      events.push({ type: 'bubbleSpawned' });
    }

    if (bubbleActive) {
      bubbleX -= (speed * 0.55 * dtMs) / 1000;
      if (
        bubbleLane === lane &&
        rectsOverlapX(
          bubbleX - GAME_CONSTANTS.BUBBLE_HITBOX_PADDING,
          bubbleX + GAME_CONSTANTS.BUBBLE_SIZE + GAME_CONSTANTS.BUBBLE_HITBOX_PADDING,
          HERO_LEFT,
          HERO_RIGHT
        )
      ) {
        bubbleActive = false;
        charges = powerChargeAfterPickup(charges);
        events.push({ type: 'foodCollected', charges });
      } else if (bubbleX + GAME_CONSTANTS.BUBBLE_SIZE < GAME_CONSTANTS.ENEMY_DESPAWN_X) {
        bubbleActive = false;
      }
    }

    if (scenario.enemies === undefined || scenario.autoSpawn === true) {
      spawnAccumulatorMs += dtMs;
      const spawnInterval = Math.max(400, difficulty.interval - elapsedMs * 0.003);
      if (spawnAccumulatorMs >= spawnInterval) {
        spawnAccumulatorMs -= spawnInterval;
        const phase = attackPhaseAt(score);
        let spawnCount = 1;
        rngState = nextRngState(rngState);
        if (rngUnit(rngState) < difficulty.doubleSpawnChance) {
          spawnCount = 2;
        }
        let primaryLane = 0;
        for (let spawnIndex = 0; spawnIndex < spawnCount; spawnIndex += 1) {
          let spawnSlot = -1;
          for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
            if (!enemies[enemyIndex].active) {
              spawnSlot = enemyIndex;
              break;
            }
          }
          if (spawnSlot < 0) {
            events.push({ type: 'spawnSkipped' });
            break;
          }
          rngState = nextRngState(rngState);
          const random01 = rngUnit(rngState);
          const spawnedEnemy = enemies[spawnSlot];
          spawnedEnemy.active = true;
          spawnedEnemy.x = SIMULATION_WIDTH + GAME_CONSTANTS.ENEMY_SPAWN_X_OFFSET;
          spawnedEnemy.lane =
            spawnIndex === 0
              ? clampLane(
                  Math.floor(
                    (villainYAt(
                      elapsedMs,
                      SIMULATION_HEIGHT,
                      GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT
                    ) +
                      GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2) /
                      LANE_HEIGHT
                  )
                )
              : (primaryLane + 1 + Math.floor(random01 * 2)) % GAME_CONSTANTS.LANE_COUNT;
          if (spawnIndex === 0) primaryLane = spawnedEnemy.lane;
          spawnedEnemy.kind = projectileKindAt(phase, random01);
          spawnedEnemy.resistant = false;
          events.push({
            type: 'projectileSpawned',
            lane: spawnedEnemy.lane,
            kind: spawnedEnemy.kind,
          });
        }
      }
    }
  }

  let activeEnemies = 0;
  let activeShots = 0;
  for (let index = 0; index < enemies.length; index += 1)
    activeEnemies += enemies[index].active ? 1 : 0;
  for (let index = 0; index < shots.length; index += 1) activeShots += shots[index].active ? 1 : 0;

  return {
    events,
    snapshot: { screen, score, villainHp, charges, lives, activeEnemies, activeShots },
  };
};
