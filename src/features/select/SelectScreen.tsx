import React, { useEffect, useMemo, useRef } from 'react';
import { Animated as RNAnimated, Pressable, Text, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useUiScale } from '../../theme';
import { useGameStore } from '../../store/gameStore';
import { Foodie } from '../../render/foodie/Foodie';
import { Heart } from '../../hud/Heart';
import { makeStyles } from './SelectScreen.styles';
import type { Who } from '../../types/game';

// Character name colors are per-character identity (not UI/theme colors), same
// rationale as `src/render/foodie/palette.ts` — kept as documented local
// constants rather than theme tokens. Source: FoodFight v0.0.1.dc.html L43/53/63.
const CHARACTERS: { who: Who; name: string; tagline: string; nameColor: string }[] = [
  { who: 'alface', name: 'Alface', tagline: 'Levinho e rapidinho', nameColor: '#3E7D2E' },
  { who: 'feijao', name: 'Feijão', tagline: 'Forte e corajoso', nameColor: '#8A5A34' },
  { who: 'arroz', name: 'Arroz', tagline: 'Esperto e saltitante', nameColor: '#B39B62' },
];

const PULSE_DURATION_MS = 800;

export const SelectScreen = () => {
  const theme = useTheme();

  // Responsive scale: the full-size layout is ~560px tall, which overflows a
  // landscape phone (~360-430px) and pushes "JOGAR!" off-screen. Scale every
  // sizing metric by the viewport height so the whole screen always fits.
  const scale = useUiScale();
  const styles = useMemo(() => makeStyles(theme, scale), [theme, scale]);
  const round = (n: number) => Math.round(n * scale);
  const cardFoodieSize = round(120);
  const heartSize = round(20);
  const villainSize = round(150);

  const who = useGameStore((s) => s.state.who);
  const actions = useGameStore((s) => s.actions);

  // "JOGAR!" pulses gently forever, matching the design's ff-pulse keyframe.
  const pulse = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, {
          toValue: 1.05,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <LinearGradient
      style={styles.gradient}
      colors={[theme.colors.bgGradTop, theme.colors.bgGradMid, theme.colors.bgGradBottom]}
      locations={[0, 0.55, 1]}
    >
      <View style={styles.container}>
        <View style={styles.blobTopLeft} pointerEvents="none" />
        <View style={styles.blobBottomRight} pointerEvents="none" />

        <View style={styles.titleWrap}>
          <Text style={styles.title}>FOOD FIGHT</Text>
          <View style={styles.subtitlePill}>
            <Text style={styles.subtitleText}>
              Desvie dos doces do <Text style={styles.subtitleVillain}>Barão Brigadeiro</Text> e
              chegue ao prato!
            </Text>
          </View>
        </View>

        <Text style={styles.chooseText}>Escolha seu heroizinho</Text>

        <View style={styles.cardsRow}>
          {CHARACTERS.map((c) => {
            const selected = who === c.who;
            return (
              <Pressable
                key={c.who}
                onPress={() => actions.pick(c.who)}
                style={[styles.card, selected && styles.cardSelected]}
                accessibilityRole="button"
                accessibilityLabel={`Escolher ${c.name}`}
                accessibilityState={{ selected }}
              >
                <Canvas style={styles.cardCanvas}>
                  <Foodie who={c.who} size={cardFoodieSize} />
                </Canvas>
                <Text style={[styles.cardName, { color: c.nameColor }]}>{c.name}</Text>
                <Text style={styles.cardTagline}>{c.tagline}</Text>
                <View style={styles.heartsRow}>
                  <Heart filled size={heartSize} />
                  <Heart filled size={heartSize} />
                  <Heart filled size={heartSize} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <RNAnimated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={() => actions.start()}
            style={styles.jogarBtn}
            accessibilityRole="button"
            accessibilityLabel="Jogar"
          >
            <Text style={styles.jogarText}>JOGAR!</Text>
          </Pressable>
        </RNAnimated.View>

        <View style={styles.villainCorner} pointerEvents="none">
          <Canvas style={styles.villainCanvas}>
            <Foodie who="vilao" size={villainSize} />
          </Canvas>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              &quot;Ninguém escapa dos meus doces! Hahaha!&quot;
            </Text>
          </View>
        </View>

        <Text style={styles.footer}> FOOD FIGHT · estilo v0.0.1 - By Lucas Medeiros</Text>
      </View>
    </LinearGradient>
  );
};
