import React from 'react';
import { Group, Circle, Oval, RoundedRect, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useBob, useSwing } from '../../anim';
import { foodiePalette } from '../palette';

// Ported verbatim from Foodie.dc.html lines 121-156 (viewBox 0 0 150 160).
// No walk cycle: body bobs, wand swings, left arm is static.
// Painted back-to-front in the exact order of the source SVG.
const c = foodiePalette.vilao;
const DEG = Math.PI / 180;

const linerBase = Skia.Path.MakeFromSVGString('M38 106 L112 106 L103 142 L47 142 Z')!;
const linerFolds = Skia.Path.MakeFromSVGString(
  'M38 106 L46 100 L54 106 L62 100 L70 106 L78 100 L86 106 L94 100 L102 106 L112 106 L38 106 Z'
)!;
const linerFoldLines = Skia.Path.MakeFromSVGString(
  'M52 108 L54 140 M75 108 L75 141 M98 108 L96 140'
)!;
const swirl = Skia.Path.MakeFromSVGString(
  'M133 34 m-9 0 a9 9 0 0 1 18 0 a6.5 6.5 0 0 1 -13 0 a4 4 0 0 1 8 0'
)!;
const highlight = Skia.Path.MakeFromSVGString('M42 58 Q52 38 75 34 Q56 44 48 62 Z')!;
const browL = Skia.Path.MakeFromSVGString('M48 62 L67 68')!;
const browR = Skia.Path.MakeFromSVGString('M102 62 L83 68')!;
const monocleChain = Skia.Path.MakeFromSVGString('M92 82.5 Q96 96 104 100')!;
const smile = Skia.Path.MakeFromSVGString('M56 90 Q75 104 94 88')!;
const tooth = Skia.Path.MakeFromSVGString('M84 92 L88 98 L91 90 Z')!;

export const Vilao = () => {
  const bobY = useBob(3, 450);
  const wandSwing = useSwing(13, 350);
  const bob = useDerivedValue(() => [{ translateY: bobY.value }]);
  const wand = useDerivedValue(() => [{ rotate: wandSwing.value }]);

  return (
    <Group origin={vec(75, 80)} transform={bob}>
      {/* cupcake liner */}
      <Path path={linerBase} color={c.cup} />
      <Path path={linerFolds} color={c.cupDark} />
      <Path path={linerFoldLines} color={c.cupDark} style="stroke" strokeWidth={3} />

      {/* wand (swings) */}
      <Group origin={vec(120, 86)} transform={wand}>
        <Group origin={vec(126, 64)} transform={[{ rotate: 14 * DEG }]}>
          <RoundedRect x={124} y={38} width={5} height={52} r={2.5} color={c.wandStick} />
        </Group>
        <Circle cx={133} cy={34} r={15} color={c.wandCandy} />
        <Path path={swirl} color="#FFFFFF" style="stroke" strokeWidth={3} strokeCap="round" />
        <Group origin={vec(118, 88)} transform={[{ rotate: -30 * DEG }]}>
          <Oval x={109} y={74} width={18} height={28} color={c.armFill} />
        </Group>
      </Group>

      {/* left arm (static) */}
      <Group origin={vec(30, 92)} transform={[{ rotate: 24 * DEG }]}>
        <Oval x={21} y={78} width={18} height={28} color={c.armFill} />
      </Group>

      {/* head */}
      <Circle cx={75} cy={76} r={44} color={c.body} />
      <Path path={highlight} color={c.bodyHi} opacity={0.7} />

      {/* sprinkles */}
      <Group origin={vec(56, 47)} transform={[{ rotate: 24 * DEG }]}>
        <RoundedRect x={52} y={46} width={9} height={3.5} r={1.75} color={c.wandCandy} />
      </Group>
      <Group origin={vec(92, 45)} transform={[{ rotate: -18 * DEG }]}>
        <RoundedRect x={88} y={44} width={9} height={3.5} r={1.75} color={c.monocle} />
      </Group>
      <Group origin={vec(46, 89)} transform={[{ rotate: -30 * DEG }]}>
        <RoundedRect x={42} y={88} width={9} height={3.5} r={1.75} color={c.sprinkleTeal} />
      </Group>
      <Group origin={vec(104, 95)} transform={[{ rotate: 20 * DEG }]}>
        <RoundedRect x={100} y={94} width={9} height={3.5} r={1.75} color={c.hatBand} />
      </Group>
      <Group origin={vec(70, 105)} transform={[{ rotate: -8 * DEG }]}>
        <RoundedRect x={66} y={104} width={9} height={3.5} r={1.75} color={c.monocle} />
      </Group>
      <Group origin={vec(102, 61)} transform={[{ rotate: 40 * DEG }]}>
        <RoundedRect x={98} y={60} width={9} height={3.5} r={1.75} color={c.sprinkleRed} />
      </Group>
      <Group origin={vec(40, 75)} transform={[{ rotate: 60 * DEG }]}>
        <RoundedRect x={36} y={74} width={9} height={3.5} r={1.75} color={c.monocle} />
      </Group>

      {/* eyes */}
      <Circle cx={58} cy={70} r={9} color={c.eyeWhite} />
      <Circle cx={92} cy={70} r={9} color={c.eyeWhite} />
      <Circle cx={60} cy={72} r={4.5} color={c.eye} />
      <Circle cx={90} cy={72} r={4.5} color={c.eye} />
      <Path path={browL} color={c.eye} style="stroke" strokeWidth={4} strokeCap="round" />
      <Path path={browR} color={c.eye} style="stroke" strokeWidth={4} strokeCap="round" />

      {/* monocle */}
      <Circle cx={92} cy={70} r={12.5} color={c.monocle} style="stroke" strokeWidth={2.5} />
      <Path path={monocleChain} color={c.monocle} style="stroke" strokeWidth={2} />

      {/* smile */}
      <Path path={smile} color={c.eye} style="stroke" strokeWidth={3.5} strokeCap="round" />
      <Path path={tooth} color={c.eyeWhite} />

      {/* hat */}
      <RoundedRect x={57} y={2} width={36} height={24} r={3} color={c.hat} />
      <RoundedRect x={49} y={24} width={52} height={7} r={3.5} color={c.hat} />
      <RoundedRect x={57} y={17} width={36} height={7} r={0} color={c.hatBand} />
    </Group>
  );
};
