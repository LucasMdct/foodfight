import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import theme from '../theme/tokens';

// Design path (viewBox 20x18) — see FoodFight v0.0.1.dc.html lines 46-48 and 144.
const heartPath = Skia.Path.MakeFromSVGString(
  'M10 17 C3 11 0 7 0 4.5 A4.5 4.5 0 0 1 10 2.5 A4.5 4.5 0 0 1 20 4.5 C20 7 17 11 10 17 Z'
)!;

/**
 * Shared heart icon used by SelectScreen cards and the in-game HUD.
 * `size` scales uniformly from the 20x18 design viewBox.
 */
export const Heart = ({ filled, size = 18 }: { filled: boolean; size?: number }) => (
  <Canvas style={{ width: size, height: size * 0.9 }}>
    <Path
      path={heartPath}
      color={filled ? theme.colors.heartFull : theme.colors.heartEmpty}
      transform={[{ scale: size / 20 }]}
    />
  </Canvas>
);
