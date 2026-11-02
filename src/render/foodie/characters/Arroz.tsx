import React from 'react';
import { Group, Circle, Oval, RoundedRect, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useWalkCycle } from '../useWalkCycle';
import { foodiePalette } from '../palette';

// Ported verbatim from Foodie.dc.html lines 90-116 (viewBox 0 0 120 150).
const c = foodiePalette.arroz;
const DEG = Math.PI / 180;
const sprout = Skia.Path.MakeFromSVGString(
  'M60 40 Q58 26 46 22 Q56 24 60 32 Q62 22 74 20 Q64 26 61 40 Z'
)!;
const shade = Skia.Path.MakeFromSVGString('M78 48 Q88 78 78 108 Q84 78 76 50 Z')!;
const mouth = Skia.Path.MakeFromSVGString('M54 86 Q60 92 66 86')!;

export const Arroz = () => {
  const { legSwing, armSwing, bobY } = useWalkCycle();
  const legL = useDerivedValue(() => [{ rotate: legSwing.value }]);
  const legR = useDerivedValue(() => [{ rotate: -legSwing.value }]);
  const armL = useDerivedValue(() => [{ rotate: -armSwing.value }]);
  const armR = useDerivedValue(() => [{ rotate: armSwing.value }]);
  const bob = useDerivedValue(() => [{ translateY: bobY.value }]);

  return (
    <Group>
      {/* left leg */}
      <Group origin={vec(48, 118)} transform={legL}>
        <RoundedRect x={43} y={112} width={12} height={22} r={6} color={c.legFill} />
        <Oval x={38} y={129.5} width={22} height={13} color={c.footFill} />
      </Group>
      {/* right leg */}
      <Group origin={vec(72, 118)} transform={legR}>
        <RoundedRect x={65} y={112} width={12} height={22} r={6} color={c.legFill} />
        <Oval x={60} y={129.5} width={22} height={13} color={c.footFill} />
      </Group>
      {/* body (bobs) */}
      <Group origin={vec(60, 82)} transform={bob}>
        <Path path={sprout} color={c.sprout} />
        <Group origin={vec(34, 80)} transform={armL}>
          <Group origin={vec(29, 90)} transform={[{ rotate: 18 * DEG }]}>
            <Oval x={21} y={77} width={16} height={26} color={c.armFill} />
          </Group>
        </Group>
        <Group origin={vec(86, 80)} transform={armR}>
          <Group origin={vec(91, 90)} transform={[{ rotate: -18 * DEG }]}>
            <Oval x={83} y={77} width={16} height={26} color={c.armFill} />
          </Group>
        </Group>
        <Oval x={32} y={38} width={56} height={84} color={c.body} />
        <Oval
          x={32}
          y={38}
          width={56}
          height={84}
          color={c.bodyStroke}
          style="stroke"
          strokeWidth={2.5}
        />
        <Path path={shade} color={c.shade} />
        <Circle cx={51} cy={74} r={5} color={c.eye} />
        <Circle cx={69} cy={74} r={5} color={c.eye} />
        <Circle cx={52.7} cy={72.2} r={1.8} color="#FFFFFF" />
        <Circle cx={70.7} cy={72.2} r={1.8} color="#FFFFFF" />
        <Oval x={38.5} y={80.8} width={11} height={6.4} color={c.cheek} opacity={0.85} />
        <Oval x={70.5} y={80.8} width={11} height={6.4} color={c.cheek} opacity={0.85} />
        <Path path={mouth} color={c.mouth} style="stroke" strokeWidth={2.6} strokeCap="round" />
      </Group>
    </Group>
  );
};
