import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Oval,
  Rect,
  useFont,
  type SkFont,
  vec,
} from '@shopify/react-native-skia';
import {
  default as Animated,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useGameStore } from '../../store/gameStore';
import { useRunnerEngine } from '../../hooks/useRunnerEngine';
import { SwipeHandler } from '../../components/SwipeHandler';
import { Tablecloth } from '../../render/scenario/Tablecloth';
import { LaneDividers } from '../../render/scenario/LaneDividers';
import { Foodie } from '../../render/foodie/Foodie';
import { Candy } from '../../render/candies/Candy';
import { Zombie } from '../../render/candies/Zombie';
import { FoodBubble as FoodBubbleVisual } from '../../render/candies/FoodBubble';
import { PowerShot } from '../../render/candies/PowerShot';
import { Hud } from '../../hud/Hud';
import { GameOverModal } from '../game-over';
import { GAME_CONSTANTS } from '../../types/constants';
import { PROJECTILE_KIND } from '../../engine/combatMath';
import type { Who } from '../../types/game';
import theme from '../../theme/tokens';

const GAME_SCREEN_STYLES = StyleSheet.create({
  root: { flex: 1 },
  canvasContainer: { flex: 1 },
  canvas: { flex: 1 },
  loopReadout: { position: 'absolute', top: 6, left: 6 },
  loopText: { color: theme.colors.surface, fontSize: 11 },
  tauntBubble: {
    position: 'absolute',
    right: GAME_CONSTANTS.VILLAIN_RENDER_WIDTH - theme.space.sm,
    maxWidth: 220,
    paddingVertical: theme.space.sm,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: theme.colors.villainBorder,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  tauntText: { color: theme.colors.villain, fontFamily: theme.font.semibold },
});

const useKindOpacity = (active: SharedValue<number>, kind: SharedValue<number>, expected: number) =>
  useDerivedValue(() => (active.value === 1 && kind.value === expected ? 1 : 0));

const CandySlot = ({
  x,
  y,
  active,
  kind,
  spin,
  laughFont,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  kind: SharedValue<number>;
  spin: SharedValue<number>;
  laughFont: SkFont | null;
}) => {
  const lolliOpacity = useKindOpacity(active, kind, PROJECTILE_KIND.lolli);
  const candyOpacity = useKindOpacity(active, kind, PROJECTILE_KIND.candy);
  const donutOpacity = useKindOpacity(active, kind, PROJECTILE_KIND.donut);
  const zombieOpacity = useKindOpacity(active, kind, PROJECTILE_KIND.zumbi);
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const visualScale = useDerivedValue(() =>
    kind.value === PROJECTILE_KIND.zumbi
      ? GAME_CONSTANTS.ZOMBIE_RENDER_SIZE / GAME_CONSTANTS.ZOMBIE_RENDER_WIDTH
      : GAME_CONSTANTS.PROJECTILE_SIZE_MULTIPLIER
  );
  const visualTransform = useDerivedValue(() => [{ scale: visualScale.value }]);

  return (
    <Group transform={transform}>
      <Group transform={visualTransform}>
        <Group opacity={lolliOpacity}>
          <Candy type="lolli" spin={spin} />
        </Group>
        <Group opacity={candyOpacity}>
          <Candy type="candy" spin={spin} />
        </Group>
        <Group opacity={donutOpacity}>
          <Candy type="donut" spin={spin} />
        </Group>
        <Group opacity={zombieOpacity}>
          <Zombie laughFont={laughFont} />
        </Group>
      </Group>
    </Group>
  );
};

const PowerShotSlot = ({
  x,
  y,
  active,
  who,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  who: Who;
}) => {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  return (
    <Group transform={transform} opacity={active}>
      <PowerShot who={who} />
    </Group>
  );
};

const FoodBubbleSlot = ({
  x,
  y,
  active,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
}) => {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  return (
    <Group transform={transform} opacity={active}>
      <Group
        transform={[{ scale: GAME_CONSTANTS.BUBBLE_RENDER_SIZE / GAME_CONSTANTS.BUBBLE_SIZE }]}
      >
        <FoodBubbleVisual />
      </Group>
    </Group>
  );
};

const ConfettiBurstSlot = ({
  x,
  y,
  active,
  rotation,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  rotation: SharedValue<number>;
}) => {
  const transform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value },
    { rotate: rotation.value },
  ]);

  return (
    <Group transform={transform} opacity={active}>
      <Circle cx={0} cy={-16} r={5} color={theme.colors.candyPink} />
      <Circle cx={14} cy={-4} r={5} color={theme.colors.sprinkleYellow} />
      <Rect x={-20} y={-5} width={8} height={16} color={theme.colors.candyTeal} />
      <Rect x={-4} y={10} width={8} height={16} color={theme.colors.brand} />
      <Rect x={12} y={8} width={8} height={16} color={theme.colors.villain} />
    </Group>
  );
};

