import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import {
  makeMutable,
  withTiming,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { useGameStore } from '../store/gameStore';
import { GAME_CONSTANTS } from '../types/constants';
import {
  attackPhaseAt,
  nextRngState,
  projectileKindAt,
  projectileSpeedMultiplier,
  PROJECTILE_KIND,
  type ProjectileKind,
  rngUnit,
  villainYAt,
} from '../engine/combatMath';
import { candySpeedAt, laneTopY, rectsOverlapX, spawnIntervalAt } from '../engine/math';
import { useSpin } from '../render/anim';

const LANE_COUNT = GAME_CONSTANTS.LANE_COUNT;
const FLICKER_BLINKS = 4;

export interface RunnerEngine {
  heroX: number;
  heroY: SharedValue<number>;
  heroOpacity: SharedValue<number>;
  obstacleX: SharedValue<number>[];
  obstacleY: SharedValue<number>[];
  obstacleLane: SharedValue<number>[];
  obstacleKind: SharedValue<number>[];
  obstacleActive: SharedValue<number>[];
  poolSize: number;
  shotX: SharedValue<number>[];
  shotY: SharedValue<number>[];
  shotActive: SharedValue<number>[];
  shotPoolSize: number;
  bubbleX: SharedValue<number>;
  bubbleY: SharedValue<number>;
  bubbleLane: SharedValue<number>;
  bubbleActive: SharedValue<number>;
  villainY: SharedValue<number>;
  charges: SharedValue<number>;
  candySpin: SharedValue<number>;
  scrollX: SharedValue<number>;
  moveLane: (direction: -1 | 1) => void;
  firePower: () => void;
  reset: () => void;
}

/** v0.0.2 combat loop: positions and authorization stay on the UI thread. */
export const useRunnerEngine = (screenWidth: number, screenHeight: number): RunnerEngine => {
  const laneHeight = screenHeight / LANE_COUNT;
  const heroX = screenWidth * GAME_CONSTANTS.HERO_X_RATIO;
  const heroTopY = useCallback(
    (lane: number) => laneTopY(lane, laneHeight, GAME_CONSTANTS.HERO_HEIGHT),
    [laneHeight]
  );

  const heroLane = useMemo(() => makeMutable(1), []);
  const heroY = useMemo(() => makeMutable(heroTopY(1)), [heroTopY]);
  const heroOpacity = useMemo(() => makeMutable(1), []);
  const invulnUntil = useMemo(() => makeMutable(0), []);
  const elapsedTime = useMemo(() => makeMutable(0), []);
  const lastUpdateTime = useMemo(() => makeMutable(0), []);
  const scrollX = useMemo(() => makeMutable(0), []);
  const appPaused = useMemo(() => makeMutable(0), []);
  const frozen = useMemo(() => makeMutable(0), []);
  const livesMirror = useMemo(() => makeMutable(useGameStore.getState().state.lives), []);
  const villainHpMirror = useMemo(() => makeMutable(useGameStore.getState().state.villainHp), []);
  const scoreMirror = useMemo(() => makeMutable(useGameStore.getState().state.score), []);
  const charges = useMemo(() => makeMutable(useGameStore.getState().state.charges), []);
  const powerIndex = useMemo(() => makeMutable(0), []);
  const rngState = useMemo(() => makeMutable(0xf00df1), []);

  const obstacleX = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () => makeMutable(-100)),
    []
  );
  const obstacleY = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const obstacleLane = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const obstacleKind = useMemo<SharedValue<number>[]>(
    () =>
      Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () =>
        makeMutable<number>(PROJECTILE_KIND.lolli)
      ),
    []
  );
  const obstacleActive = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const shotX = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.POWER_SHOT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const shotY = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.POWER_SHOT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const shotActive = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.POWER_SHOT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const bubbleX = useMemo(() => makeMutable(-GAME_CONSTANTS.BUBBLE_SIZE), []);
  const bubbleY = useMemo(() => makeMutable(0), []);
  const bubbleLane = useMemo(() => makeMutable(0), []);
  const bubbleActive = useMemo(() => makeMutable(0), []);
  const villainY = useMemo(() => makeMutable(villainYAt(0, screenHeight)), [screenHeight]);
  const candySpin = useSpin(900);
  const spawnAccum = useMemo(() => makeMutable(GAME_CONSTANTS.SPAWN_INTERVAL), []);
  const bubblePending = useMemo(() => makeMutable(0), []);
  const bubbleThreshold = useMemo(() => makeMutable(GAME_CONSTANTS.BUBBLE_EVERY), []);
  const fpsAccum = useMemo(() => makeMutable(0), []);
  const fpsFrames = useMemo(() => makeMutable(0), []);

  const applyHeroHit = useCallback(() => {
    useGameStore.getState().actions.hitHero();
  }, []);
  const applyVillainHit = useCallback(() => {
    useGameStore.getState().actions.applyVillainHit();
  }, []);
  const applyPowerFired = useCallback((acceptedPowerIndex: number) => {
    useGameStore.getState().actions.applyPowerFired(acceptedPowerIndex);
  }, []);
  const applyFoodCollected = useCallback(() => {
    useGameStore.getState().actions.collectFood();
  }, []);
  const applyFps = useCallback((fps: number) => {
    useGameStore.getState().actions.updateFps(fps);
  }, []);
  const applyScore = useCallback((points: number) => {
    useGameStore.getState().actions.incrementScore(points);
  }, []);

  const storeScreen = useGameStore((s) => s.state.screen);
  useEffect(() => {
    frozen.value = storeScreen === 'game' ? 0 : 1;
  }, [frozen, storeScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      appPaused.value = next === 'active' ? 0 : 1;
      lastUpdateTime.value = 0;
    });
    return () => subscription.remove();
  }, [appPaused, lastUpdateTime]);

  const moveLane = useCallback(
    (direction: -1 | 1) => {
      if (frozen.value === 1) return;
      const next = Math.min(LANE_COUNT - 1, Math.max(0, heroLane.value + direction));
      if (next === heroLane.value) return;
      heroLane.value = next;
      heroY.value = withTiming(heroTopY(next), {
        duration: GAME_CONSTANTS.HERO_LANE_TRANSITION_DURATION,
      });
    },
    [frozen, heroLane, heroTopY, heroY]
  );

  const firePower = useCallback(() => {
    if (frozen.value === 1) return;
    scheduleOnUI(() => {
      'worklet';
      if (frozen.value === 1 || charges.value <= 0) return;
      let slot = -1;
      for (let index = 0; index < GAME_CONSTANTS.POWER_SHOT_POOL_SIZE; index += 1) {
        if (shotActive[index].value === 0) {
          slot = index;
          break;
        }
      }
      if (slot < 0) return;
      const acceptedPowerIndex = powerIndex.value;
      charges.value -= 1;
      powerIndex.value = (powerIndex.value + 1) % 3;
      shotX[slot].value = heroX + GAME_CONSTANTS.HERO_WIDTH;
      shotY[slot].value =
        heroLane.value * laneHeight + (laneHeight - GAME_CONSTANTS.HERO_HEIGHT) / 2;
      shotActive[slot].value = 1;
      scheduleOnRN(applyPowerFired, acceptedPowerIndex);
    });
  }, [
    applyPowerFired,
    charges,
    frozen,
    heroLane,
    heroX,
    laneHeight,
    powerIndex,
    shotActive,
    shotX,
    shotY,
  ]);

  const reset = useCallback(() => {
    frozen.value = 0;
    heroLane.value = 1;
    heroY.value = heroTopY(1);
    heroOpacity.value = 1;
    invulnUntil.value = 0;
    elapsedTime.value = 0;
    lastUpdateTime.value = 0;
    scrollX.value = 0;
    spawnAccum.value = GAME_CONSTANTS.SPAWN_INTERVAL;
    bubblePending.value = 0;
    bubbleThreshold.value = GAME_CONSTANTS.BUBBLE_EVERY;
    const state = useGameStore.getState().state;
    livesMirror.value = state.lives;
    villainHpMirror.value = state.villainHp;
    scoreMirror.value = state.score;
    charges.value = state.charges;
    powerIndex.value = 0;
    bubbleActive.value = 0;
    bubbleLane.value = 1;
    villainY.value = villainYAt(0, screenHeight);
    for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
      obstacleActive[index].value = 0;
      obstacleX[index].value = GAME_CONSTANTS.ENEMY_DESPAWN_X;
    }
    for (let index = 0; index < GAME_CONSTANTS.POWER_SHOT_POOL_SIZE; index += 1) {
      shotActive[index].value = 0;
    }
  }, [
    bubbleActive,
    bubbleLane,
    bubblePending,
    bubbleThreshold,
    charges,
    elapsedTime,
    frozen,
    heroLane,
    heroOpacity,
    heroTopY,
    heroY,
    invulnUntil,
    lastUpdateTime,
    livesMirror,
    obstacleActive,
    obstacleX,
    powerIndex,
    scoreMirror,
    screenHeight,
    scrollX,
    shotActive,
    spawnAccum,
    villainHpMirror,
    villainY,
  ]);

  useEffect(() => {
    heroY.value = heroTopY(heroLane.value);
    villainY.value = villainYAt(0, screenHeight);
    for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
      obstacleActive[index].value = 0;
    }
  }, [heroLane, heroTopY, heroY, obstacleActive, screenHeight, villainY]);

  useFrameCallback((frame) => {
    'worklet';
    const timestamp = frame.timestamp;
    if (appPaused.value === 1) {
      lastUpdateTime.value = timestamp;
      return;
    }
    if (frame.timeSincePreviousFrame === null || lastUpdateTime.value === 0) {
      lastUpdateTime.value = timestamp;
    }
    const elapsed = timestamp - lastUpdateTime.value;
    if (elapsed < 16 && frame.timeSincePreviousFrame !== null) return;
    const rawDtMs = elapsed > 0 ? elapsed : GAME_CONSTANTS.FRAME_TIME_MS;
    const dtMs = Math.min(rawDtMs, GAME_CONSTANTS.MAX_FRAME_DELTA_MS);
    lastUpdateTime.value = timestamp;
    elapsedTime.value += dtMs;
    const now = elapsedTime.value;

    fpsFrames.value += 1;
    fpsAccum.value += rawDtMs;
    if (fpsAccum.value >= 1000) {
      scheduleOnRN(applyFps, Math.round((fpsFrames.value * 1000) / fpsAccum.value));
      fpsFrames.value = 0;
      fpsAccum.value = 0;
    }
    villainY.value = villainYAt(now, screenHeight);
    if (frozen.value === 1) return;

    const dt = dtMs / 1000;
    scrollX.value = -((now / 900) % 1) * 88;
    const speed = candySpeedAt(
      now,
      GAME_CONSTANTS.CANDY_BASE_SPEED,
      GAME_CONSTANTS.CANDY_SPEED_RAMP_MAX,
      GAME_CONSTANTS.CANDY_SPEED_RAMP_RATE
    );
    const interval = spawnIntervalAt(
      now,
      GAME_CONSTANTS.SPAWN_INTERVAL,
      GAME_CONSTANTS.SPAWN_INTERVAL_MIN,
      GAME_CONSTANTS.SPAWN_INTERVAL_RAMP_RATE
    );

    spawnAccum.value += dtMs;
    if (spawnAccum.value >= interval) {
      spawnAccum.value -= interval;
      let slot = -1;
      for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
        if (obstacleActive[index].value === 0) {
          slot = index;
          break;
        }
      }
      const phase = attackPhaseAt(scoreMirror.value);
      let spawnCount = 1;
      if (phase === GAME_CONSTANTS.ATTACK_PHASE_MAX) {
        rngState.value = nextRngState(rngState.value);
        spawnCount = rngUnit(rngState.value) < 0.5 ? 2 : 1;
      }
      let primaryLane = 0;
      for (let spawnIndex = 0; spawnIndex < spawnCount; spawnIndex += 1) {
        slot = -1;
        for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
          if (obstacleActive[index].value === 0) {
            slot = index;
            break;
          }
        }
        if (slot < 0) break;
        rngState.value = nextRngState(rngState.value);
        const random01 = rngUnit(rngState.value);
        const kind = projectileKindAt(phase, random01);
        const lane =
          spawnIndex === 0
            ? Math.floor(random01 * LANE_COUNT)
            : (primaryLane + 1 + Math.floor(random01 * 2)) % LANE_COUNT;
        if (spawnIndex === 0) primaryLane = lane;
        obstacleKind[slot].value = kind;
        obstacleLane[slot].value = lane;
        obstacleX[slot].value = screenWidth + GAME_CONSTANTS.ENEMY_SPAWN_X_OFFSET;
        obstacleY[slot].value = laneTopY(
          lane,
          laneHeight,
          kind === PROJECTILE_KIND.zumbi ? GAME_CONSTANTS.ZOMBIE_SIZE : GAME_CONSTANTS.CANDY_SIZE
        );
        obstacleActive[slot].value = 1;
      }
    }

    const heroLeft = heroX + GAME_CONSTANTS.HERO_HITBOX_PADDING;
    const heroRight = heroX + GAME_CONSTANTS.HERO_WIDTH - GAME_CONSTANTS.HERO_HITBOX_PADDING;
    const canBeHit = now >= invulnUntil.value;
    for (let index = 0; index < GAME_CONSTANTS.POWER_SHOT_POOL_SIZE; index += 1) {
      if (shotActive[index].value === 0) continue;
      shotX[index].value += GAME_CONSTANTS.POWER_SHOT_SPEED * dt;
      if (shotX[index].value >= screenWidth - 100) {
        shotActive[index].value = 0;
        villainHpMirror.value = Math.max(0, villainHpMirror.value - 1);
        scheduleOnRN(applyVillainHit);
        if (villainHpMirror.value === 0) {
          frozen.value = 1;
          break;
        }
      }
    }
    if (frozen.value === 1) return;

    for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
      if (obstacleActive[index].value === 0) continue;
      const kind = obstacleKind[index].value;
      const size =
        kind === PROJECTILE_KIND.zumbi ? GAME_CONSTANTS.ZOMBIE_SIZE : GAME_CONSTANTS.CANDY_SIZE;
      obstacleX[index].value -= speed * projectileSpeedMultiplier(kind as ProjectileKind) * dt;
      const x = obstacleX[index].value;
      if (x + size < GAME_CONSTANTS.ENEMY_DESPAWN_X) {
        obstacleActive[index].value = 0;
        scoreMirror.value += GAME_CONSTANTS.SCORE_PER_DODGE;
        scheduleOnRN(applyScore, GAME_CONSTANTS.SCORE_PER_DODGE);
        while (scoreMirror.value >= bubbleThreshold.value) {
          bubblePending.value += 1;
          bubbleThreshold.value += GAME_CONSTANTS.BUBBLE_EVERY;
        }
        continue;
      }
      if (
        canBeHit &&
        obstacleLane[index].value === heroLane.value &&
        rectsOverlapX(heroLeft, heroRight, x, x + size)
      ) {
        obstacleActive[index].value = 0;
        invulnUntil.value = now + GAME_CONSTANTS.INVULN_DURATION;
        livesMirror.value = Math.max(0, livesMirror.value - 1);
        scheduleOnRN(applyHeroHit);
        if (livesMirror.value === 0) {
          frozen.value = 1;
          break;
        }
      }
    }
    if (frozen.value === 1) return;

    if (bubbleActive.value === 0 && bubblePending.value > 0) {
      bubblePending.value -= 1;
      bubbleActive.value = 1;
      rngState.value = nextRngState(rngState.value);
      bubbleLane.value = Math.floor(rngUnit(rngState.value) * LANE_COUNT);
      bubbleX.value = screenWidth + GAME_CONSTANTS.ENEMY_SPAWN_X_OFFSET;
      bubbleY.value = laneTopY(bubbleLane.value, laneHeight, GAME_CONSTANTS.BUBBLE_SIZE);
    }
    if (bubbleActive.value === 1) {
      bubbleX.value -= speed * 0.55 * dt;
      if (
        bubbleLane.value === heroLane.value &&
        rectsOverlapX(
          heroLeft,
          heroRight,
          bubbleX.value - GAME_CONSTANTS.BUBBLE_HITBOX_PADDING,
          bubbleX.value + GAME_CONSTANTS.BUBBLE_SIZE + GAME_CONSTANTS.BUBBLE_HITBOX_PADDING
        )
      ) {
        bubbleActive.value = 0;
        scheduleOnRN(applyFoodCollected);
      } else if (bubbleX.value + GAME_CONSTANTS.BUBBLE_SIZE < GAME_CONSTANTS.ENEMY_DESPAWN_X) {
        bubbleActive.value = 0;
      }
    }

    if (now < invulnUntil.value) {
      const half = GAME_CONSTANTS.INVULN_DURATION / (FLICKER_BLINKS * 2);
      const phase = Math.floor((invulnUntil.value - now) / half) % 2;
      heroOpacity.value = phase === 0 ? 1 : 0.3;
    } else {
      heroOpacity.value = 1;
    }
  });

  return {
    heroX,
    heroY,
    heroOpacity,
    obstacleX,
    obstacleY,
    obstacleLane,
    obstacleKind,
    obstacleActive,
    poolSize: GAME_CONSTANTS.ENEMY_POOL_SIZE,
    shotX,
    shotY,
    shotActive,
    shotPoolSize: GAME_CONSTANTS.POWER_SHOT_POOL_SIZE,
    bubbleX,
    bubbleY,
    bubbleLane,
    bubbleActive,
    villainY,
    charges,
    candySpin,
    scrollX,
    moveLane,
    firePower,
    reset,
  };
};
