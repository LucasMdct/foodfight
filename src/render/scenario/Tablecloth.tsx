import React from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import theme from '../../theme/tokens';

const GRID_PITCH = 44;
const LOOP_WIDTH = 88;

/**
 * Ported from FoodFight v0.0.1.dc.html line 92: a cream field
 * (`background-color:#FFF3E2`) overlaid by two `repeating-linear-gradient`s
 * (one at 90deg, one at 0deg) of `rgba(255,107,107,0.13)` stripes, each with
 * a 44px solid / 44px transparent pitch, animated via `ff-scroll` (translateX
 * 0 -> -88px). CSS composites the two gradients independently, so at the
 * intersections of solid column + solid row the color visually doubles up —
 * that's reproduced here by drawing alternating-column and alternating-row
 * Rects with the same translucent color and letting Skia's default
 * src-over blending stack their alpha, instead of hand-building a true
 * two-tone checkerboard (which the source markup does not actually do).
 *
 * The grid is drawn `width + LOOP_WIDTH` wide inside a Group translated by
 * `scrollX` (owned by the engine, looped 0..-88) so the 44px-pitch pattern
 * repeats seamlessly as it scrolls left.
 */
export const Tablecloth = ({
  width,
  height,
  scrollX,
}: {
  width: number;
  height: number;
  scrollX: SharedValue<number>;
}) => {
  const transform = useDerivedValue(() => [{ translateX: scrollX.value }]);
  const cols = Math.ceil((width + LOOP_WIDTH) / GRID_PITCH) + 1;
  const rows = Math.ceil(height / GRID_PITCH) + 1;

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} color={theme.colors.bg} />
      <Group transform={transform}>
        {Array.from({ length: cols }, (_, i) => (
          i % 2 === 0 ? (
            <Rect
              key={`col-${i}`}
              x={i * GRID_PITCH}
              y={0}
              width={GRID_PITCH}
              height={height}
              color={theme.colors.tableGrid}
            />
          ) : null
        ))}
        {Array.from({ length: rows }, (_, j) => (
          j % 2 === 0 ? (
            <Rect
              key={`row-${j}`}
              x={0}
              y={j * GRID_PITCH}
              width={width + LOOP_WIDTH}
              height={GRID_PITCH}
              color={theme.colors.tableGrid}
            />
          ) : null
        ))}
      </Group>
    </Group>
  );
};

export default Tablecloth;
