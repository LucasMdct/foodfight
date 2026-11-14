import type { Screen } from '../../types/game';

/** Returns true only when the game is on a terminal win or loss screen. */
export const isGameOverModalVisible = (screen: Screen): boolean =>
  screen === 'over' || screen === 'win';
