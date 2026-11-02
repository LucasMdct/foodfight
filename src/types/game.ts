export type Who = 'alface' | 'feijao' | 'arroz';
export type Screen = 'select' | 'game' | 'over';

/**
 * Discrete game state kept in React/Zustand. Per-frame values (hero position,
 * obstacle positions, collision flicker) live in Reanimated shared values on the
 * UI thread — see useRunnerEngine — so gameplay does NOT re-render React.
 */
export interface GameState {
  screen: Screen;
  who: Who;
  lives: number;
  score: number;
  best: number;
  fps: number;
}

export interface GameActions {
  pick: (who: Who) => void;
  start: () => void;
  hitHero: () => void;
  incrementScore: (points: number) => void;
  toSelect: () => void;
  updateFps: (fps: number) => void;
  reset: () => void;
}

export const START_LIVES = 3;

export const INITIAL_GAME_STATE: GameState = {
  screen: 'select',
  who: 'alface',
  lives: START_LIVES,
  score: 0,
  best: 0,
  fps: 60,
};
