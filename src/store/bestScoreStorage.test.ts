import { describe, expect, it, vi } from 'vitest';
import {
  BEST_SCORE_STORAGE_KEY,
  loadPersistedBestScore,
  normalizeBestScore,
  savePersistedBestScore,
  type KeyValueStorage,
} from './bestScoreStorage';

const createMockStorage = (initialData: Record<string, string> = {}): KeyValueStorage => {
  const store = { ...initialData };
  return {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
  };
};

describe('bestScoreStorage', () => {
  describe('normalizeBestScore', () => {
    it('accepts valid integers >= 0', () => {
      expect(normalizeBestScore(0)).toBe(0);
      expect(normalizeBestScore(100)).toBe(100);
      expect(normalizeBestScore('250')).toBe(250);
      expect(normalizeBestScore(' 450 ')).toBe(450);
    });

    it('rejects negative numbers and negative strings', () => {
      expect(normalizeBestScore(-1)).toBeNull();
      expect(normalizeBestScore('-10')).toBeNull();
    });

    it('rejects non-integers and floats', () => {
      expect(normalizeBestScore(12.34)).toBeNull();
      expect(normalizeBestScore('12.34')).toBeNull();
    });

    it('rejects non-numeric strings, NaN, Infinity, and objects', () => {
      expect(normalizeBestScore('corrupted')).toBeNull();
      expect(normalizeBestScore('{"score": 100}')).toBeNull();
      expect(normalizeBestScore(NaN)).toBeNull();
      expect(normalizeBestScore(Infinity)).toBeNull();
      expect(normalizeBestScore(-Infinity)).toBeNull();
      expect(normalizeBestScore(null)).toBeNull();
      expect(normalizeBestScore(undefined)).toBeNull();
      expect(normalizeBestScore({})).toBeNull();
    });
  });

  describe('loadPersistedBestScore', () => {
    it('returns fallback on first run when key is missing', async () => {
      const storage = createMockStorage();
      const result = await loadPersistedBestScore(0, storage);
      expect(result).toBe(0);
      expect(storage.getItem).toHaveBeenCalledWith(BEST_SCORE_STORAGE_KEY);
    });

    it('loads and parses valid persisted score', async () => {
      const storage = createMockStorage({ [BEST_SCORE_STORAGE_KEY]: '320' });
      const result = await loadPersistedBestScore(0, storage);
      expect(result).toBe(320);
    });

    it('preserves higher fallback if stored value is lower', async () => {
      const storage = createMockStorage({ [BEST_SCORE_STORAGE_KEY]: '150' });
      const result = await loadPersistedBestScore(300, storage);
      expect(result).toBe(300);
    });

    it('returns fallback when storage contains corrupted content', async () => {
      const storage = createMockStorage({ [BEST_SCORE_STORAGE_KEY]: 'invalid_junk' });
      const result = await loadPersistedBestScore(200, storage);
      expect(result).toBe(200);
    });

    it('recovers with fallback when storage throws an I/O error without crashing', async () => {
      const storage: KeyValueStorage = {
        getItem: vi.fn(async () => {
          throw new Error('Disk read failure');
        }),
        setItem: vi.fn(async () => {}),
      };
      const result = await loadPersistedBestScore(150, storage);
      expect(result).toBe(150);
    });
  });

  describe('savePersistedBestScore', () => {
    it('saves valid best score as string', async () => {
      const storage = createMockStorage();
      const success = await savePersistedBestScore(500, storage);
      expect(success).toBe(true);
      expect(storage.setItem).toHaveBeenCalledWith(BEST_SCORE_STORAGE_KEY, '500');
    });

    it('rejects invalid scores without writing to storage', async () => {
      const storage = createMockStorage();
      const successNegative = await savePersistedBestScore(-50, storage);
      expect(successNegative).toBe(false);
      expect(storage.setItem).not.toHaveBeenCalled();

      const successFloat = await savePersistedBestScore(12.5, storage);
      expect(successFloat).toBe(false);
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('returns false and does not throw when storage throws write error', async () => {
      const storage: KeyValueStorage = {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {
          throw new Error('Disk full');
        }),
      };
      const success = await savePersistedBestScore(400, storage);
      expect(success).toBe(false);
    });
  });
});
