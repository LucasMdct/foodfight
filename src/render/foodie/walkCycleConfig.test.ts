import { describe, expect, it } from 'vitest';
import { HERO_BOB_DELAYS_S, HERO_BOB_INITIAL_RATIO } from './walkCycleConfig';

describe('useWalkCycle design constants', () => {
  it('ports exact bob offsets from Foodie.dc.html', () => {
    // Ported verbatim from docs/design/project/Foodie.dc.html:
    // Alface line 31: 0s
    // Feijão line 67: -0.15s
    // Arroz line 100: -0.30s
    expect(HERO_BOB_DELAYS_S.alface).toBe(0);
    expect(HERO_BOB_DELAYS_S.feijao).toBe(-0.15);
    expect(HERO_BOB_DELAYS_S.arroz).toBe(-0.3);

    expect(HERO_BOB_INITIAL_RATIO.alface).toBe(0);
    expect(HERO_BOB_INITIAL_RATIO.feijao).toBeCloseTo(0.46875, 4);
    expect(HERO_BOB_INITIAL_RATIO.arroz).toBeCloseTo(0.9375, 4);
  });
});
