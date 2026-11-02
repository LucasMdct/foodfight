import React from 'react';
import { Circle, Group, Oval, Path, Skia } from '@shopify/react-native-skia';

const riceTop = Skia.Path.MakeFromSVGString('M18 41 A18 8 0 0 1 36 34 A18 8 0 0 1 43 41 Z')!;
const beanSide = Skia.Path.MakeFromSVGString('M40 36 A14 6 0 0 1 54 41 L40 41 Z')!;
const sprout = Skia.Path.MakeFromSVGString('M30 30 Q33 24 30 20')!;

/** Natural-food bubble ported from the v0.0.2 gameplay handoff SVG. */
export const FoodBubble = () => (
  <Group>
    <Oval x={14} y={37} width={44} height={14} color="#FFFFFF" />
    <Oval x={14} y={34} width={44} height={14} color="#F4F7FA" style="stroke" strokeWidth={1.5} />
    <Path path={riceTop} color="#FFFDF6" />
    <Circle cx={27} cy={36} r={2.5} color="#FFFDF6" />
    <Circle cx={32} cy={34} r={3} color="#FFFDF6" />
    <Circle cx={37} cy={36} r={2.5} color="#FFFDF6" />
    <Path path={beanSide} color="#8A5A34" />
    <Oval x={44} y={35.5} width={6} height={4} color="#C89A6B" />
    <Oval x={39} y={37} width={6} height={4} color="#C89A6B" />
    <Path path={sprout} color="#7BC950" style="stroke" strokeWidth={2.5} strokeCap="round" />
    <Circle cx={36} cy={36} r={33} color="rgba(180,220,255,0.18)" style="stroke" strokeWidth={2} />
  </Group>
);

export default FoodBubble;
