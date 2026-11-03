import React, { useEffect, useMemo, useRef } from 'react';
import { Animated as RNAnimated, Pressable, Text, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useTheme } from '../theme';
import { useGameStore } from '../store/gameStore';
import { Foodie } from '../render/foodie/Foodie';
import { Heart } from './Heart';
import { makeStyles } from './Hud.styles';
import { START_LIVES } from '../types/game';
import { GAME_CONSTANTS } from '../types/constants';
import { difficultyConfigAt } from '../engine/combatMath';

interface HudProps {
  onFire: () => void;
  onExit: () => void;
  // Control hint stays up until the player's first move, then hides.
  showHint?: boolean;
}

/**
 * Discrete-state overlay drawn above the game Canvas. It owns its Zustand leaf
 * subscriptions, so combat updates do not re-render the Canvas subtree and no
 * per-frame shared values enter React.
 */
export const Hud = ({ onFire, onExit, showHint = true }: HudProps) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const who = useGameStore((s) => s.state.who);
  const lives = useGameStore((s) => s.state.lives);
  const score = useGameStore((s) => s.state.score);
  const charges = useGameStore((s) => s.state.charges);
  const villainHp = useGameStore((s) => s.state.villainHp);
  const difficulty = useGameStore((s) => s.state.difficulty);
  const toast = useGameStore((s) => s.state.toast);
  const toastId = useGameStore((s) => s.state.toastId);
  const clearToast = useGameStore((s) => s.actions.clearToast);
  const name = who === 'alface' ? 'Alface' : who === 'feijao' ? 'Feijão' : 'Arroz';
  const attackName = [
    'Pirulito Espiral',
    'Bala Veloz',
    'Rosquinha Voadora',
    'Brigadeiro Zumbi',
    'Chuva de Açúcar',
  ][
    Math.min(
      GAME_CONSTANTS.ATTACK_PHASE_MAX,
      Math.floor(score / GAME_CONSTANTS.ATTACK_PHASE_SCORE_STEP)
    )
  ];
  const pulse = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => clearToast(toastId), 1400);
    return () => clearTimeout(timeout);
  }, [clearToast, toast, toastId]);

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (charges <= 0) return;
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [charges, pulse]);

  const buttonScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Canvas style={styles.chipCanvas}>
            <Foodie who={who} size={40} />
          </Canvas>
          <Text style={styles.chipName}>{name}</Text>
          <View style={styles.heartsRow}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <Heart key={i} filled={i < lives} size={18} />
            ))}
          </View>
        </View>

        <View style={styles.rightCluster}>
          <View style={styles.villainHpRow}>
            <Text style={styles.villainHpLabel}>Barão</Text>
            <View style={styles.villainHpDots}>
              {Array.from({ length: GAME_CONSTANTS.VILLAIN_HP }, (_, i) => (
                <View
                  key={i}
                  style={[styles.villainHpDot, i < villainHp && styles.villainHpDotFull]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.attackName}>Ataque: {attackName}</Text>
          <Text style={styles.difficultyLabel}>{difficultyConfigAt(difficulty).label}</Text>
          <View style={styles.scoreSeal}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
          <Pressable
            onPress={onExit}
            style={styles.exitBtn}
            accessibilityRole="button"
            accessibilityLabel="Sair"
          >
            <Text style={styles.exitText}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.powerControl}>
        <RNAnimated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPressIn={onFire}
            disabled={charges <= 0}
            style={[styles.powerBtn, charges <= 0 && styles.powerBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={`Usar poder, ${charges} cargas`}
          >
            <Text style={styles.powerText}>PODER!</Text>
          </Pressable>
        </RNAnimated.View>
        <View style={styles.chargeRow}>
          {Array.from({ length: GAME_CONSTANTS.POWER_MAX_CHARGES }, (_, i) => (
            <View key={i} style={[styles.chargeDot, i < charges && styles.chargeDotFull]} />
          ))}
        </View>
      </View>

      {showHint && (
        <View style={styles.hintWrap} pointerEvents="none">
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              Deslize/toque para trocar de fileira · toque em PODER! para atacar · pegue a bolha
            </Text>
          </View>
        </View>
      )}

      {toast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>
              {toast === 'food-collected'
                ? 'Comida de verdade! +1 PODER'
                : typeof toast !== 'string' && toast.type === 'power-fired'
                  ? toast.name
                  : toast === 'milestone-power'
                    ? '⭐ PODER +1!'
                    : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default Hud;
