import type { HeroId } from '../../types/game';

/**
 * Bob animation delays ported verbatim from docs/design/project/Foodie.dc.html:
 * - Alface: line 31 (0s delay)
 * - Feijão: line 67 (-0.15s negative delay)
 * - Arroz:  line 100 (-0.30s negative delay)
 * Full bob cycle is 0.64s (half-cycle is 0.32s = 320ms).
 */
export const HERO_BOB_DELAYS_S: Record<HeroId, number> = {
  alface: 0,
  feijao: -0.15,
  arroz: -0.3,
};

export const HERO_BOB_INITIAL_RATIO: Record<HeroId, number> = {
  alface: 0,
  feijao: 0.15 / 0.32,
  arroz: 0.3 / 0.32,
};
