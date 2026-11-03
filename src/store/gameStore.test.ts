import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore, VILLAIN_OUCHES, VILLAIN_TAUNTS } from './gameStore';

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

  it('stores the selected difficulty before starting a match', () => {
    const { toDifficulty, start } = useGameStore.getState().actions;

    toDifficulty();
    expect(useGameStore.getState().state.screen).toBe('difficulty');

    start('dificil');

    expect(useGameStore.getState().state).toMatchObject({
      screen: 'game',
      difficulty: 'dificil',
    });
  });

  it('preserves the selected difficulty when replaying', () => {
    const { start, reset } = useGameStore.getState().actions;

    start('impossivel');
    reset();

    expect(useGameStore.getState().state.difficulty).toBe('impossivel');
  });

  it('records the Barão burst feedback as discrete state', () => {
    useGameStore.getState().actions.triggerVillainBurst();

    expect(useGameStore.getState().state).toMatchObject({
      villainAttacking: true,
      villainTalkKind: 'taunt',
      villainTalkDurationMs: 2600,
    });
    expect(VILLAIN_TAUNTS).toContain(useGameStore.getState().state.villainTaunt);
  });

  it('shows a random ouch line and the reaction duration after a power hit', () => {
    useGameStore.getState().actions.applyVillainHit();

    expect(useGameStore.getState().state).toMatchObject({
      villainMood: 'bravo',
      villainTalkKind: 'ouch',
      villainTalkDurationMs: 2000,
    });
    expect(VILLAIN_OUCHES).toContain(useGameStore.getState().state.villainTaunt);
  });

  it('grants milestone power without using the food pickup toast', () => {
    useGameStore.getState().actions.grantPowerCharge();

    expect(useGameStore.getState().state).toMatchObject({
      charges: 2,
      toast: 'milestone-power',
    });
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
