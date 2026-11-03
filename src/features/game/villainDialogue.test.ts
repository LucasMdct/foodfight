import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createVillainDialogueController } from './villainDialogue';

describe('villain typewriter dialogue controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reveals one character every 65ms, notifies completion, and clears after the hold duration', () => {
    const snapshots: string[] = [];
    let completedCount = 0;
    const controller = createVillainDialogueController(
      (text) => snapshots.push(text),
      () => {
        completedCount += 1;
      }
    );

    controller.show('ABC', 2200);
    expect(snapshots.at(-1)).toBe('');

    vi.advanceTimersByTime(65);
    expect(snapshots.at(-1)).toBe('A');
    expect(completedCount).toBe(0);

    vi.advanceTimersByTime(130);
    expect(snapshots.at(-1)).toBe('ABC');
    expect(completedCount).toBe(1);

    vi.advanceTimersByTime(2200);
    expect(snapshots.at(-1)).toBe('');
  });

  it('cancels the previous typewriter interval and hold timer when a new line starts', () => {
    const snapshots: string[] = [];
    const controller = createVillainDialogueController(
      (text) => snapshots.push(text),
      () => undefined
    );

    controller.show(' PRIMEIRA ', 2800);
    vi.advanceTimersByTime(130);

    controller.show('OI', 2200);
    expect(snapshots.at(-1)).toBe('');

    vi.advanceTimersByTime(65);
    expect(snapshots.at(-1)).toBe('O');

    vi.advanceTimersByTime(65);
    expect(snapshots.at(-1)).toBe('OI');

    vi.advanceTimersByTime(2199);
    expect(snapshots.at(-1)).toBe('OI');

    vi.advanceTimersByTime(1);
    expect(snapshots.at(-1)).toBe('');
  });

  it('stops active timers when disposed', () => {
    const snapshots: string[] = [];
    const controller = createVillainDialogueController(
      (text) => snapshots.push(text),
      () => undefined
    );

    controller.show('TESTE', 2800);
    vi.advanceTimersByTime(65);
    expect(snapshots.at(-1)).toBe('T');

    controller.dispose();
    vi.advanceTimersByTime(5000);
    expect(snapshots.at(-1)).toBe('T');
  });
});
