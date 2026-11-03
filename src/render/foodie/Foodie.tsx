import React from 'react';
import { Group } from '@shopify/react-native-skia';
import { Alface } from './characters/Alface';
import { Feijao } from './characters/Feijao';
import { Arroz } from './characters/Arroz';
import { Vilao } from './characters/Vilao';
import type { VillainMood } from '../../types/game';

export type Who = 'alface' | 'feijao' | 'arroz' | 'vilao';

// Design viewBox widths per character (Foodie.dc.html): heroes 120x150, villain 150x160.
const VIEWBOX: Record<Who, [number, number]> = {
  alface: [120, 150],
  feijao: [120, 150],
  arroz: [120, 150],
  vilao: [150, 160],
};

/**
 * Renders a Foodie character scaled to `size` (and optional `height` for exact handoff aspect).
 * Must be placed inside a Skia <Canvas>.
 */
export const Foodie = ({
  who,
  size,
  height,
  animated = true,
  mood,
  talking = false,
}: {
  who: Who;
  size: number;
  height?: number;
  animated?: boolean;
  mood?: VillainMood;
  talking?: boolean;
}) => {
  const [vw, vh] = VIEWBOX[who];
  const sx = size / vw;
  const sy = height ? height / vh : sx;
  const Body =
    who === 'alface' ? Alface : who === 'feijao' ? Feijao : who === 'arroz' ? Arroz : Vilao;
  return (
    <Group transform={[{ scaleX: sx }, { scaleY: sy }]}>
      {who === 'vilao' ? <Vilao animated={animated} mood={mood} talking={talking} /> : <Body />}
    </Group>
  );
};
