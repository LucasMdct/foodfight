import React, { useCallback, useEffect, useState } from 'react';
import { Text as RNText, useWindowDimensions, View } from 'react-native';
import { Canvas, Circle, Group, Oval, useFont, type SkFont } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
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
import { Hud } from '../../hud/Hud';
import { GameOverModal } from '../game-over';
import { GAME_CONSTANTS } from '../../types/constants';
import { PROJECTILE_KIND } from '../../engine/combatMath';
import type { Who } from '../../types/game';
import theme from '../../theme/tokens';

const HERO_NAME: Record<Who, string> = {
  alface: 'Alface',
  feijao: 'Feijão',
  arroz: 'Arroz',
};

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

  return (
    <Group transform={transform}>
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
  );
};

const PowerShotSlot = ({
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
      <Circle cx={12} cy={48} r={9} color={theme.colors.score} />
      <Circle cx={12} cy={48} r={4} color={theme.colors.surface} />
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
      <FoodBubbleVisual />
    </Group>
  );
};

export const GameScreen = () => {
  const { width, height } = useWindowDimensions();
  const engine = useRunnerEngine(width, height);
  const laughFont = useFont(Fredoka_700Bold, 14);
  const screen = useGameStore((s) => s.state.screen);
  const who = useGameStore((s) => s.state.who);
  const lives = useGameStore((s) => s.state.lives);
  const score = useGameStore((s) => s.state.score);
  const charges = useGameStore((s) => s.state.charges);
  const villainHp = useGameStore((s) => s.state.villainHp);
  const villainMood = useGameStore((s) => s.state.villainMood);
  const toast = useGameStore((s) => s.state.toast);
  const toastId = useGameStore((s) => s.state.toastId);
  const fps = useGameStore((s) => s.state.fps);
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
    if (!toast) return;
    const timeout = setTimeout(() => actions.clearToast(toastId), 900);
    return () => clearTimeout(timeout);
  }, [actions, toast, toastId]);

  useEffect(() => {
    if (screen !== 'game' || villainMood !== 'bravo') return;
    const timeout = setTimeout(() => actions.clearVillainMood(), 1200);
    return () => clearTimeout(timeout);
  }, [actions, screen, villainMood]);

  const handleMoveLane = useCallback(
    (direction: -1 | 1) => {
      setHasMoved(true);
      engine.moveLane(direction);
    },
    [engine]
  );

  const villainTransform = useDerivedValue(() => [
    { translateX: width - 100 },
    { translateY: engine.villainY.value },
  ]);
  const heroTransform = useDerivedValue(() => [
    { translateX: engine.heroX },
    { translateY: engine.heroY.value },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <SwipeHandler onMoveLane={handleMoveLane}>
        <View style={{ flex: 1 }}>
          <Canvas style={{ flex: 1 }}>
            <Tablecloth width={width} height={height} scrollX={engine.scrollX} />
            <LaneDividers width={width} height={height} />

            <Group transform={villainTransform}>
              <Foodie who="vilao" size={132} animated={false} mood={villainMood} />
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

            {Array.from({ length: engine.shotPoolSize }, (_, index) => (
              <PowerShotSlot
                key={`shot-${index}`}
                x={engine.shotX[index]}
                y={engine.shotY[index]}
                active={engine.shotActive[index]}
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
        </View>
      </SwipeHandler>

      <Hud
        who={who}
        name={HERO_NAME[who]}
        lives={lives}
        score={score}
        charges={charges}
        villainHp={villainHp}
        toast={toast}
        onFire={engine.firePower}
        onExit={actions.toSelect}
        showHint={!hasMoved}
      />

      {(screen === 'over' || screen === 'win') && <GameOverModal />}

      {__DEV__ && (
        <View style={{ position: 'absolute', top: 6, left: 6 }} pointerEvents="none">
          <RNText style={{ color: theme.colors.surface, fontSize: 11 }}>LOOP {fps}</RNText>
        </View>
      )}
    </View>
  );
};

export default GameScreen;
