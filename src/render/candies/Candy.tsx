import React from 'react';
import {
  Group, Circle, Oval, Path, RoundedRect, DashPathEffect, Skia, vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import theme from '../../theme/tokens';

// Ported verbatim from FoodFight v0.0.1.dc.html lines 102-125 (viewBox 0 0 52 52).
// Whites/cream are decorative and have no matching token in theme.colors, so they
// are kept as local named constants (documented in task-4-report.md).
const DEG = Math.PI / 180;
const STICK_CREAM = '#E8D9C0';
const WHITE = '#FFFFFF';

const lolliSwirl = Skia.Path.MakeFromSVGString(
  'M26 19 m-9 0 a9 9 0 0 1 18 0 a6.5 6.5 0 0 1 -13 0 a4 4 0 0 1 8 0'
)!;
const candyFinL = Skia.Path.MakeFromSVGString('M12 26 L3 17 L6 26 L3 35 Z')!;
const candyFinR = Skia.Path.MakeFromSVGString('M40 26 L49 17 L46 26 L49 35 Z')!;
const candyStripes = Skia.Path.MakeFromSVGString(
  'M20 16 Q18 26 20 36 M26 15 Q24 26 26 37 M32 16 Q30 26 32 36'
)!;

export type CandyType = 'lolli' | 'candy' | 'donut';

/**
 * Renders a 52x52 spinning candy projectile. Spin only — position/translation
 * is the caller's responsibility (a parent Group translates this into place).
 */
export const Candy = ({ type, spin }: { type: CandyType; spin: SharedValue<number> }) => {
  const t = useDerivedValue(() => [{ rotate: spin.value }]);

  return (
    <Group origin={vec(26, 26)} transform={t}>
      {type === 'lolli' && (
        <>
          <RoundedRect x={24} y={26} width={4} height={24} r={2} color={STICK_CREAM} />
          <Circle cx={26} cy={19} r={14} color={theme.colors.candyPink} />
          <Path path={lolliSwirl} color={WHITE} style="stroke" strokeWidth={3} strokeCap="round" />
        </>
      )}
      {type === 'candy' && (
        <>
          <Path path={candyFinL} color={theme.colors.candyTealDark} />
          <Path path={candyFinR} color={theme.colors.candyTealDark} />
          <Oval x={12} y={15} width={28} height={22} color={theme.colors.candyTeal} />
          <Path path={candyStripes} color={WHITE} style="stroke" strokeWidth={2.5} opacity={0.8} />
        </>
      )}
      {type === 'donut' && (
        <>
          <Circle cx={26} cy={26} r={10} color={theme.colors.donutBase} style="stroke" strokeWidth={10} />
          <Circle cx={26} cy={26} r={10} color={theme.colors.candyPink} style="stroke" strokeWidth={9} strokeCap="round">
            <DashPathEffect intervals={[34, 63]} />
          </Circle>
          <Group origin={vec(22, 15)} transform={[{ rotate: 20 * DEG }]}>
            <RoundedRect x={20} y={14} width={5} height={2.4} r={1.2} color={theme.colors.sprinkleYellow} />
          </Group>
          <Group origin={vec(34, 21)} transform={[{ rotate: -30 * DEG }]}>
            <RoundedRect x={32} y={20} width={5} height={2.4} r={1.2} color={WHITE} />
          </Group>
          <Group origin={vec(16, 25)} transform={[{ rotate: 60 * DEG }]}>
            <RoundedRect x={14} y={24} width={5} height={2.4} r={1.2} color={theme.colors.villain} />
          </Group>
        </>
      )}
    </Group>
  );
};

export default Candy;
