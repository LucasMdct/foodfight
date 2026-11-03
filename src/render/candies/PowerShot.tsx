import React from 'react';
import { Circle, Group, Oval, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useSpin } from '../anim';
import type { Who } from '../../types/game';
import theme from '../../theme/tokens';

const leaf = Skia.Path.MakeFromSVGString(
  'M28 6 Q44 16 46 30 Q40 48 28 50 Q14 44 10 28 Q14 12 28 6 Z'
)!;
const leafVeins = Skia.Path.MakeFromSVGString(
  'M28 10 Q28 28 28 46 M16 22 Q28 28 40 20 M15 34 Q28 32 41 36'
)!;
const beanSpark = Skia.Path.MakeFromSVGString('M8 34 Q2 28 8 24 L18 28 Z')!;
const beanMark = Skia.Path.MakeFromSVGString('M20 22 Q16 28 20 36 Q14 28 18 22 Z')!;
const riceSpark = Skia.Path.MakeFromSVGString('M6 32 L16 28 L6 24 Z')!;
const riceSprout = Skia.Path.MakeFromSVGString('M40 18 Q44 12 42 6 Q46 12 44 18 Z')!;

export const PowerShot = ({ who }: { who: Who }) => {
  const spin = useSpin(500);
  const haloOpacity = useDerivedValue(() => 0.25 + (Math.sin(spin.value) + 1) * 0.16);
  const spinTransform = useDerivedValue(() => [{ rotate: spin.value }]);

  return (
    <Group>
      <Circle cx={28} cy={28} r={28} color={theme.colors.score} opacity={haloOpacity} />
      <Group origin={vec(28, 28)} transform={spinTransform}>
        {who === 'alface' && (
          <>
            <Path path={leaf} color={theme.colors.positive} />
            <Path
              path={leafVeins}
              color={theme.colors.leafHighlight}
              style="stroke"
              strokeWidth={2.5}
            />
          </>
        )}
        {who === 'feijao' && (
          <>
            <Path path={beanSpark} color={theme.colors.sprinkleYellow} opacity={0.9} />
            <Oval
              x={14}
              y={14}
              width={36}
              height={28}
              color={theme.colors.beanLight}
              transform={[{ rotate: (-14 * Math.PI) / 180 }]}
            />
            <Path path={beanMark} color={theme.colors.beanDark} />
            <Circle cx={38} cy={24} r={3} color={theme.colors.beanHighlight} />
          </>
        )}
        {who === 'arroz' && (
          <>
            <Path path={riceSpark} color={theme.colors.sprinkleYellow} opacity={0.9} />
            <Oval
              x={16}
              y={17}
              width={32}
              height={22}
              color={theme.colors.surfaceAlt}
              style="fill"
              transform={[{ rotate: (-12 * Math.PI) / 180 }]}
            />
            <Oval
              x={16}
              y={17}
              width={32}
              height={22}
              color={theme.colors.riceBorder}
              style="stroke"
              strokeWidth={2}
              transform={[{ rotate: (-12 * Math.PI) / 180 }]}
            />
            <Path path={riceSprout} color={theme.colors.positive} />
          </>
        )}
      </Group>
    </Group>
  );
};

export default PowerShot;
