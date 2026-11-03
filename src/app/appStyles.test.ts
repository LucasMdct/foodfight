import { describe, expect, it } from 'vitest';
import { APP_SURFACE_BACKGROUND } from './appSurface';
import theme from '../theme/tokens';

describe('app shell', () => {
  it('keeps the themed background visible during loading transitions', () => {
    expect(APP_SURFACE_BACKGROUND).toBe(theme.colors.bg);
  });
});
