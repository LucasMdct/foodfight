import React from 'react';
import { Group, RoundedRect, Text } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';
import theme from '../../theme/tokens';

export const ZombieLaugh = ({ font }: { font: SkFont | null }) => {
  return (
    <Group opacity={font ? 1 : 0}>
      <RoundedRect x={0} y={-18} width={80} height={18} r={9} color={theme.colors.surface} />
      <RoundedRect
        x={0}
        y={-18}
        width={80}
        height={18}
        r={9}
        color={theme.colors.zombieLaughBorder}
        style="stroke"
        strokeWidth={1}
      />
      <Text x={10} y={-5} text="HA HA!" font={font} color={theme.colors.zombieLaugh} />
    </Group>
  );
};

export default ZombieLaugh;