const GameCanvas = React.memo(
  ({
    engine,
    width,
    height,
    who,
    villainMood,
    villainAttacking,
    laughFont,
  }: {
    engine: ReturnType<typeof useRunnerEngine>;
    width: number;
    height: number;
    who: Who;
    villainMood: 'feliz' | 'bravo';
    villainAttacking: boolean;
    laughFont: SkFont | null;
  }) => {
    const villainAttackScale = useSharedValue(1);
    useEffect(() => {
      villainAttackScale.value = villainAttacking
        ? withSequence(
            withTiming(1.16, { duration: 180 }),
            withTiming(0.88, { duration: 220 }),
            withTiming(1, { duration: 300 })
          )
        : withTiming(1, { duration: 180 });
    }, [villainAttackScale, villainAttacking]);

    const villainShake = useSharedValue(0);
    useEffect(() => {
      villainShake.value =
        villainMood === 'bravo'
          ? withSequence(
              withTiming(-8, { duration: 75 }),
              withTiming(8, { duration: 75 }),
              withTiming(-8, { duration: 75 }),
              withTiming(8, { duration: 75 }),
              withTiming(-8, { duration: 75 }),
              withTiming(0, { duration: 75 })
            )
          : withTiming(0, { duration: 100 });
    }, [villainMood, villainShake]);

    const villainTransform = useDerivedValue(() => [
      { translateX: width - GAME_CONSTANTS.VILLAIN_RENDER_WIDTH },
      { translateY: engine.villainY.value },
    ]);
    const villainPresentationTransform = useDerivedValue(() => [
      { translateX: villainShake.value },
      { scale: villainAttackScale.value },
    ]);
    const heroTransform = useDerivedValue(() => [
      { translateX: engine.heroX },
      { translateY: engine.heroY.value },
    ]);

    return (
      <Canvas style={GAME_SCREEN_STYLES.canvas}>
        <Tablecloth width={width} height={height} scrollX={engine.scrollX} />
        <LaneDividers width={width} height={height} />

        <Group transform={villainTransform}>
          <Group
            origin={vec(
              GAME_CONSTANTS.VILLAIN_RENDER_WIDTH / 2,
              GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2
            )}
            transform={villainPresentationTransform}
          >
            <Circle
              cx={GAME_CONSTANTS.VILLAIN_RENDER_WIDTH / 2}
              cy={GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT / 2}
              r={102}
              color={theme.colors.villain}
              opacity={0.12}
            />
            <Foodie
              who="vilao"
              size={GAME_CONSTANTS.VILLAIN_RENDER_WIDTH}
              animated={false}
              mood={villainMood}
            />
          </Group>
        </Group>

        {Array.from({ length: engine.poolSize }, (_, index) => (
          <CandySlot
            key={index}
            x={engine.obstacleX[index]}
            y={engine.obstacleY[index]}
            active={engine.obstacleActive[index]}
            kind={engine.obstacleKind[index]}
            spin={engine.candySpin}
            laughFont={laughFont}
          />
        ))}

        {Array.from({ length: GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE }, (_, index) => (
          <ConfettiBurstSlot
            key={`burst-fx-${index}`}
            x={engine.burstFxX[index]}
            y={engine.burstFxY[index]}
            active={engine.burstFxActive[index]}
            rotation={engine.burstFxRotation[index]}
          />
        ))}

        {Array.from({ length: engine.shotPoolSize }, (_, index) => (
          <PowerShotSlot
            key={`shot-${index}`}
            x={engine.shotX[index]}
            y={engine.shotY[index]}
            active={engine.shotActive[index]}
            who={who}
          />
        ))}
        <FoodBubbleSlot x={engine.bubbleX} y={engine.bubbleY} active={engine.bubbleActive} />

        <Group transform={heroTransform} opacity={engine.heroOpacity}>
          <Oval
            x={8}
            y={GAME_CONSTANTS.HERO_HEIGHT - 14}
            width={GAME_CONSTANTS.HERO_WIDTH - 16}
            height={16}
            color={theme.colors.heroShadow}
          />
          <Foodie who={who} size={96} />
        </Group>
      </Canvas>
    );
  }
);
GameCanvas.displayName = 'GameCanvas';

