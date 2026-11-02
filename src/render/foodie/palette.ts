/**
 * Per-character color palettes, ported verbatim from
 * docs/design/project/Foodie.dc.html.
 * These are intrinsic character colors (not brand/theme colors), so they
 * live here rather than behind useTheme().
 */
export const foodiePalette = {
  alface: {
    legFill: '#4E9A3C', footFill: '#2F6B24', armFill: '#4E9A3C',
    outer: '#66B84E', mid: '#5CAB45', innerA: '#A9DD7E', innerB: '#C9EF9F',
    eye: '#3B2B20', cheek: '#FF9DB0', mouth: '#3B2B20',
  },
  feijao: {
    legFill: '#A9723F', footFill: '#7A4E28', armFill: '#A9723F',
    body: '#C89A6B', belly: '#EBCB9E', spot: '#8A5A34',
    eye: '#3B2B20', cheek: '#FF9DB0', mouth: '#3B2B20',
  },
  arroz: {
    legFill: '#EFE4CC', footFill: '#D9C9A8', armFill: '#EFE4CC',
    body: '#FFFDF6', bodyStroke: '#EADFC8', shade: '#F1E7D2', sprout: '#7BC950',
    eye: '#3B2B20', cheek: '#FFC1CB', mouth: '#3B2B20',
  },
  vilao: {
    cup: '#D94F4F', cupDark: '#B93E3E', body: '#4A2C17', bodyHi: '#6B4226',
    hat: '#232323', hatBand: '#9B5DE5', eyeWhite: '#FFFFFF', eye: '#241206',
    monocle: '#FFD23F', wandStick: '#E8D9C0', wandCandy: '#FF7BAC', armFill: '#4A2C17',
    sprinkleTeal: '#4ECDC4', sprinkleRed: '#FF6B6B',
  },
} as const;
