import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../store/gameStore';
import { difficultyConfigAt } from '../../engine/combatMath';
import type { Difficulty, Who } from '../../types/game';
import type { Theme } from '../../theme';
import { Foodie } from '../../render/foodie/Foodie';
import { useTheme, useUiScale } from '../../theme';
import { makeStyles } from './DifficultyScreen.styles';

const HERO_NAMES: Record<Who, string> = {
  alface: 'Alface',
  feijao: 'Feijão',
  arroz: 'Arroz',
};

const OPTIONS: readonly {
  key: Difficulty;
  stars: number;
  color: keyof Theme['colors'];
  titleColor: keyof Theme['colors'];
  description: string;
  dark?: boolean;
}[] = [
  {
    key: 'mfacil',
    stars: 1,
    color: 'positive',
    titleColor: 'winText',
    description: 'Doces devagarinho.\nPerfeito pra começar!',
  },
  {
    key: 'facil',
    stars: 2,
    color: 'score',
    titleColor: 'difficultyEasyText',
    description: 'Um desafio gostoso,\nno ritmo certo.',
  },
  {
    key: 'dificil',
    stars: 3,
    color: 'brand',
    titleColor: 'brandShadow',
    description: 'Chuva de doces!\nReflexos afiados.',
  },
  {
    key: 'impossivel',
    stars: 4,
    color: 'villain',
    titleColor: 'difficultyImpossibleText',
    description: 'O Barão sem piedade.\nVocê foi avisado…',
    dark: true,
  },
];

export const DifficultyScreen = () => {
  const theme = useTheme();
  const scale = useUiScale();
  const styles = useMemo(() => makeStyles(theme, scale), [scale, theme]);
  const who = useGameStore((s) => s.state.who);
  const actions = useGameStore((s) => s.actions);
  const heroName = HERO_NAMES[who];
  const heroSize = Math.max(48, Math.round(64 * scale));

  return (
    <LinearGradient
      style={styles.gradient}
      colors={[theme.colors.bgGradTop, theme.colors.bgGradMid, theme.colors.bgGradBottom]}
      locations={[0, 0.55, 1]}
    >
      <View style={styles.container}>
        <View style={styles.blob} pointerEvents="none" />
        <View style={styles.heading}>
          <Canvas style={styles.headingCanvas}>
            <Foodie who={who} size={heroSize} />
          </Canvas>
          <View style={styles.headingCopy}>
            <Text style={styles.headingTitle}>
              Qual o tamanho da fome, <Text style={styles.headingName}>{heroName}</Text>?
            </Text>
            <Text style={styles.headingSubtitle}>Escolha a dificuldade da batalha</Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          {OPTIONS.map((option) => {
            const config = difficultyConfigAt(option.key);
            const color = theme.colors[option.color];
            const titleColor = theme.colors[option.titleColor];
            return (
              <Pressable
                key={option.key}
                onPress={() => actions.start(option.key)}
                style={[
                  styles.card,
                  { borderBottomColor: color },
                  option.dark && styles.impossibleCard,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Escolher dificuldade ${config.label}`}
              >
                <View style={styles.starRow}>
                  <Text style={[styles.stars, { color }]}>{'★'.repeat(option.stars)}</Text>
                </View>
                <Text style={[styles.cardTitle, { color: titleColor }]}>{config.label}</Text>
                <Text style={[styles.cardDescription, option.dark && styles.impossibleDescription]}>
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={actions.toSelect}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Trocar herói"
        >
          <Text style={styles.backText}>← Trocar herói</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
};
