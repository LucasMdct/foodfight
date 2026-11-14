import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS } from '../../types/constants';
import { INITIAL_GAME_STATE, Screen, START_LIVES } from '../../types/game';
import { isGameOverModalVisible } from './gameOverVisibility';

const resetStore = () => {
  useGameStore.setState((store) => ({
    ...store,
    state: { ...INITIAL_GAME_STATE },
  }));
};

describe('isGameOverModalVisible', () => {
  beforeEach(resetStore);

  it('shows the modal only on terminal win and loss screens', () => {
    const expectations: [Screen, boolean][] = [
      ['select', false],
      ['difficulty', false],
      ['game', false],
      ['over', true],
      ['win', true],
    ];

    for (const [screen, expected] of expectations) {
      expect(isGameOverModalVisible(screen)).toBe(expected);
    }
  });

  it('stays hidden across select, difficulty, gameplay, replay, and hero switch', () => {
    const { actions } = useGameStore.getState();

    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    actions.pick('alface');
    actions.toDifficulty();
    expect(useGameStore.getState().state.screen).toBe('difficulty');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    actions.start('facil');
    expect(useGameStore.getState().state.screen).toBe('game');
    expect(useGameStore.getState().state.difficulty).toBe('facil');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    actions.incrementScore(150);

    // Lose the round -> terminal 'over'
    for (let i = 0; i < START_LIVES; i += 1) {
      actions.hitHero();
    }
    expect(useGameStore.getState().state.screen).toBe('over');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(true);

    // "Jogar de novo" -> back into playable 'game' preserving selected difficulty
    actions.reset();
    actions.start();
    expect(useGameStore.getState().state.screen).toBe('game');
    expect(useGameStore.getState().state.difficulty).toBe('facil');
    expect(useGameStore.getState().state.lives).toBe(START_LIVES);
    expect(useGameStore.getState().state.score).toBe(0);
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    // Staged defeat stays non-terminal until completeVillainDefeat finishes
    for (let i = 0; i < GAME_CONSTANTS.VILLAIN_HP; i += 1) {
      actions.applyVillainHit();
    }
    expect(useGameStore.getState().state.villainDying).toBe(true);
    expect(useGameStore.getState().state.screen).toBe('game');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    actions.completeVillainDefeat();
    expect(useGameStore.getState().state.screen).toBe('win');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(true);

    // "Trocar herói" -> select -> difficulty -> facil (preserving best score)
    actions.toSelect();
    expect(useGameStore.getState().state.screen).toBe('select');
    expect(useGameStore.getState().state.best).toBe(150);
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    actions.pick('feijao');
    actions.toDifficulty();
    expect(useGameStore.getState().state.screen).toBe('difficulty');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);

    actions.start('facil');
    expect(useGameStore.getState().state.screen).toBe('game');
    expect(useGameStore.getState().state.who).toBe('feijao');
    expect(isGameOverModalVisible(useGameStore.getState().state.screen)).toBe(false);
  });
});
