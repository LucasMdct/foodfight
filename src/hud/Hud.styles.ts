import { StyleSheet } from 'react-native';
import { Theme } from '../theme';

// Design source: FoodFight v0.0.1.dc.html HUD (top-left chip, top-right score
// seal, bottom control hint). Overlaid on top of the game Canvas.
export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: theme.space.md,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.pill,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    chipCanvas: {
      width: 40,
      height: 50,
    },
    chipName: {
      fontFamily: theme.font.bold,
      fontSize: 16,
      color: theme.colors.textStrong,
    },
    heartsRow: {
      flexDirection: 'row',
      gap: 3,
    },
    rightCluster: {
      alignItems: 'flex-end',
      gap: theme.space.sm,
    },
    scoreSeal: {
      backgroundColor: theme.colors.score,
      borderRadius: theme.radii.pill,
      paddingVertical: 8,
      paddingHorizontal: 18,
      shadowColor: theme.colors.scoreShadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 5,
    },
    scoreText: {
      fontFamily: theme.font.bold,
      fontSize: 20,
      color: theme.colors.surface,
    },
    exitBtn: {
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.pill,
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
    exitText: {
      fontFamily: theme.font.semibold,
      fontSize: 14,
      color: theme.colors.textBody,
    },
    hintWrap: {
      alignItems: 'center',
    },
    hintPill: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.pill,
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
    hintText: {
      fontFamily: theme.font.medium,
      fontSize: 13,
      color: theme.colors.textMuted,
    },
  });
