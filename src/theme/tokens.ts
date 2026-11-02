export const theme = {
  colors: {
    brand: '#FF6B6B', brandShadow: '#E04F4F',
    positive: '#7BC950', positiveShadow: '#59A335',
    score: '#FFB627', scoreShadow: '#E09A10',
    villain: '#9B5DE5', villainBorder: '#E5D4F7',
    candyPink: '#FF7BAC', candyTeal: '#4ECDC4', candyTealDark: '#3BB8B0',
    donutBase: '#F4A259', sprinkleYellow: '#FFD23F',
    bg: '#FFF3E2', bgGradTop: '#FFE9C9', bgGradMid: '#FFF4E0', bgGradBottom: '#FFEFD6',
    surface: '#FFFFFF', surfaceAlt: '#FFFDF6',
    border: '#F0DFC0', borderSoft: '#E7D8BD',
    heartFull: '#FF6B6B', heartEmpty: '#E9DAC4',
    textStrong: '#5A4327', textBody: '#8A6A45', textMuted: '#B08F63',
    overlay: 'rgba(70,40,10,0.45)',
    shadowWarm: 'rgba(90,60,20,0.14)',
    heroShadow: 'rgba(90,50,10,0.18)',
    laneDivider: 'rgba(138,90,52,0.28)',
    tableGrid: 'rgba(255,107,107,0.13)',
  },
  radii: { sm: 14, md: 16, lg: 20, xl: 26, xxl: 30, pill: 999 },
  space: { xs: 4, sm: 8, md: 14, lg: 20, xl: 24 },
  font: {
    regular: 'Fredoka_400Regular',
    medium: 'Fredoka_500Medium',
    semibold: 'Fredoka_600SemiBold',
    bold: 'Fredoka_700Bold',
  },
} as const;

export type Theme = typeof theme;
export default theme;
