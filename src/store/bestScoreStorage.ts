import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BestScoreStorage } from '../types/game';

export const BEST_SCORE_STORAGE_KEY = '@foodfight/best_score';
export const MAX_BEST_SCORE = 10_000_000;

export type KeyValueStorage = BestScoreStorage;

/**
 * Validates and normalizes candidate best score values.
 * Accepts only safe integers in the [0, MAX_BEST_SCORE) range.
 */
export const normalizeBestScore = (candidate: unknown): number | null => {
  if (typeof candidate === 'number') {
    if (!Number.isSafeInteger(candidate) || candidate < 0 || candidate >= MAX_BEST_SCORE) {
      return null;
    }
    return candidate;
  }

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed >= MAX_BEST_SCORE) {
      return null;
    }
    return parsed;
  }

  return null;
};

/**
 * Asynchronously loads the persisted best score.
 * Never throws; returns the fallback memory value on read errors, missing keys,
 * or corrupted data.
 */
export const loadPersistedBestScore = async (
  fallback = 0,
  storage: KeyValueStorage = AsyncStorage
): Promise<number> => {
  const safeFallback = normalizeBestScore(fallback) ?? 0;
  try {
    const raw = await storage.getItem(BEST_SCORE_STORAGE_KEY);
    if (raw === null) return safeFallback;
    const normalized = normalizeBestScore(raw);
    if (normalized === null) return safeFallback;
    return Math.max(normalized, safeFallback);
  } catch {
    return safeFallback;
  }
};

/**
 * Asynchronously persists the best score.
 * Never throws; returns true if saved successfully, false if validation or I/O failed.
 */
export const savePersistedBestScore = async (
  score: number,
  storage: KeyValueStorage = AsyncStorage
): Promise<boolean> => {
  const validated = normalizeBestScore(score);
  if (validated === null) return false;
  try {
    await storage.setItem(BEST_SCORE_STORAGE_KEY, String(validated));
    return true;
  } catch {
    return false;
  }
};
