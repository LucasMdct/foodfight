import React, { useCallback, useEffect, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Canvas, Group, Oval } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { useRunnerEngine } from '../hooks/useRunnerEngine';
import { SwipeHandler } from '../components/SwipeHandler';
import { Tablecloth } from '../render/scenario/Tablecloth';
import { LaneDividers } from '../render/scenario/LaneDividers';
import { Foodie } from '../render/foodie/Foodie';
import { Candy, type CandyType } from '../render/candies/Candy';
import { useBob } from '../render/anim';
import { Hud } from '../hud/Hud';
import { GameOverModal } from './GameOverModal';
import { GAME_CONSTANTS } from '../types/constants';
import type { Who } from '../types/game';
import theme from '../theme/tokens';

// Candy type is fixed per pool-slot index (not tracked by the engine): slot i
// is always ['lolli','candy','donut'][i % 3], matching the mockup exactly and
// avoiding a shared value/re-render just to carry a constant per slot.
const CANDY_TYPES: CandyType[] = ['lolli', 'candy', 'donut'];
const HERO_NAME: Record<Who, string> = { alface: 'Alface', feijao: 'Feijão', arroz: 'Arroz' };

/** One candy slot: position/active are shared values, so this never re-renders. */
const CandySlot = ({
  x,
  y,
  active,
  spin,
  type,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  spin: SharedValue<number>;
  type: CandyType;
}) => {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  return (
    <Group transform={transform} opacity={active}>
      <Candy type={type} spin={spin} />
    </Group>
  );
};

export const GameScreen = () => {
  const { width, height } = useWindowDimensions();
  const engine = useRunnerEngine(width, height);

  // Discrete state only (screen, who, lives, score, fps) — safe to subscribe
  // to directly since these change at most a few times per second, never
  // per-frame. Per-frame values never flow through this store.
  const screen = useGameStore((s) => s.state.screen);
  const who = useGameStore((s) => s.state.who);
  const lives = useGameStore((s) => s.state.lives);
  const score = useGameStore((s) => s.state.score);
  const fps = useGameStore((s) => s.state.fps);
  const actions = useGameStore((s) => s.actions);

  // The control hint hides after the player's first lane change and reappears
  // on a fresh match. `hasMoved` is discrete (flips at most once per match), so
  // it never causes a per-frame re-render.
  const [hasMoved, setHasMoved] = useState(false);

  // GameScreen stays mounted across 'game' <-> 'over' (App.tsx renders it for
  // both), so a future "Play Again" re-enters 'game' without a remount.
  // Resetting on every transition into 'game' covers both the initial mount
  // and any later restart with one code path.
  useEffect(() => {
    if (screen === 'game') {
      engine.reset();
      // Reset-on-transition sits with the imperative engine reset, which must
      // live in the effect; suppressing here keeps both in one place.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasMoved(false);
    }
    // engine.reset is stable for the component's lifetime; only `screen` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Wrap the engine's lane move so the first interaction dismisses the hint.
  const handleMoveLane = useCallback(
    (direction: -1 | 1) => {
      setHasMoved(true);
      engine.moveLane(direction);
    },
    [engine]
  );

  const villainFloat = useBob(12, 900);
  const villainX = width - 100;
  const villainBaseY = height * 0.16;
  const villainTransform = useDerivedValue(() => [
    { translateX: villainX },
    { translateY: villainBaseY + villainFloat.value },
  ]);

  const heroTransform = useDerivedValue(() => [
    { translateX: engine.heroX },
    { translateY: engine.heroY.value },
  ]);

  return (
    <View style={{ flex: 1 }}>
      {/* Gestures cover the playfield only; HUD and modal buttons sit outside. */}
      <SwipeHandler onMoveLane={handleMoveLane}>
        <View style={{ flex: 1 }}>
          <Canvas style={{ flex: 1 }}>
            <Tablecloth width={width} height={height} scrollX={engine.scrollX} />
            <LaneDividers width={width} height={height} />

            <Group transform={villainTransform}>
              <Foodie who="vilao" size={132} />
            </Group>

            {Array.from({ length: engine.poolSize }, (_, i) => (
              <CandySlot
                key={i}
                x={engine.obstacleX[i]}
                y={engine.obstacleY[i]}
                active={engine.obstacleActive[i]}
                spin={engine.candySpin}
                type={CANDY_TYPES[i % 3]}
              />
            ))}

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
        </View>
      </SwipeHandler>

      <Hud
        who={who}
        name={HERO_NAME[who]}
        lives={lives}
        score={score}
        onExit={actions.toSelect}
        showHint={!hasMoved}
      />

      {screen === 'over' && <GameOverModal />}

      {__DEV__ && (
        <View style={{ position: 'absolute', top: 6, left: 6 }} pointerEvents="none">
          <Text style={{ color: theme.colors.surface, fontSize: 11 }}>LOOP {fps}</Text>
        </View>
      )}
    </View>
  );
};

export default GameScreen;
