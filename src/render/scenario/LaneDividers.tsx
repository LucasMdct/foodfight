import React from 'react';
import { Group, Path, Skia, DashPathEffect } from '@shopify/react-native-skia';
import theme from '../../theme/tokens';

/**
 * Ported from FoodFight v0.0.1.dc.html lines 89-90: two horizontal
 * `border-top:3px dashed rgba(138,90,52,0.28)` rules at `top:33.33%` and
 * `top:66.66%`, marking the 3 utensil lanes.
 */
export const LaneDividers = ({ width, height }: { width: number; height: number }) => {
  const y1 = height / 3;
  const y2 = (2 * height) / 3;

  // Build the horizontal rule via an SVG path string (Skia.Path.MakeFromSVGString)
  // instead of the imperative SkPath.moveTo()/lineTo(), which are deprecated in
  // react-native-skia and slated for removal.
  const line = (y: number) => Skia.Path.MakeFromSVGString(`M0 ${y} L ${width} ${y}`)!;

  return (
    <Group>
      {[y1, y2].map((y) => (
        <Path
          key={y}
          path={line(y)}
          color={theme.colors.laneDivider}
          style="stroke"
          strokeWidth={3}
        >
          <DashPathEffect intervals={[10, 8]} />
        </Path>
      ))}
    </Group>
  );
};

export default LaneDividers;
