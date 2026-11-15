import { describe, expect, it } from 'vitest';

import { GAME_CONSTANTS } from '../../types/constants';
import theme from '../../theme/tokens';

describe('v0.0.4 game presentation contract', () => {
  it('locks the v0.0.4 Barão render dimensions and fixed pool sizes', () => {
    expect(GAME_CONSTANTS.VILLAIN_RENDER_WIDTH).toBe(224);
    expect(GAME_CONSTANTS.VILLAIN_RENDER_HEIGHT).toBe(242);
    expect(GAME_CONSTANTS.ENEMY_POOL_SIZE).toBe(12);
    expect(GAME_CONSTANTS.POWER_SHOT_POOL_SIZE).toBe(3);
    expect(GAME_CONSTANTS.BURST_EFFECT_POOL_SIZE).toBe(8);
  });

  it('exposes the v0.0.4 handoff presentation tokens', () => {
    expect(theme.colors).toMatchObject({
      zombieMouthTongue: '#FF6B6B',
      powerDisabled: '#D8CBB4',
      powerDisabledShadow: '#BEB09A',
    });
  });
});
