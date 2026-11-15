import { StyleSheet } from 'react-native';
import { GAME_CONSTANTS } from '../../types/constants';
import theme from '../../theme/tokens';

export const GAME_SCREEN_STYLES = StyleSheet.create({
  root: { flex: 1 },
  canvasContainer: { flex: 1 },
  canvas: { flex: 1 },
  loopReadout: { position: 'absolute', top: 6, left: 6 },
  loopText: { color: theme.colors.surface, fontSize: 11 },
  tauntBubble: {
    position: 'absolute',
    right: Math.round(GAME_CONSTANTS.VILLAIN_RENDER_WIDTH * 0.92),
    width: 220,
    minHeight: 52,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 2.5,
    borderColor: theme.colors.villainBorder,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.villainDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  tauntText: {
    color: theme.colors.villain,
    fontFamily: theme.font.semibold,
    fontSize: 15,
    lineHeight: 21,
  },
});
