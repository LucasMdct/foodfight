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

  it('does not spend more than one charge when the accepted fire callback races', () => {
    const { applyPowerFired } = useGameStore.getState().actions;

    applyPowerFired(0);
    applyPowerFired(0);

    expect(useGameStore.getState().state.charges).toBe(0);
    expect(useGameStore.getState().state.powerIndex).toBe(1);
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
    expect(useGameStore.getState().state.toast).toBe('power-full');
  });
});
