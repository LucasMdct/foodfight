import React from 'react';
import { Circle, Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import theme from '../../theme/tokens';

const riceTop = Skia.Path.MakeFromSVGString('M18 41 A18 8 0 0 1 36 34 A18 8 0 0 1 43 41 Z')!;
const beanSide = Skia.Path.MakeFromSVGString('M40 36 A14 6 0 0 1 54 41 L40 41 Z')!;
const sprout = Skia.Path.MakeFromSVGString('M30 30 Q33 24 30 20')!;
const reflection = Skia.Path.MakeFromSVGString('M16 22 A26 26 0 0 1 30 8')!;

/** Natural-food bubble ported from the v0.0.2 gameplay handoff SVG. */
export const FoodBubble = () => (
  <Group>
    <Oval x={14} y={37} width={44} height={14} color={theme.colors.surface} />
    <Oval x={14} y={34} width={44} height={14} color={theme.colors.bubbleFill} />
    <Oval
      x={14}
      y={34}
      width={44}
      height={14}
      color={theme.colors.bubbleBorder}
      style="stroke"
      strokeWidth={1.5}
    />
    <Path path={riceTop} color={theme.colors.surfaceAlt} />
    <Circle cx={27} cy={36} r={2.5} color={theme.colors.surfaceAlt} />
    <Circle cx={32} cy={34} r={3} color={theme.colors.surfaceAlt} />
    <Circle cx={37} cy={36} r={2.5} color={theme.colors.surfaceAlt} />
    <Path path={beanSide} color={theme.colors.beanDark} />
    <Oval x={44} y={35.5} width={6} height={4} color={theme.colors.beanLight} />
    <Oval x={39} y={37} width={6} height={4} color={theme.colors.beanLight} />
    <Path
      path={sprout}
      color={theme.colors.positive}
      style="stroke"
      strokeWidth={2.5}
      strokeCap="round"
    />
    <Circle cx={36} cy={36} r={33} color={theme.colors.bubbleHaloFill} />
    <Circle
      cx={36}
      cy={36}
      r={33}
      color={theme.colors.bubbleHaloBorder}
      style="stroke"
      strokeWidth={2}
    />
    <Path
      path={reflection}
      color={theme.colors.bubbleReflection}
      style="stroke"
      strokeWidth={3.5}
      strokeCap="round"
    />
  </Group>
);

export default FoodBubble;
