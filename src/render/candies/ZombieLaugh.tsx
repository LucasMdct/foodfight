import React from 'react';
import { Text } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';

export const ZombieLaugh = ({ font }: { font: SkFont | null }) => {
  if (!font) return null;
  return <Text x={4} y={-6} text="HA HA!" font={font} color="#5A4327" />;
};

export default ZombieLaugh;
