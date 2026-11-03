export type Who = 'alface' | 'feijao' | 'arroz';
export type Difficulty = 'mfacil' | 'facil' | 'dificil' | 'impossivel';
export type Screen = 'select' | 'difficulty' | 'game' | 'over' | 'win';
export type GameToast =
  'food-collected' | { readonly type: 'power-fired'; readonly name: string } | null;
export type VillainMood = 'feliz' | 'bravo';
export type VillainTalkKind = 'taunt' | 'ouch' | null;

/**
 * Discrete game state kept in React/Zustand. Per-frame values (hero position,
 * obstacle positions, collision flicker) live in Reanimated shared values on the
 * UI thread — see useRunnerEngine — so gameplay does NOT re-render React.
 */
export interface GameState {
  screen: Screen;
  who: Who;
  difficulty: Difficulty;
  lives: number;
  score: number;
  best: number;
  fps: number;
  villainHp: number;
  charges: number;
  powerIndex: number;
  toast: GameToast;
  toastId: number;
  villainMood: VillainMood;
  villainAttacking: boolean;
  villainTaunt: string;
  villainTalkKind: VillainTalkKind;
  villainTalkDurationMs: number;
}

export interface GameActions {
  pick: (who: Who) => void;
  toDifficulty: () => void;
  start: (difficulty?: Difficulty) => void;
  hitHero: () => void;
  incrementScore: (points: number) => void;
  applyVillainHit: () => void;
  applyPowerFired: (powerIndex: number) => void;
  collectFood: () => void;
  clearToast: (toastId: number) => void;
  clearVillainMood: () => void;
  triggerVillainBurst: () => void;
  showVillainTaunt: () => void;
  clearVillainBurst: () => void;
  clearVillainTaunt: () => void;
  toSelect: () => void;
  updateFps: (fps: number) => void;
  reset: () => void;
}

export const START_LIVES = 3;

export const INITIAL_GAME_STATE: GameState = {
  screen: 'select',
  who: 'alface',
  difficulty: 'facil',
  lives: START_LIVES,
  score: 0,
  best: 0,
  fps: 60,
  villainHp: 5,
  charges: 0,
  powerIndex: 0,
  toast: null,
  toastId: 0,
  villainMood: 'feliz',
  villainAttacking: false,
  villainTaunt: '',
  villainTalkKind: null,
  villainTalkDurationMs: 0,
};
