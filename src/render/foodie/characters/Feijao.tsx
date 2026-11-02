import React from 'react';
import { Group, Circle, Oval, RoundedRect, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useWalkCycle } from '../useWalkCycle';
import { foodiePalette } from '../palette';

// Ported verbatim from Foodie.dc.html lines 57-86 (viewBox 0 0 120 150).
const c = foodiePalette.feijao;
const DEG = Math.PI / 180;
const spot1 = Skia.Path.MakeFromSVGString('M34 52 Q28 76 36 98 Q26 78 30 58 Z')!;
const mouth = Skia.Path.MakeFromSVGString('M52 86 Q60 95 68 86')!;

export const Feijao = () => {
  const { legSwing, armSwing, bobY } = useWalkCycle();
  const legL = useDerivedValue(() => [{ rotate: legSwing.value }]);
  const legR = useDerivedValue(() => [{ rotate: -legSwing.value }]);
  const armL = useDerivedValue(() => [{ rotate: -armSwing.value }]);
  const armR = useDerivedValue(() => [{ rotate: armSwing.value }]);
  const bob = useDerivedValue(() => [{ translateY: bobY.value }]);

  return (
    <Group>
      {/* left leg */}
      <Group origin={vec(48, 116)} transform={legL}>
        <RoundedRect x={42} y={110} width={12} height={24} r={6} color={c.legFill} />
        <Oval x={37} y={129.5} width={22} height={13} color={c.footFill} />
      </Group>
      {/* right leg */}
      <Group origin={vec(72, 116)} transform={legR}>
        <RoundedRect x={66} y={110} width={12} height={24} r={6} color={c.legFill} />
        <Oval x={61} y={129.5} width={22} height={13} color={c.footFill} />
      </Group>
      {/* body (bobs) */}
      <Group origin={vec(60, 80)} transform={bob}>
        <Group origin={vec(28, 76)} transform={armL}>
          <Group origin={vec(23, 86)} transform={[{ rotate: 18 * DEG }]}>
            <Oval x={15} y={72} width={16} height={28} color={c.armFill} />
          </Group>
        </Group>
        <Group origin={vec(92, 76)} transform={armR}>
          <Group origin={vec(97, 86)} transform={[{ rotate: -18 * DEG }]}>
            <Oval x={89} y={72} width={16} height={28} color={c.armFill} />
          </Group>
        </Group>
        <Oval x={26} y={36} width={68} height={80} color={c.body} />
        <Path path={spot1} color={c.spot} opacity={0.45} />
        <Group origin={vec(84, 52)} transform={[{ rotate: 24 * DEG }]}>
          <Oval x={77} y={42} width={14} height={20} color={c.spot} opacity={0.4} />
        </Group>
        <Group origin={vec(38, 104)} transform={[{ rotate: -18 * DEG }]}>
          <Oval x={32} y={96} width={12} height={16} color={c.spot} opacity={0.4} />
        </Group>
        <Oval x={37} y={53} width={46} height={54} color={c.belly} />
        <Circle cx={51} cy={74} r={5} color={c.eye} />
        <Circle cx={69} cy={74} r={5} color={c.eye} />
        <Circle cx={52.7} cy={72.2} r={1.8} color="#FFFFFF" />
        <Circle cx={70.7} cy={72.2} r={1.8} color="#FFFFFF" />
        <Oval x={37.5} y={80.8} width={11} height={6.4} color={c.cheek} opacity={0.75} />
        <Oval x={71.5} y={80.8} width={11} height={6.4} color={c.cheek} opacity={0.75} />
        <Path path={mouth} color={c.mouth} style="stroke" strokeWidth={2.6} strokeCap="round" />
      </Group>
    </Group>
  );
};
