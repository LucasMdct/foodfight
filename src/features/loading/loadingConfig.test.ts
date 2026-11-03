import { describe, expect, it } from 'vitest';
import { LOADING_BURST_SCALE } from './loadingConfig';

describe('loading transition', () => {
  it('keeps the full logo inside the viewport during the burst', () => {
    expect(LOADING_BURST_SCALE).toBeLessThanOrEqual(1.1);
  });
});
