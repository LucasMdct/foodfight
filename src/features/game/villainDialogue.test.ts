import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GAME_CONSTANTS } from '../../types/constants';
import { useGameStore, VILLAIN_OUCHES, VILLAIN_TAUNTS } from '../../store/gameStore';
import { bindVillainDialogue, createVillainDialogueController } from './villainDialogue';

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

  it('restarts identical dialogue requested during typing and prevents stale timers from clearing it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();

    let visibleText = '';
    const unsubscribe = bindVillainDialogue(useGameStore, (text) => {
      visibleText = text;
    });

    const expectedLine = VILLAIN_OUCHES[0];
    const typeDuration = expectedLine.length * GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS;

    useGameStore.getState().actions.applyVillainHit();
    expect(useGameStore.getState().state.villainHp).toBe(4);
    expect(useGameStore.getState().state.dialogueRequestId).toBe(1);

    vi.advanceTimersByTime(GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS * 3);
    expect(visibleText).toBe(expectedLine.slice(0, 3));
    expect(useGameStore.getState().state.villainTalking).toBe(true);

    useGameStore.getState().actions.applyVillainHit();
    expect(useGameStore.getState().state.villainHp).toBe(3);
    expect(useGameStore.getState().state.dialogueRequestId).toBe(2);
    expect(visibleText).toBe('');

    const elapsedBeforeRestart = GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS * 3;
    vi.advanceTimersByTime(typeDuration - elapsedBeforeRestart);
    expect(useGameStore.getState().state.villainTalking).toBe(true);
    expect(visibleText).toBe(expectedLine.slice(0, expectedLine.length - 3));

    vi.advanceTimersByTime(elapsedBeforeRestart);
    expect(visibleText).toBe(expectedLine);
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    vi.advanceTimersByTime(GAME_CONSTANTS.VILLAIN_OUCH_DURATION_MS - 1);
    expect(visibleText).toBe(expectedLine);

    vi.advanceTimersByTime(1);
    expect(visibleText).toBe('');
    expect(useGameStore.getState().state.villainTalk).toBe('');
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    unsubscribe();
    vi.restoreAllMocks();
  });

  it('restarts identical dialogue requested during hold so the old hold timer cannot hide it or strand the mouth', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();

    let visibleText = '';
    const unsubscribe = bindVillainDialogue(useGameStore, (text) => {
      visibleText = text;
    });

    const expectedLine = VILLAIN_OUCHES[0];
    const typeDuration = expectedLine.length * GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS;

    useGameStore.getState().actions.applyVillainHit();
    vi.advanceTimersByTime(typeDuration);
    expect(visibleText).toBe(expectedLine);
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    vi.advanceTimersByTime(GAME_CONSTANTS.VILLAIN_OUCH_DURATION_MS - 200);
    expect(visibleText).toBe(expectedLine);

    useGameStore.getState().actions.applyVillainHit();
    expect(useGameStore.getState().state.villainHp).toBe(3);
    expect(useGameStore.getState().state.dialogueRequestId).toBe(2);
    expect(useGameStore.getState().state.villainTalking).toBe(true);
    expect(visibleText).toBe('');

    // Advance past the first request's remaining 200ms hold window: second request must still type cleanly.
    vi.advanceTimersByTime(260);
    expect(visibleText).toBe(expectedLine.slice(0, 4));
    expect(useGameStore.getState().state.villainTalking).toBe(true);

    vi.advanceTimersByTime(typeDuration - 260);
    expect(visibleText).toBe(expectedLine);
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    vi.advanceTimersByTime(GAME_CONSTANTS.VILLAIN_OUCH_DURATION_MS - 1);
    expect(visibleText).toBe(expectedLine);
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    vi.advanceTimersByTime(1);
    expect(visibleText).toBe('');
    expect(useGameStore.getState().state.villainTalk).toBe('');
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    unsubscribe();
    vi.restoreAllMocks();
  });

  it('restarts identical taunt dialogue requested during hold across triggerVillainBurst and showVillainTaunt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();

    let visibleText = '';
    const unsubscribe = bindVillainDialogue(useGameStore, (text) => {
      visibleText = text;
    });

    const expectedTaunt = VILLAIN_TAUNTS[0];
    const typeDuration = expectedTaunt.length * GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS;

    useGameStore.getState().actions.showVillainTaunt();
    vi.advanceTimersByTime(typeDuration);
    expect(visibleText).toBe(expectedTaunt);
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    vi.advanceTimersByTime(GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS - 100);
    useGameStore.getState().actions.triggerVillainBurst();
    expect(useGameStore.getState().state.dialogueRequestId).toBe(2);
    expect(useGameStore.getState().state.villainTalking).toBe(true);
    expect(visibleText).toBe('');

    vi.advanceTimersByTime(typeDuration);
    expect(visibleText).toBe(expectedTaunt);
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    vi.advanceTimersByTime(GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS);
    expect(visibleText).toBe('');
    expect(useGameStore.getState().state.villainTalking).toBe(false);

    unsubscribe();
    vi.restoreAllMocks();
  });

  it('cancels active typing on game over and allows the same opening taunt on replay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();

    let visibleText = '';
    const unsubscribe = bindVillainDialogue(useGameStore, (text) => {
      visibleText = text;
    });

    const expectedTaunt = VILLAIN_TAUNTS[0];
    useGameStore.getState().actions.showVillainTaunt();
    vi.advanceTimersByTime(GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS * 4);
    expect(visibleText).toBe(expectedTaunt.slice(0, 4));
    expect(useGameStore.getState().state.villainTalking).toBe(true);

    useGameStore.getState().actions.hitHero();
    useGameStore.getState().actions.hitHero();
    useGameStore.getState().actions.hitHero();
    expect(useGameStore.getState().state.screen).toBe('over');
    expect(useGameStore.getState().state.villainTalking).toBe(false);
    expect(visibleText).toBe('');

    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();
    useGameStore.getState().actions.showVillainTaunt();
    expect(useGameStore.getState().state.dialogueRequestId).toBe(1);

    vi.advanceTimersByTime(GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS * 2);
    expect(visibleText).toBe(expectedTaunt.slice(0, 2));

    unsubscribe();
    vi.restoreAllMocks();
  });
});
