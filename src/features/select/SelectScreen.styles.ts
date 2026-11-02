import { StyleSheet } from 'react-native';
import { Theme } from '../../theme';

// Design source: FoodFight v0.0.1.dc.html lines 28-80.
//
// `s` is a responsive scale factor (0.5..1) derived from the viewport height in
// the component: on short landscape phones the full-size layout (~560px tall)
// would push the "JOGAR!" button off-screen, so every height-consuming metric
// (title, gaps, paddings, card canvas, button) is scaled by `s` to always fit.
export const makeStyles = (theme: Theme, s: number) => {
  const r = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: r(theme.space.lg),
      paddingVertical: r(theme.space.md),
      paddingHorizontal: theme.space.lg,
    },
    // Two soft decorative circles from the design (top-left yellow, bottom-right
    // green). Colors reuse existing theme tokens, dimmed via `opacity` so no new
    // rgba literal is introduced.
    blobTopLeft: {
      position: 'absolute',
      top: -40,
      left: -60,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: theme.colors.sprinkleYellow,
      opacity: 0.25,
    },
    blobBottomRight: {
      position: 'absolute',
      bottom: -70,
      right: -50,
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: theme.colors.positive,
      opacity: 0.18,
    },
    titleWrap: {
      alignItems: 'center',
      gap: 4,
    },
    title: {
      fontFamily: theme.font.bold,
      fontSize: r(52),
      lineHeight: r(56),
      letterSpacing: 2,
      color: theme.colors.brand,
      textShadowColor: theme.colors.brandShadow,
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 0,
    },
    subtitlePill: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.pill,
      paddingVertical: 6,
      paddingHorizontal: 18,
      maxWidth: 460,
    },
    subtitleText: {
      fontFamily: theme.font.medium,
      fontSize: Math.max(12, r(15)),
      color: theme.colors.textBody,
      textAlign: 'center',
    },
    subtitleVillain: {
      fontFamily: theme.font.semibold,
      color: theme.colors.villain,
    },
    chooseText: {
      fontFamily: theme.font.semibold,
      fontSize: Math.max(15, r(22)),
      color: theme.colors.textStrong,
    },
    cardsRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'center',
      gap: r(22),
    },
    card: {
      width: r(190),
      alignItems: 'center',
      gap: r(6),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      paddingTop: r(18),
      paddingHorizontal: r(12),
      paddingBottom: r(14),
      borderWidth: 4,
      borderColor: 'transparent',
      shadowColor: theme.colors.shadowWarm,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 6,
    },
    cardSelected: {
      borderColor: theme.colors.score,
    },
    cardCanvas: {
      width: r(120),
      height: r(150),
    },
    cardName: {
      fontFamily: theme.font.bold,
      fontSize: Math.max(16, r(24)),
    },
    cardTagline: {
      fontFamily: theme.font.medium,
      fontSize: Math.max(11, r(13)),
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    heartsRow: {
      flexDirection: 'row',
      gap: 4,
    },
    jogarBtn: {
      alignSelf: 'center',
      minHeight: r(56),
      justifyContent: 'center',
      backgroundColor: theme.colors.positive,
      paddingVertical: r(14),
      paddingHorizontal: r(58),
      borderRadius: theme.radii.pill,
      shadowColor: theme.colors.positiveShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
    },
    jogarText: {
      fontFamily: theme.font.bold,
      fontSize: Math.max(18, r(26)),
      letterSpacing: 1,
      color: theme.colors.surface,
      textAlign: 'center',
    },
    villainCorner: {
      position: 'absolute',
      bottom: 12,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      opacity: 0.95,
    },
    villainCanvas: {
      width: r(160),
      height: r(168),
    },
    speechBubble: {
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.villainBorder,
      borderRadius: theme.radii.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
      maxWidth: 150,
    },
    speechText: {
      fontFamily: theme.font.semibold,
      fontSize: 13,
      color: theme.colors.villain,
    },
    footer: {
      position: 'absolute',
      bottom: 14,
      left: 18,
      fontFamily: theme.font.medium,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });
};
