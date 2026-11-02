import React from 'react';
import {
  Circle,
  Group,
  Path,
  Oval,
  RoundedRect,
  Skia,
  type SkFont,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useSwing } from '../anim';
import { ZombieLaugh } from './ZombieLaugh';

const DEG = Math.PI / 180;
const bodyHighlight = Skia.Path.MakeFromSVGString('M22 22 Q34 12 50 16 Q36 18 28 28 Z')!;
const smile = Skia.Path.MakeFromSVGString('M26 48 Q40 60 56 46')!;
const toothLeft = Skia.Path.MakeFromSVGString('M32 50 L34 56 L38 50 Z')!;
const toothRight = Skia.Path.MakeFromSVGString('M44 51 L46 57 L50 49 Z')!;

/** Literal 80×74 zumbi SVG geometry from the v0.0.2 gameplay handoff. */
export const Zombie = ({ laughFont }: { laughFont: SkFont | null }) => {
  const wobble = useSwing(5, 250);
  const transform = useDerivedValue(() => [{ rotate: wobble.value }]);

  return (
    <Group origin={vec(40, 44)} transform={transform}>
      <ZombieLaugh font={laughFont} />
      <Path path={Skia.Path.MakeFromSVGString('M14 52 L66 52 L60 72 L20 72 Z')!} color="#D94F4F" />
      <Circle cx={40} cy={36} r={28} color="#4A2C17" />
      <Path path={bodyHighlight} color="#7FB069" opacity={0.85} />
      <Oval x={49} y={39} width={18} height={14} color="#7FB069" opacity={0.8} />
      <Path
        path={Skia.Path.MakeFromSVGString('M52 14 L56 22 M56 14 L52 22')!}
        color="#241206"
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
      />
      <Circle cx={28} cy={32} r={7} color="#FFFFFF" />
      <Circle cx={29} cy={35} r={3.5} color="#241206" />
      <Circle cx={52} cy={34} r={5} color="#FFFFFF" />
      <Circle cx={52} cy={36} r={2.5} color="#241206" />
      <Path path={smile} color="#241206" style="stroke" strokeWidth={3.5} strokeCap="round" />
      <Path path={toothLeft} color="#FFFFFF" />
      <Path path={toothRight} color="#FFFFFF" />
      <RoundedRect
        x={20}
        y={40}
        width={8}
        height={3}
        r={1.5}
        color="#FFD23F"
        transform={[{ rotate: 30 * DEG }]}
      />
      <RoundedRect
        x={44}
        y={24}
        width={8}
        height={3}
        r={1.5}
        color="#FF7BAC"
        transform={[{ rotate: -20 * DEG }]}
      />
    </Group>
  );
};

export default Zombie;
