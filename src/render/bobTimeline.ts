export interface BobTimeline {
  initialValue: number;
  firstTarget: number;
  firstDurationMs: number;
  secondTarget: number;
  secondDurationMs: number;
}

/**
 * Converts a CSS-style negative animation delay into a phase-shifted timeline
 * while keeping the bob endpoints at 0 and -px for every repeated cycle.
 */
export const bobTimelineForDelay = (
  px: number,
  halfCycleMs: number,
  delayMs: number
): BobTimeline => {
  const cycleMs = halfCycleMs * 2;
  const elapsedMs = ((-delayMs % cycleMs) + cycleMs) % cycleMs;

  if (elapsedMs <= halfCycleMs) {
    return {
      initialValue: -px * (elapsedMs / halfCycleMs),
      firstTarget: -px,
      firstDurationMs: halfCycleMs - elapsedMs,
      secondTarget: 0,
      secondDurationMs: halfCycleMs,
    };
  }

  return {
    initialValue: -px * (2 - elapsedMs / halfCycleMs),
    firstTarget: 0,
    firstDurationMs: cycleMs - elapsedMs,
    secondTarget: -px,
    secondDurationMs: halfCycleMs,
  };
};
