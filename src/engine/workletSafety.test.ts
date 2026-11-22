import { describe, expect, it } from 'vitest';

import * as combatMath from './combatMath';

describe('worklet closure safety', () => {
  it('keeps GAME_CONSTANTS fallback resolution inside worklet bodies', () => {
    const source = Object.values(combatMath)
      .filter((value) => typeof value === 'function')
      .map((worklet) => String(worklet))
      .filter((worklet) => worklet.includes("'worklet'") || worklet.includes('"worklet"'))
      .join('\n');

    expect(source).not.toMatch(/\([^)]*=\s*GAME_CONSTANTS\./);
  });
});
