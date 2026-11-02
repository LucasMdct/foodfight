/**
 * Pure engine math.
 *
 * These helpers are called from the UI-thread frame loop, so they are marked
 * as worklets and must stay allocation-free: no objects, no arrays, no
 * closures created per call. Keeping them in a separate module makes the
 * formulas testable in Node without pulling React Native or Reanimated in.
 */

/** Top-Y of a rectangle of `itemHeight`, vertically centred in a lane. */
export const laneTopY = (lane: number, laneHeight: number, itemHeight: number): number => {
  'worklet';
  return lane * laneHeight + (laneHeight - itemHeight) / 2;
};

/** Candy speed in px/s, ramping from `base` by `rampRate` up to `rampMax`. */
export const candySpeedAt = (
  elapsedMs: number,
  base: number,
  rampMax: number,
  rampRate: number
): number => {
  'worklet';
  return base + Math.min(rampMax, elapsedMs * rampRate);
};

/** Spawn interval in ms, tightening from `base` toward `min`. */
export const spawnIntervalAt = (
  elapsedMs: number,
  base: number,
  min: number,
  rampRate: number
): number => {
  'worklet';
  return Math.max(min, base - elapsedMs * rampRate);
};

/** X-axis overlap of two half-open rectangles. Touching edges do not count. */
export const rectsOverlapX = (
  aLeft: number,
  aRight: number,
  bLeft: number,
  bRight: number
): boolean => {
  'worklet';
  return aLeft < bRight && aRight > bLeft;
};
