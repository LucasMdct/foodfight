import { useSwing, useBob } from '../anim';

/**
 * Hero walk cycle: legs swing ±16° over a 0.32s half-cycle, arms swing ±14°
 * counter-phase (consumers negate for the right-side limb), body bobs 3px
 * over the same 0.32s half-cycle (== ff-bob's 0.64s full cycle / 2).
 * Mirrors the CSS keyframes ff-leg / ff-arm / ff-bob in Foodie.dc.html.
 */
export const useWalkCycle = () => {
  const legSwing = useSwing(16, 320);
  const armSwing = useSwing(14, 320);
  const bobY = useBob(3, 320);
  return { legSwing, armSwing, bobY };
};
