import { describe, expect, it } from 'vitest';

import { candySpeedAt, laneTopY, rectsOverlapX, spawnIntervalAt } from './math';

describe('laneTopY', () => {
  it('centres a 120px hero in each of three 200px lanes', () => {
    expect(laneTopY(0, 200, 120)).toBe(40);
    expect(laneTopY(1, 200, 120)).toBe(240);
    expect(laneTopY(2, 200, 120)).toBe(440);
  });

  it('adapts to a short landscape viewport', () => {
    expect(laneTopY(1, 120, 120)).toBe(120);
    expect(laneTopY(1, 120, 52)).toBe(154);
  });
});

describe('difficulty ramp', () => {
  it('starts at the base speed and spawn interval', () => {
    expect(candySpeedAt(0, 340, 260, 0.006)).toBe(340);
    expect(spawnIntervalAt(0, 900, 420, 0.004)).toBe(900);
  });

  it('ramps linearly before the cap', () => {
    expect(candySpeedAt(10_000, 340, 260, 0.006)).toBe(400);
    expect(spawnIntervalAt(10_000, 900, 420, 0.004)).toBe(860);
  });

  it('clamps at the late-game limits', () => {
    expect(candySpeedAt(120_000, 340, 260, 0.006)).toBe(600);
    expect(spawnIntervalAt(120_000, 900, 420, 0.004)).toBe(420);
  });
});

describe('rectsOverlapX', () => {
  it('does not count touching edges as an overlap', () => {
    expect(rectsOverlapX(10, 50, 50, 90)).toBe(false);
  });

  it('detects a one-pixel overlap', () => {
    expect(rectsOverlapX(10, 50, 49, 90)).toBe(true);
  });

  it('rejects separated rectangles', () => {
    expect(rectsOverlapX(10, 50, 90, 130)).toBe(false);
  });
});
