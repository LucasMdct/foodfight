import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  difficultyAtIndex,
  difficultyConfigAt,
  difficultyIndexAt,
  nextRngState,
  powerChargeAfterPickup,
  projectileKindAt,
  projectileSpeedMultiplier,
  PROJECTILE_KIND,
  type ProjectileKind,
  rngUnit,
  trackShotY,
  villainYAt,
} from '../engine/combatMath';
import { laneTopY, rectsOverlapX } from '../engine/math';
import { useSpin } from '../render/anim';
import type { Difficulty } from '../types/game';

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
  burstFxX: SharedValue<number>[];
  burstFxY: SharedValue<number>[];
  burstFxActive: SharedValue<number>[];
  burstFxRotation: SharedValue<number>[];
  villainY: SharedValue<number>;
  charges: SharedValue<number>;
  candySpin: SharedValue<number>;
  scrollX: SharedValue<number>;
  moveLane: (direction: -1 | 1) => void;
  firePower: () => void;
  reset: () => void;
}

/** v0.0.4 combat loop: positions and authorization stay on the UI thread. */
export const useRunnerEngine = (
  screenWidth: number,
  screenHeight: number,
  difficulty: Difficulty
): RunnerEngine => {
  const laneHeight = screenHeight / LANE_COUNT;
  const heroX = screenWidth * GAME_CONSTANTS.HERO_X_RATIO;
  const heroTopY = useCallback(
    (lane: number) => laneTopY(lane, laneHeight, GAME_CONSTANTS.HERO_HEIGHT),
    [laneHeight]
  );

  const heroLane = useMemo(() => makeMutable(1), []);
  const heroY = useMemo(() => makeMutable(0), []);
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
  // This shared value must survive difficulty prop changes; the effect below mirrors updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const difficultyIndex = useMemo(() => makeMutable(difficultyIndexAt(difficulty)), []);

  const obstacleX = useMemo(
    () =>
      Array.from({ length: GAME_CONSTANTS.ENEMY_POOL_SIZE }, () =>
        makeMutable(GAME_CONSTANTS.ENEMY_DESPAWN_X)
      ),
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
  const obstacleScored = useMemo(
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
  const bubbleX = useMemo(() => makeMutable(-GAME_CONSTANTS.BUBBLE_RENDER_SIZE), []);
  const bubbleY = useMemo(() => makeMutable(0), []);
  const bubbleLane = useMemo(() => makeMutable(0), []);
  const bubbleActive = useMemo(() => makeMutable(0), []);
  const burstFxX = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const burstFxY = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const burstFxActive = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const burstFxRotation = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const burstFxUntil = useMemo(
    () => Array.from({ length: GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE }, () => makeMutable(0)),
    []
  );
  const villainY = useMemo(() => makeMutable(0), []);
  const candySpin = useSpin(900);
  const spawnAccum = useMemo(() => makeMutable(GAME_CONSTANTS.INITIAL_SPAWN_ACCUMULATOR_MS), []);
  const bubblePending = useMemo(() => makeMutable(0), []);
  const bubbleThreshold = useMemo(() => makeMutable(GAME_CONSTANTS.BUBBLE_EVERY), []);
  const nextMilestone = useMemo(() => makeMutable(GAME_CONSTANTS.MILESTONE_SCORE_STEP), []);
  const burstPending = useMemo(() => makeMutable(0), []);
  const burstLane = useMemo(() => makeMutable(1), []);
  const burstNextAt = useMemo(() => makeMutable(0), []);
  const burstDelayIndex = useMemo(() => makeMutable(0), []);
  const defeatActive = useMemo(() => makeMutable(0), []);
  const defeatStartedAt = useMemo(() => makeMutable(0), []);
  const defeatBurstIndex = useMemo(() => makeMutable(0), []);
  const matchGeneration = useMemo(() => makeMutable(0), []);
  const activeMatchGeneration = useRef(0);
  const fpsAccum = useMemo(() => makeMutable(0), []);
  const fpsFrames = useMemo(() => makeMutable(0), []);

  const applyHeroHit = useCallback((generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.hitHero();
  }, []);
  const applyVillainHit = useCallback((generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.applyVillainHit();
  }, []);
  const applyVillainDefeatStart = useCallback((generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.beginVillainDefeat();
  }, []);
  const applyVillainDefeatComplete = useCallback((generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.completeVillainDefeat();
  }, []);
  const applyPowerFired = useCallback((acceptedPowerIndex: number, generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.applyPowerFired(acceptedPowerIndex);
  }, []);
  const applyFoodCollected = useCallback((generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.collectFood();
  }, []);
  const applyVillainBurst = useCallback((generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.triggerVillainBurst();
  }, []);
  const applyFps = useCallback((fps: number, generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.updateFps(fps);
  }, []);
  const applyScore = useCallback((points: number, generation: number) => {
    if (generation !== activeMatchGeneration.current) return;
    useGameStore.getState().actions.incrementScore(points);
  }, []);

  const storeScreen = useGameStore((s) => s.state.screen);
  const storeVillainDying = useGameStore((s) => s.state.villainDying);
  useEffect(() => {
    frozen.value = storeScreen === 'game' && !storeVillainDying ? 0 : 1;
  }, [frozen, storeScreen, storeVillainDying]);

  useEffect(() => {
    difficultyIndex.value = difficultyIndexAt(difficulty);
  }, [difficulty, difficultyIndex]);

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
      scheduleOnRN(applyPowerFired, acceptedPowerIndex, matchGeneration.value);
      const now = elapsedTime.value;
      for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
        if (obstacleActive[index].value === 0) continue;
        const size =
          obstacleKind[index].value === PROJECTILE_KIND.zumbi
            ? GAME_CONSTANTS.ZOMBIE_RENDER_SIZE
            : GAME_CONSTANTS.CANDY_SIZE * GAME_CONSTANTS.PROJECTILE_SIZE_MULTIPLIER;
        const x = obstacleX[index].value;
        if (x > screenWidth + 10 || x + size <= 0) continue;
        // Mark score ownership before releasing the slot or bridging to React.
        if (obstacleScored[index].value === 0) {
          obstacleScored[index].value = 1;
          scoreMirror.value += GAME_CONSTANTS.SCORE_PER_DODGE;
          scheduleOnRN(applyScore, GAME_CONSTANTS.SCORE_PER_DODGE, matchGeneration.value);
        }
        obstacleActive[index].value = 0;
        let effectSlot = -1;
        for (
          let effectIndex = 0;
          effectIndex < GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE;
          effectIndex += 1
        ) {
          if (burstFxActive[effectIndex].value === 0 || now >= burstFxUntil[effectIndex].value) {
            effectSlot = effectIndex;
            break;
          }
        }
        if (effectSlot >= 0) {
          burstFxX[effectSlot].value = x + size / 2;
          burstFxY[effectSlot].value = obstacleY[index].value + size / 2;
          burstFxRotation[effectSlot].value = index * 0.8 + now * 0.001;
          burstFxUntil[effectSlot].value = now + GAME_CONSTANTS.BURST_EFFECT_DURATION_MS;
          burstFxActive[effectSlot].value = 1;
        }
      }
    });
  }, [
    applyPowerFired,
    applyScore,
    burstFxActive,
    burstFxRotation,
    burstFxUntil,
    burstFxX,
    burstFxY,
    charges,
    elapsedTime,
    frozen,
    heroLane,
    heroX,
    laneHeight,
    matchGeneration,
    powerIndex,
    obstacleActive,
    obstacleKind,
    obstacleScored,
    obstacleX,
    obstacleY,
    scoreMirror,
    screenWidth,
    shotActive,
    shotX,
    shotY,
  ]);

  const reset = useCallback(() => {
    activeMatchGeneration.current += 1;
    matchGeneration.value = activeMatchGeneration.current;
    frozen.value = 0;
    heroLane.value = 1;
    heroY.value = heroTopY(1);
    heroOpacity.value = 1;
    invulnUntil.value = 0;
    elapsedTime.value = 0;
    lastUpdateTime.value = 0;
    scrollX.value = 0;
    spawnAccum.value = GAME_CONSTANTS.INITIAL_SPAWN_ACCUMULATOR_MS;
    bubblePending.value = 0;
    bubbleThreshold.value = GAME_CONSTANTS.BUBBLE_EVERY;
    const state = useGameStore.getState().state;
    livesMirror.value = state.lives;
    villainHpMirror.value = state.villainHp;
    scoreMirror.value = state.score;
    charges.value = state.charges;
    powerIndex.value = 0;
    difficultyIndex.value = difficultyIndexAt(difficulty);
    nextMilestone.value = GAME_CONSTANTS.MILESTONE_SCORE_STEP;
    burstPending.value = 0;
    burstLane.value = 1;
    burstNextAt.value = 0;
    burstDelayIndex.value = 0;
    defeatActive.value = 0;
    defeatStartedAt.value = 0;
    defeatBurstIndex.value = 0;
    bubbleActive.value = 0;
    bubbleLane.value = 1;
    villainY.value = villainYAt(0, screenHeight, GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT);
    for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
      obstacleActive[index].value = 0;
      obstacleScored[index].value = 0;
      obstacleX[index].value = GAME_CONSTANTS.ENEMY_DESPAWN_X;
    }
    for (let index = 0; index < GAME_CONSTANTS.POWER_SHOT_POOL_SIZE; index += 1) {
      shotActive[index].value = 0;
    }
    for (let index = 0; index < GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE; index += 1) {
      burstFxActive[index].value = 0;
      burstFxUntil[index].value = 0;
    }
  }, [
    bubbleActive,
    bubbleLane,
    bubblePending,
    bubbleThreshold,
    charges,
    difficulty,
    difficultyIndex,
    elapsedTime,
    frozen,
    heroLane,
    heroOpacity,
    heroTopY,
    heroY,
    invulnUntil,
    lastUpdateTime,
    matchGeneration,
    livesMirror,
    obstacleActive,
    obstacleScored,
    obstacleX,
    powerIndex,
    nextMilestone,
    scoreMirror,
    screenHeight,
    scrollX,
    shotActive,
    spawnAccum,
    burstLane,
    burstDelayIndex,
    burstFxActive,
    burstFxUntil,
    burstNextAt,
    burstPending,
    defeatActive,
    defeatBurstIndex,
    defeatStartedAt,
    villainHpMirror,
    villainY,
  ]);

  useEffect(() => {
    heroY.value = heroTopY(heroLane.value);
    villainY.value = villainYAt(0, screenHeight, GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT);
    for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
      obstacleActive[index].value = 0;
      obstacleScored[index].value = 0;
    }
  }, [heroLane, heroTopY, heroY, obstacleActive, obstacleScored, screenHeight, villainY]);

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

    for (let index = 0; index < GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE; index += 1) {
      if (burstFxActive[index].value === 1) {
        if (now >= burstFxUntil[index].value) {
          burstFxActive[index].value = 0;
        } else {
          burstFxRotation[index].value += dtMs * 0.004;
        }
      }
    }

    if (defeatActive.value === 1) {
      const villainCenterY = villainY.value + GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2;
      while (
        defeatBurstIndex.value < GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_COUNT &&
        now >=
          defeatStartedAt.value +
            GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_START_MS +
            defeatBurstIndex.value * GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_INTERVAL_MS
      ) {
        const burstStep = defeatBurstIndex.value;
        defeatBurstIndex.value = burstStep + 1;
        rngState.value = nextRngState(rngState.value);
        const offsetX =
          (rngUnit(rngState.value) - 0.5) * GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_SPREAD_X;
        rngState.value = nextRngState(rngState.value);
        const offsetY =
          (rngUnit(rngState.value) - 0.5) * GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_SPREAD_Y;
        let effectSlot = -1;
        for (
          let effectIndex = 0;
          effectIndex < GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE;
          effectIndex += 1
        ) {
          if (burstFxActive[effectIndex].value === 0 || now >= burstFxUntil[effectIndex].value) {
            effectSlot = effectIndex;
            break;
          }
        }
        if (effectSlot >= 0) {
          burstFxX[effectSlot].value =
            screenWidth - GAME_CONSTANTS.VILLAIN_DEFEAT_BURST_X_OFFSET + offsetX;
          burstFxY[effectSlot].value = villainCenterY + offsetY;
          burstFxRotation[effectSlot].value = burstStep * 0.8 + now * 0.001;
          burstFxUntil[effectSlot].value = now + GAME_CONSTANTS.BURST_EFFECT_DURATION_MS;
          burstFxActive[effectSlot].value = 1;
        }
      }
      if (now >= defeatStartedAt.value + GAME_CONSTANTS.VILLAIN_DEFEAT_DURATION_MS) {
        defeatActive.value = 0;
        scheduleOnRN(applyVillainDefeatComplete, matchGeneration.value);
      }
    }

    fpsFrames.value += 1;
    fpsAccum.value += rawDtMs;
    if (fpsAccum.value >= 1000) {
      scheduleOnRN(
        applyFps,
        Math.round((fpsFrames.value * 1000) / fpsAccum.value),
        matchGeneration.value
      );
      fpsFrames.value = 0;
      fpsAccum.value = 0;
    }
    if (frozen.value === 1) return;
    villainY.value = villainYAt(now, screenHeight, GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT);

    const dt = dtMs / 1000;
    scrollX.value = -((now / 900) % 1) * 88;
    const difficultyConfig = difficultyConfigAt(difficultyAtIndex(difficultyIndex.value));
    const speed = difficultyConfig.speed;
    const interval = difficultyConfig.interval;
    const villainLane = Math.max(
      0,
      Math.min(
        LANE_COUNT - 1,
        Math.floor((villainY.value + GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2) / laneHeight)
      )
    );

    spawnAccum.value += dtMs;
    if (spawnAccum.value >= interval) {
      spawnAccum.value -= interval;
      const phase = attackPhaseAt(scoreMirror.value);
      let spawnCount = 1;
      rngState.value = nextRngState(rngState.value);
      if (rngUnit(rngState.value) < difficultyConfig.doubleSpawnChance) spawnCount = 2;
      let primaryLane = villainLane;
      for (let spawnIndex = 0; spawnIndex < spawnCount; spawnIndex += 1) {
        let slot = -1;
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
            ? villainLane
            : (primaryLane + 1 + Math.floor(random01 * 2)) % LANE_COUNT;
        if (spawnIndex === 0) primaryLane = lane;
        obstacleKind[slot].value = kind;
        obstacleLane[slot].value = lane;
        obstacleScored[slot].value = 0;
        obstacleX[slot].value = screenWidth - GAME_CONSTANTS.ENEMY_SPAWN_FROM_RIGHT;
        obstacleY[slot].value = laneTopY(
          lane,
          laneHeight,
          kind === PROJECTILE_KIND.zumbi
            ? GAME_CONSTANTS.ZOMBIE_RENDER_SIZE
            : GAME_CONSTANTS.CANDY_SIZE * GAME_CONSTANTS.PROJECTILE_SIZE_MULTIPLIER
        );
        obstacleActive[slot].value = 1;
      }
    }

    if (burstPending.value > 0 && now >= burstNextAt.value) {
      let slot = -1;
      for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
        if (obstacleActive[index].value === 0) {
          slot = index;
          break;
        }
      }
      burstPending.value -= 1;
      const currentDelayIndex = burstDelayIndex.value;
      const nextDelayIndex =
        (currentDelayIndex + 1) % GAME_CONSTANTS.VILLAIN_BURST_DELAYS_MS.length;
      burstDelayIndex.value = nextDelayIndex;
      const delayDelta =
        nextDelayIndex === 0
          ? GAME_CONSTANTS.VILLAIN_BURST_DELAYS_MS[0]
          : GAME_CONSTANTS.VILLAIN_BURST_DELAYS_MS[nextDelayIndex] -
            GAME_CONSTANTS.VILLAIN_BURST_DELAYS_MS[currentDelayIndex];
      burstNextAt.value = now + delayDelta;
      if (slot >= 0) {
        obstacleKind[slot].value = PROJECTILE_KIND.zumbi;
        obstacleLane[slot].value = burstLane.value;
        obstacleScored[slot].value = 0;
        obstacleX[slot].value = screenWidth - GAME_CONSTANTS.ENEMY_SPAWN_FROM_RIGHT;
        obstacleY[slot].value = laneTopY(
          burstLane.value,
          laneHeight,
          GAME_CONSTANTS.ZOMBIE_RENDER_SIZE
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
      shotY[index].value = trackShotY(
        shotY[index].value,
        villainY.value + (GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT - GAME_CONSTANTS.HERO_HEIGHT) / 2,
        dtMs,
        220
      );
      if (shotX[index].value >= screenWidth - GAME_CONSTANTS.VILLAIN_SHOT_HIT_X_OFFSET) {
        shotActive[index].value = 0;
        let effectSlot = -1;
        for (
          let effectIndex = 0;
          effectIndex < GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE;
          effectIndex += 1
        ) {
          if (burstFxActive[effectIndex].value === 0 || now >= burstFxUntil[effectIndex].value) {
            effectSlot = effectIndex;
            break;
          }
        }
        if (effectSlot >= 0) {
          burstFxX[effectSlot].value = screenWidth - GAME_CONSTANTS.VILLAIN_SHOT_EXPLOSION_X_OFFSET;
          burstFxY[effectSlot].value = villainY.value + GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2;
          burstFxRotation[effectSlot].value = index * 0.8 + now * 0.001;
          burstFxUntil[effectSlot].value = now + GAME_CONSTANTS.BURST_EFFECT_DURATION_MS;
          burstFxActive[effectSlot].value = 1;
        }
        villainHpMirror.value = Math.max(0, villainHpMirror.value - 1);
        if (villainHpMirror.value === 0) {
          frozen.value = 1;
          defeatActive.value = 1;
          defeatStartedAt.value = now;
          defeatBurstIndex.value = 0;
          scheduleOnRN(applyVillainDefeatStart, matchGeneration.value);
          break;
        }
        scheduleOnRN(applyVillainHit, matchGeneration.value);
      }
    }
    if (frozen.value === 1) return;

    for (let index = 0; index < GAME_CONSTANTS.ENEMY_POOL_SIZE; index += 1) {
      if (obstacleActive[index].value === 0) continue;
      const kind = obstacleKind[index].value;
      const size =
        kind === PROJECTILE_KIND.zumbi
          ? GAME_CONSTANTS.ZOMBIE_RENDER_SIZE
          : GAME_CONSTANTS.CANDY_SIZE * GAME_CONSTANTS.PROJECTILE_SIZE_MULTIPLIER;
      obstacleX[index].value -= speed * projectileSpeedMultiplier(kind as ProjectileKind) * dt;
      const x = obstacleX[index].value;
      if (x + size < GAME_CONSTANTS.ENEMY_DESPAWN_X) {
        if (obstacleScored[index].value === 0) {
          obstacleScored[index].value = 1;
          scoreMirror.value += GAME_CONSTANTS.SCORE_PER_DODGE;
          scheduleOnRN(applyScore, GAME_CONSTANTS.SCORE_PER_DODGE, matchGeneration.value);
        }
        obstacleActive[index].value = 0;
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
        scheduleOnRN(applyHeroHit, matchGeneration.value);
        if (livesMirror.value === 0) {
          frozen.value = 1;
          break;
        }
      }
    }
    if (frozen.value === 1) return;

    while (scoreMirror.value >= nextMilestone.value) {
      nextMilestone.value += GAME_CONSTANTS.MILESTONE_SCORE_STEP;
      burstPending.value += GAME_CONSTANTS.VILLAIN_BURST_COUNT;
      burstLane.value = villainLane;
      if (burstPending.value === GAME_CONSTANTS.VILLAIN_BURST_COUNT) {
        burstDelayIndex.value = 0;
        burstNextAt.value = now + GAME_CONSTANTS.VILLAIN_BURST_DELAYS_MS[0];
      }
      scheduleOnRN(applyVillainBurst, matchGeneration.value);
    }

    while (scoreMirror.value >= bubbleThreshold.value) {
      bubblePending.value += 1;
      bubbleThreshold.value += GAME_CONSTANTS.BUBBLE_EVERY;
    }
    if (bubbleActive.value === 0 && bubblePending.value > 0) {
      bubblePending.value -= 1;
      bubbleActive.value = 1;
      rngState.value = nextRngState(rngState.value);
      bubbleLane.value = Math.floor(rngUnit(rngState.value) * LANE_COUNT);
      bubbleX.value = screenWidth + GAME_CONSTANTS.ENEMY_SPAWN_X_OFFSET;
      bubbleY.value = laneTopY(bubbleLane.value, laneHeight, GAME_CONSTANTS.BUBBLE_RENDER_SIZE);
    }
    if (bubbleActive.value === 1) {
      bubbleX.value -= speed * 0.55 * dt;
      if (
        bubbleLane.value === heroLane.value &&
        rectsOverlapX(
          heroLeft,
          heroRight,
          bubbleX.value - GAME_CONSTANTS.BUBBLE_HITBOX_PADDING,
          bubbleX.value + GAME_CONSTANTS.BUBBLE_RENDER_SIZE + GAME_CONSTANTS.BUBBLE_HITBOX_PADDING
        )
      ) {
        bubbleActive.value = 0;
        charges.value = powerChargeAfterPickup(charges.value);
        scheduleOnRN(applyFoodCollected, matchGeneration.value);
      } else if (bubbleX.value < GAME_CONSTANTS.BUBBLE_DESPAWN_X) {
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

  return useMemo(
    () => ({
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
      burstFxX,
      burstFxY,
      burstFxActive,
      burstFxRotation,
      villainY,
      charges,
      candySpin,
      scrollX,
      moveLane,
      firePower,
      reset,
    }),
    [
      bubbleActive,
      bubbleLane,
      bubbleX,
      bubbleY,
      burstFxActive,
      burstFxRotation,
      burstFxX,
      burstFxY,
      candySpin,
      charges,
      firePower,
      heroX,
      heroOpacity,
      heroY,
      moveLane,
      obstacleActive,
      obstacleKind,
      obstacleLane,
      obstacleX,
      obstacleY,
      reset,
      scrollX,
      shotActive,
      shotX,
      shotY,
      villainY,
    ]
  );
};
