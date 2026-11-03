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
  const scale = useUiScale();
  const styles = useMemo(() => makeStyles(theme, scale), [theme, scale]);
  const villainSize = Math.round(110 * scale);
  const heroSize = Math.round(110 * scale);
  const score = useGameStore((s) => s.state.score);
  const best = useGameStore((s) => s.state.best);
  const who = useGameStore((s) => s.state.who);
  const screen = useGameStore((s) => s.state.screen);
  const actions = useGameStore((s) => s.actions);
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
  const won = screen === 'win';

  return (
    <View style={[styles.overlay, won && styles.overlayWin]} pointerEvents="auto">
      <RNAnimated.View style={[styles.card, { opacity: pop, transform: [{ scale: cardScale }] }]}>
        <Canvas style={styles.villainCanvas}>
          <Foodie
            who={won ? who : 'vilao'}
            size={won ? heroSize : villainSize}
            mood={won ? 'bravo' : 'feliz'}
          />
        </Canvas>
        <Text style={[styles.title, won && styles.titleWin]}>
          {won ? 'VOCÊ VENCEU!' : 'Doce demais!'}
        </Text>
        <Text style={styles.subtitle}>
          {won
            ? 'O Barão Brigadeiro caiu… comida de verdade venceu!'
            : 'O Barão Brigadeiro venceu dessa vez… mas comida de verdade nunca desiste!'}
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statBlock, won && styles.statBlockWin]}>
            <Text style={[styles.statLabel, won && styles.statLabelWin]}>Pontos</Text>
            <Text style={[styles.statValue, won && styles.statValueWin]}>{score}</Text>
          </View>
          <View style={[styles.statBlock, won && styles.statBlockWin]}>
            <Text style={[styles.statLabel, won && styles.statLabelWin]}>Recorde</Text>
            <Text style={[styles.statValue, won && styles.statValueWin]}>{best}</Text>
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
