import { useWindowDimensions } from 'react-native';

/**
 * Responsive scale factor for fit-to-screen layouts. The design mockups assume a
 * tall viewport, but the game is landscape-locked, so on a phone the full-size
 * layout overflows vertically and pushes primary actions (JOGAR!, the game-over
 * buttons) off-screen. Scaling every height-consuming metric by this factor
 * keeps the whole screen visible without scrolling.
 *
 * @param designHeight viewport height at which the layout renders at full size
 * @param min lower clamp so text never collapses to an unreadable size
 */
export const useUiScale = (designHeight = 620, min = 0.5): number => {
  const { height } = useWindowDimensions();
  return Math.max(min, Math.min(1, height / designHeight));
};
