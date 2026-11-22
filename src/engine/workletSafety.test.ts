import { describe, expect, it } from 'vitest';

import { heroIntersectsBubbleY, heroIntersectsObstacleY, villainYAt } from './combatMath';

describe('worklet closure safety', () => {
  it('keeps GAME_CONSTANTS fallback resolution inside worklet bodies', () => {
    const source = [villainYAt, heroIntersectsObstacleY, heroIntersectsBubbleY]
      .map((worklet) => worklet.toString())
      .join('\n');

    expect(source).not.toMatch(
      /(?:villainHeight|heroHeight|padding|bubbleSize|bubblePadding)\s*=\s*GAME_CONSTANTS\./
    );
  });
});
