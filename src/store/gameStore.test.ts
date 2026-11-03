import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from './gameStore';

describe('combat game store guards', () => {
  beforeEach(() => {
    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();
    useGameStore.setState((current) => ({
      state: { ...current.state, charges: 1 },
    }));
  });

  it('starts a match with no power charges until a food bubble is collected', () => {
    useGameStore.getState().actions.reset();
    useGameStore.getState().actions.start();
    expect(useGameStore.getState().state.charges).toBe(0);
  });

  it('does not spend more than one charge when the accepted fire callback races', () => {
    const { applyPowerFired } = useGameStore.getState().actions;

    applyPowerFired(0);
    applyPowerFired(0);

    expect(useGameStore.getState().state.charges).toBe(0);
    expect(useGameStore.getState().state.powerIndex).toBe(1);
  });

  it('resolves the accepted fire index to the selected hero power name', () => {
    useGameStore.getState().actions.applyPowerFired(0);

    expect(useGameStore.getState().state.toast).toEqual({
      type: 'power-fired',
      name: 'Folha Bumerangue',
    });
  });

  it('freezes the result after the villain reaches zero HP', () => {
    const { applyVillainHit, hitHero } = useGameStore.getState().actions;

    applyVillainHit();
    expect(useGameStore.getState().state.villainMood).toBe('bravo');
    for (let index = 1; index < 5; index += 1) applyVillainHit();
    hitHero();

    expect(useGameStore.getState().state.screen).toBe('win');
    expect(useGameStore.getState().state.lives).toBe(3);
  });

  it('caps food charges while changing the toast event', () => {
    const { collectFood } = useGameStore.getState().actions;

    collectFood();
    collectFood();
    collectFood();
    collectFood();

    expect(useGameStore.getState().state.charges).toBe(3);
    expect(useGameStore.getState().state.toastId).toBe(4);
    expect(useGameStore.getState().state.toast).toBe('food-collected');
  });

  it('resets combat state for replay while preserving the selected hero and best score', () => {
    const { pick, start, reset } = useGameStore.getState().actions;
    pick('arroz');
    start();
    useGameStore.setState((current) => ({
      state: { ...current.state, score: 120, best: 200, charges: 2, villainHp: 1 },
    }));

    reset();

    expect(useGameStore.getState().state).toMatchObject({
      screen: 'select',
      who: 'arroz',
      score: 0,
      best: 200,
      charges: 0,
      villainHp: 5,
    });
  });
});
