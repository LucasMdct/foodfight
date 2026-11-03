import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './appVersion';

describe('app version label', () => {
  it('uses the current release version', () => {
    expect(APP_VERSION).toBe('0.0.2');
  });
});