const LoopReadout = () => {
  const fps = useGameStore((s) => s.state.fps);
  if (!__DEV__) return null;
  return (
    <View style={GAME_SCREEN_STYLES.loopReadout} pointerEvents="none">
      <RNText style={GAME_SCREEN_STYLES.loopText}>LOOP {fps}</RNText>
    </View>
  );
};

export const GameScreen = () => {
  const { width, height } = useWindowDimensions();
  const difficulty = useGameStore((s) => s.state.difficulty);
  const engine = useRunnerEngine(width, height, difficulty);
  const laughFont = useFont(Fredoka_700Bold, 14);
  const screen = useGameStore((s) => s.state.screen);
  const who = useGameStore((s) => s.state.who);
  const villainMood = useGameStore((s) => s.state.villainMood);
  const villainAttacking = useGameStore((s) => s.state.villainAttacking);
  const villainTaunt = useGameStore((s) => s.state.villainTaunt);
  const villainTalkDurationMs = useGameStore((s) => s.state.villainTalkDurationMs);
  const actions = useGameStore((s) => s.actions);
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    if (screen === 'game') {
      engine.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasMoved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen !== 'game' || villainMood !== 'bravo') return;
    const timeout = setTimeout(() => actions.clearVillainMood(), 1200);
    return () => clearTimeout(timeout);
  }, [actions, screen, villainMood]);

  useEffect(() => {
    if (!villainAttacking) return;
    const timeout = setTimeout(() => actions.clearVillainBurst(), 1050);
    return () => clearTimeout(timeout);
  }, [actions, villainAttacking]);

  useEffect(() => {
    if (screen !== 'game') return;
    const timeout = setTimeout(() => actions.showVillainTaunt(), 800);
    return () => clearTimeout(timeout);
  }, [actions, screen]);

  useEffect(() => {
    if (!villainTaunt || villainTalkDurationMs <= 0) return;
    const timeout = setTimeout(() => actions.clearVillainTaunt(), villainTalkDurationMs);
    return () => clearTimeout(timeout);
  }, [actions, villainTalkDurationMs, villainTaunt]);

  const tauntStyle = useAnimatedStyle(() => ({ top: engine.villainY.value - 6 }));

  const handleMoveLane = useCallback(
    (direction: -1 | 1) => {
      setHasMoved(true);
      engine.moveLane(direction);
    },
    [engine]
  );

  return (
    <View style={GAME_SCREEN_STYLES.root}>
      <SwipeHandler onMoveLane={handleMoveLane}>
        <View style={GAME_SCREEN_STYLES.canvasContainer}>
          <GameCanvas
            engine={engine}
            width={width}
            height={height}
            who={who}
            villainMood={villainMood}
            villainAttacking={villainAttacking}
            laughFont={laughFont}
          />
        </View>
      </SwipeHandler>

      <Hud onFire={engine.firePower} onExit={actions.toSelect} showHint={!hasMoved} />

      {villainTaunt ? (
        <Animated.View pointerEvents="none" style={[GAME_SCREEN_STYLES.tauntBubble, tauntStyle]}>
          <RNText style={GAME_SCREEN_STYLES.tauntText}>{villainTaunt}</RNText>
        </Animated.View>
      ) : null}

      {(screen === 'over' || screen === 'win') && <GameOverModal />}

      <LoopReadout />
    </View>
  );
};

export default GameScreen;
