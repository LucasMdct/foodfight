import { StyleSheet } from 'react-native';
import type { Theme } from '../../theme';

export const makeStyles = (theme: Theme, scale: number) => {
  const r = (value: number) => Math.round(value * scale);

  return StyleSheet.create({
    gradient: { flex: 1 },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: r(20),
      paddingHorizontal: r(20),
      paddingVertical: r(18),
    },
    blob: {
      position: 'absolute',
      top: -50,
      right: -60,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: theme.colors.villain,
      opacity: 0.12,
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: r(14),
    },
    headingCanvas: { width: r(64), height: r(80) },
    headingCopy: { maxWidth: r(520) },
    headingTitle: {
      fontFamily: theme.font.bold,
      fontSize: Math.max(24, r(36)),
      lineHeight: Math.max(28, r(42)),
      color: theme.colors.textStrong,
    },
    headingName: { color: theme.colors.positive },
    headingSubtitle: {
      marginTop: r(3),
      fontFamily: theme.font.medium,
      fontSize: Math.max(12, r(15)),
      color: theme.colors.textMuted,
    },
    cardsRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'center',
      gap: r(16),
    },
    card: {
      width: r(186),
      alignItems: 'center',
      gap: r(8),
      paddingHorizontal: r(14),
      paddingVertical: r(20),
      borderRadius: theme.radii.xl,
      borderBottomWidth: r(8),
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadowWarm,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 6,
    },
    impossibleCard: {
      backgroundColor: theme.colors.villainDark,
      shadowColor: theme.colors.villain,
      shadowOpacity: 0.35,
    },
    starRow: { flexDirection: 'row', gap: 2 },
    stars: { fontFamily: theme.font.bold, fontSize: r(24) },
    cardTitle: { fontFamily: theme.font.bold, fontSize: Math.max(17, r(22)) },
    cardDescription: {
      minHeight: r(38),
      fontFamily: theme.font.medium,
      fontSize: Math.max(11, r(13)),
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    impossibleDescription: { color: '#B49CD9' },
    backButton: {
      paddingHorizontal: r(24),
      paddingVertical: r(9),
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
    },
    backText: {
      fontFamily: theme.font.semibold,
      fontSize: Math.max(12, r(15)),
      color: theme.colors.textBody,
    },
  });
};
