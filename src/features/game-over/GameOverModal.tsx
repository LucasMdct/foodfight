import React, { useEffect, useMemo, useRef } from 'react';
import { Animated as RNAnimated, Pressable, Text, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useTheme, useUiScale } from '../../theme';
import { useGameStore } from '../../store/gameStore';
import { Foodie } from '../../render/foodie/Foodie';
import { makeStyles } from './GameOverModal.styles';

const POP_DURATION_MS = 350;

export const GameOverModal = () => {
  const theme = useTheme();
  // Same fit-to-screen scaling as SelectScreen: the modal's vertical stack
  // (villain + title + stats + two buttons) overflows a landscape phone and
  // would clip the buttons, so scale it down to always fit.
  const scale = useUiScale();
  const styles = useMemo(() => makeStyles(theme, scale), [theme, scale]);
  const villainSize = Math.round(110 * scale);

  const score = useGameStore((s) => s.state.score);
  const best = useGameStore((s) => s.state.best);
  const actions = useGameStore((s) => s.actions);

  // Entrance animation matching the design's `ff-pop` keyframe: card scales up
  // from slightly-small while fading in.
  const pop = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    pop.setValue(0);
    RNAnimated.timing(pop, {
      toValue: 1,
      duration: POP_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [pop]);

  const cardScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  const playAgain = () => {
    actions.reset();
    actions.start();
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <RNAnimated.View style={[styles.card, { opacity: pop, transform: [{ scale: cardScale }] }]}>
        <Canvas style={styles.villainCanvas}>
          <Foodie who="vilao" size={villainSize} />
        </Canvas>

        <Text style={styles.title}>Doce demais!</Text>
        <Text style={styles.subtitle}>
          O Barão Brigadeiro venceu dessa vez…{'\n'}mas comida de verdade nunca desiste!
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Pontos</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Recorde</Text>
            <Text style={styles.statValue}>{best}</Text>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={playAgain}
            style={styles.playAgainBtn}
            accessibilityRole="button"
            accessibilityLabel="Jogar de novo"
          >
            <Text style={styles.playAgainText}>Jogar de novo</Text>
          </Pressable>
          <Pressable
            onPress={actions.toSelect}
            style={styles.switchHeroBtn}
            accessibilityRole="button"
            accessibilityLabel="Trocar herói"
          >
            <Text style={styles.switchHeroText}>Trocar herói</Text>
          </Pressable>
        </View>
      </RNAnimated.View>
    </View>
  );
};

export default GameOverModal;
