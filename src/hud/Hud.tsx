import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useTheme } from '../theme';
import { Foodie } from '../render/foodie/Foodie';
import { Heart } from './Heart';
import { makeStyles } from './Hud.styles';
import { START_LIVES, type GameToast, type Who } from '../types/game';
import { GAME_CONSTANTS } from '../types/constants';

interface HudProps {
  who: Who;
  name: string;
  lives: number;
  score: number;
  charges: number;
  villainHp: number;
  toast: GameToast;
  onFire: () => void;
  onExit: () => void;
  // Control hint stays up until the player's first move, then hides.
  showHint?: boolean;
}

/**
 * Discrete-state overlay drawn above the game Canvas. Reads `who`/`name`/
 * `lives`/`score` as plain props (the caller sources them from Zustand via a
 * regular, low-frequency subscription) — nothing here touches per-frame
 * shared values, so it re-renders only on hit/score/exit, never per frame.
 */
export const Hud = ({
  who,
  name,
  lives,
  score,
  charges,
  villainHp,
  toast,
  onFire,
  onExit,
  showHint = true,
}: HudProps) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
          <Text style={styles.villainHp}>
            Barão {villainHp}/{GAME_CONSTANTS.VILLAIN_HP}
          </Text>
          <View style={styles.scoreSeal}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
          <Pressable
            onPressIn={onFire}
            style={styles.powerBtn}
            accessibilityRole="button"
            accessibilityLabel={`Usar poder, ${charges} cargas`}
          >
            <Text style={styles.powerText}>PODER · {charges}</Text>
          </Pressable>
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

      {showHint && (
        <View style={styles.hintWrap} pointerEvents="none">
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              Deslize ou toque para cima/baixo para trocar de fileira
            </Text>
          </View>
        </View>
      )}

      {toast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>
              {toast === 'power-full' ? 'Poder cheio!' : '+1 poder'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default Hud;
