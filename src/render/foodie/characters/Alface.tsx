import React from 'react';
import {
  Group, Circle, Oval, RoundedRect, Path, Skia, vec,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useWalkCycle } from '../useWalkCycle';
import { foodiePalette } from '../palette';

// Ported verbatim from Foodie.dc.html lines 21-53 (viewBox 0 0 120 150).
const c = foodiePalette.alface;
const smile = Skia.Path.MakeFromSVGString('M53 84 Q60 91 67 84')!;

export const Alface = () => {
  const { legSwing, armSwing, bobY } = useWalkCycle();
  const legL = useDerivedValue(() => [{ rotate: legSwing.value }]);
  const legR = useDerivedValue(() => [{ rotate: -legSwing.value }]);
  const armL = useDerivedValue(() => [{ rotate: -armSwing.value }]);
  const armR = useDerivedValue(() => [{ rotate: armSwing.value }]);
  const bob = useDerivedValue(() => [{ translateY: bobY.value }]);

  return (
    <Group>
      {/* left leg */}
      <Group origin={vec(48, 114)} transform={legL}>
        <RoundedRect x={42} y={108} width={12} height={26} r={6} color={c.legFill} />
        <Oval x={37} y={129.5} width={22} height={13} color={c.footFill} />
      </Group>
      {/* right leg */}
      <Group origin={vec(72, 114)} transform={legR}>
        <RoundedRect x={66} y={108} width={12} height={26} r={6} color={c.legFill} />
        <Oval x={61} y={129.5} width={22} height={13} color={c.footFill} />
      </Group>
      {/* body (bobs) */}
      <Group origin={vec(60, 80)} transform={bob}>
        <Group origin={vec(24, 78)} transform={armL}>
          <Oval x={11} y={74} width={16} height={28} color={c.armFill} />
        </Group>
        <Group origin={vec(96, 78)} transform={armR}>
          <Oval x={93} y={74} width={16} height={28} color={c.armFill} />
        </Group>
        <Circle cx={60} cy={52} r={30} color={c.outer} />
        <Circle cx={32} cy={66} r={22} color={c.outer} />
        <Circle cx={88} cy={66} r={22} color={c.outer} />
        <Circle cx={38} cy={90} r={20} color={c.mid} />
        <Circle cx={82} cy={90} r={20} color={c.mid} />
        <Circle cx={60} cy={98} r={24} color={c.mid} />
        <Circle cx={60} cy={74} r={31} color={c.innerA} />
        <Circle cx={60} cy={76} r={25} color={c.innerB} />
        <Circle cx={50} cy={72} r={5} color={c.eye} />
        <Circle cx={70} cy={72} r={5} color={c.eye} />
        <Circle cx={51.7} cy={70.2} r={1.8} color="#FFFFFF" />
        <Circle cx={71.7} cy={70.2} r={1.8} color="#FFFFFF" />
        <Oval x={35.5} y={78.8} width={11} height={6.4} color={c.cheek} opacity={0.75} />
        <Oval x={73.5} y={78.8} width={11} height={6.4} color={c.cheek} opacity={0.75} />
        <Path path={smile} color={c.mouth} style="stroke" strokeWidth={2.6} strokeCap="round" />
      </Group>
    </Group>
  );
};
