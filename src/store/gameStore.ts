import { create } from 'zustand';
import { GameState, GameActions, INITIAL_GAME_STATE, START_LIVES, Who } from '../types/game';

interface GameStore {
  state: GameState;
  actions: GameActions;
}

export const useGameStore = create<GameStore>((set) => ({
  state: INITIAL_GAME_STATE,

  actions: {
    pick: (who: Who) => set((s) => ({ state: { ...s.state, who } })),

    start: () =>
      set((s) => ({
        state: { ...s.state, screen: 'game', lives: START_LIVES, score: 0 },
      })),

    hitHero: () =>
      set((s) => {
        const lives = Math.max(0, s.state.lives - 1);
        if (lives === 0) {
          return {
            state: {
              ...s.state,
              lives,
              screen: 'over',
              best: Math.max(s.state.best, s.state.score),
            },
          };
        }
        return { state: { ...s.state, lives } };
      }),

    incrementScore: (points: number) =>
      set((s) => ({ state: { ...s.state, score: s.state.score + points } })),

    toSelect: () => set((s) => ({ state: { ...s.state, screen: 'select' } })),

    updateFps: (fps: number) => set((s) => ({ state: { ...s.state, fps } })),

    reset: () =>
      set((s) => ({ state: { ...INITIAL_GAME_STATE, who: s.state.who, best: s.state.best } })),
  },
}));
