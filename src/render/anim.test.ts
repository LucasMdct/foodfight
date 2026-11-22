import { describe, expect, it } from 'vitest';
import { bobTimelineForDelay } from './bobTimeline';

describe('bob animation timeline', () => {
  it('keeps the 0 to -px endpoints while applying a negative phase delay', () => {
    const timeline = bobTimelineForDelay(3, 320, -150);

    expect(timeline.initialValue).toBeCloseTo(-1.40625, 5);
    expect(timeline.firstTarget).toBe(-3);
    expect(timeline.secondTarget).toBe(0);
    expect(timeline.firstDurationMs).toBe(170);
    expect(timeline.secondDurationMs).toBe(320);
  });

  it('starts the second half of the cycle when the delay passes the first endpoint', () => {
    const timeline = bobTimelineForDelay(3, 320, -500);

    expect(timeline.initialValue).toBeCloseTo(-1.3125, 5);
    expect(timeline.firstTarget).toBe(0);
    expect(timeline.secondTarget).toBe(-3);
    expect(timeline.firstDurationMs).toBe(140);
    expect(timeline.secondDurationMs).toBe(320);
  });
});
