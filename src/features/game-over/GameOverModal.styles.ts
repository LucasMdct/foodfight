import { StyleSheet } from 'react-native';
import { Theme } from '../../theme';

// Design source: FoodFight v0.0.1.dc.html lines 159-181 ("FIM DE JOGO" overlay).
//
// `s` is the shared responsive scale (see useUiScale): the modal's vertical
// stack would otherwise clip its buttons on a landscape phone.
export const makeStyles = (theme: Theme, s: number) => {
  const r = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radii.xxl,
      paddingVertical: r(theme.space.xl),
      paddingHorizontal: theme.space.xl + theme.space.md,
      alignItems: 'center',
      gap: r(theme.space.md),
      maxWidth: '92%',
      shadowColor: theme.colors.shadowWarm,
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 1,
      shadowRadius: 60,
      elevation: 10,
    },
    villainCanvas: {
      width: r(110),
      height: r(120),
    },
    title: {
      fontFamily: theme.font.bold,
      fontSize: Math.max(24, r(36)),
      lineHeight: Math.max(26, r(40)),
      color: theme.colors.brand,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: theme.font.medium,
      fontSize: Math.max(13, r(16)),
      color: theme.colors.textBody,
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.space.lg,
      marginTop: theme.space.xs,
    },
    statBlock: {
      alignItems: 'center',
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radii.md,
      paddingVertical: r(theme.space.sm),
      paddingHorizontal: theme.space.lg,
    },
    statLabel: {
      fontFamily: theme.font.semibold,
      fontSize: 12,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statValue: {
      fontFamily: theme.font.bold,
      fontSize: Math.max(20, r(28)),
      color: theme.colors.textStrong,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: theme.space.md,
      marginTop: theme.space.xs,
    },
    playAgainBtn: {
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: theme.colors.positive,
      paddingVertical: r(13),
      paddingHorizontal: theme.space.xl,
      borderRadius: theme.radii.pill,
      shadowColor: theme.colors.positiveShadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
    },
    playAgainText: {
      fontFamily: theme.font.bold,
      fontSize: Math.max(16, r(19)),
      color: theme.colors.surface,
      textAlign: 'center',
    },
    switchHeroBtn: {
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      paddingVertical: r(13),
      paddingHorizontal: theme.space.lg,
      borderRadius: theme.radii.pill,
    },
    switchHeroText: {
      fontFamily: theme.font.semibold,
      fontSize: Math.max(16, r(19)),
      color: theme.colors.textBody,
      textAlign: 'center',
    },
  });
};
