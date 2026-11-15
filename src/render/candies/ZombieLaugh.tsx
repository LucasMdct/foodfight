import React, { useEffect } from 'react';
import { Group, RoundedRect, Text } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import theme from '../../theme/tokens';

export const ZOMBIE_LAUGH_TEXT = 'HA HA HA!';

const pulseOpacity = (phase: number, offset: number): number => {
  'worklet';
  const local = (phase - offset + 1) % 1;
  if (local < 0.35) return local / 0.35;
  if (local <= 0.85) return 1;
  return Math.max(0, 1 - (local - 0.85) / 0.15);
};

export const ZombieLaugh = ({ font }: { font: SkFont | null }) => {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 1050, easing: Easing.linear }), -1, false);
  }, [phase]);

  const haTwoOpacity = useDerivedValue(() => (font ? pulseOpacity(phase.value, 0) : 0));
  const haThreeOpacity = useDerivedValue(() => (font ? pulseOpacity(phase.value, 0.35 / 1.05) : 0));
  const bangOpacity = useDerivedValue(() => (font ? pulseOpacity(phase.value, 0.7 / 1.05) : 0));

  return (
    <Group opacity={font ? 1 : 0}>
      <RoundedRect x={-8} y={-20} width={96} height={18} r={9} color={theme.colors.surface} />
      <RoundedRect
        x={-8}
        y={-20}
        width={96}
        height={18}
        r={9}
        color={theme.colors.zombieLaughBorder}
        style="stroke"
        strokeWidth={1}
      />
      <Text x={0} y={-6} text="HA" font={font} color={theme.colors.zombieLaugh} />
      <Group opacity={haTwoOpacity}>
        <Text x={22} y={-6} text="HA" font={font} color={theme.colors.zombieLaugh} />
      </Group>
      <Group opacity={haThreeOpacity}>
        <Text x={44} y={-6} text="HA" font={font} color={theme.colors.zombieLaugh} />
      </Group>
      <Group opacity={bangOpacity}>
        <Text x={66} y={-6} text="!" font={font} color={theme.colors.zombieLaugh} />
      </Group>
    </Group>
  );
};

export default ZombieLaugh;
