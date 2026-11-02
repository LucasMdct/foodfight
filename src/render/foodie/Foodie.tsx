import React from 'react';
import { Group } from '@shopify/react-native-skia';
import { Alface } from './characters/Alface';
import { Feijao } from './characters/Feijao';
import { Arroz } from './characters/Arroz';
import { Vilao } from './characters/Vilao';

export type Who = 'alface' | 'feijao' | 'arroz' | 'vilao';

// Design viewBox widths per character (Foodie.dc.html): heroes 120x150, villain 150x160.
const VIEWBOX: Record<Who, [number, number]> = {
  alface: [120, 150],
  feijao: [120, 150],
  arroz: [120, 150],
  vilao: [150, 160],
};

/**
 * Renders a Foodie character scaled to `size` (uniform scale by design width).
 * Must be placed inside a Skia <Canvas>.
 */
export const Foodie = ({ who, size }: { who: Who; size: number }) => {
  const [vw] = VIEWBOX[who];
  const s = size / vw;
  const Body =
    who === 'alface' ? Alface : who === 'feijao' ? Feijao : who === 'arroz' ? Arroz : Vilao;
  return (
    <Group transform={[{ scale: s }]}>
      <Body />
    </Group>
  );
};
