import React, { useEffect } from 'react';
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
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSwing } from '../anim';
import { ZombieLaugh } from './ZombieLaugh';
import theme from '../../theme/tokens';

const DEG = Math.PI / 180;
const bodyHighlight = Skia.Path.MakeFromSVGString('M22 22 Q34 12 50 16 Q36 18 28 28 Z')!;
const cup = Skia.Path.MakeFromSVGString('M14 52 L66 52 L60 72 L20 72 Z')!;
const eyeCross = Skia.Path.MakeFromSVGString('M52 14 L56 22 M56 14 L52 22')!;
const mouthTeeth = Skia.Path.MakeFromSVGString('M31 46 L49 46')!;

/** Literal 80×74 zumbi SVG geometry from the v0.0.4 gameplay handoff. */
export const Zombie = ({ laughFont }: { laughFont: SkFont | null }) => {
  const wobble = useSwing(9, 250);
  const mouthScaleY = useSharedValue(0.3);
  useEffect(() => {
    mouthScaleY.value = withRepeat(
      withTiming(1, { duration: 160, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [mouthScaleY]);

  const transform = useDerivedValue(() => [{ rotate: wobble.value }]);
  const mouthTransform = useDerivedValue(() => [{ scaleY: mouthScaleY.value }]);

  return (
    <Group origin={vec(40, 44)} transform={transform}>
      <ZombieLaugh font={laughFont} />
      <Path path={cup} color={theme.colors.zombieCup} />
      <Circle cx={40} cy={36} r={28} color={theme.colors.zombieBody} />
      <Path path={bodyHighlight} color={theme.colors.zombieHighlight} opacity={0.85} />
      <Oval
        x={49}
        y={39}
        width={18}
        height={14}
        color={theme.colors.zombieHighlight}
        opacity={0.8}
      />
      <Path
        path={eyeCross}
        color={theme.colors.zombieOutline}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
      />
      <Circle cx={28} cy={32} r={7} color={theme.colors.surface} />
      <Circle cx={29} cy={35} r={3.5} color={theme.colors.zombieOutline} />
      <Circle cx={52} cy={34} r={5} color={theme.colors.surface} />
      <Circle cx={52} cy={36} r={2.5} color={theme.colors.zombieOutline} />
      <Group origin={vec(40, 51)} transform={mouthTransform}>
        <Oval x={28} y={43} width={24} height={18} color={theme.colors.zombieOutline} />
        <Oval x={34} y={51} width={12} height={8} color={theme.colors.zombieMouthTongue} />
        <Path
          path={mouthTeeth}
          color={theme.colors.surface}
          style="stroke"
          strokeWidth={3.5}
          strokeCap="round"
        />
      </Group>
      <RoundedRect
        x={16}
        y={38}
        width={8}
        height={3}
        r={1.5}
        color={theme.colors.sprinkleYellow}
        origin={vec(20, 39)}
        transform={[{ rotate: 30 * DEG }]}
      />
      <RoundedRect
        x={50}
        y={22}
        width={8}
        height={3}
        r={1.5}
        color={theme.colors.candyPink}
        origin={vec(54, 23)}
        transform={[{ rotate: -20 * DEG }]}
      />
    </Group>
  );
};

export default Zombie;
