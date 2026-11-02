import { StyleSheet } from 'react-native';
import { Theme } from '../../theme';

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      fontFamily: theme.font.bold,
      color: theme.colors.brand,
      fontSize: 44,
      letterSpacing: 4,
      textShadowColor: theme.colors.brandShadow,
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 0,
      marginBottom: theme.space.md,
    },
    foodieCanvas: {
      width: 130,
      height: 160,
      marginBottom: theme.space.lg,
    },
    barTrack: {
      height: 16,
      width: '60%',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.border,
      overflow: 'hidden',
    },
    barFill: {
      height: 16,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.positive,
    },
  });
