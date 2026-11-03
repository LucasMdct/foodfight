import { create } from 'zustand';
import {
  GameState,
  GameActions,
  INITIAL_GAME_STATE,
  START_LIVES,
  Who,
  Difficulty,
} from '../types/game';
import { GAME_CONSTANTS } from '../types/constants';

interface GameStore {
  state: GameState;
  actions: GameActions;
}

export const POWER_NAMES: Record<Who, readonly [string, string, string]> = {
  alface: ['Folha Bumerangue', 'Furacão Verde', 'Muralha de Salada'],
  feijao: ['Meteoro Carioca', 'Rajada de Feijão', 'Escudo de Caldo'],
  arroz: ['Grão Turbo', 'Chuva de Arroz', 'Broto Explosivo'],
};

export const VILLAIN_TAUNTS = [
  'HAHAHA! Você NUNCA vai conseguir comer essa comida!',
  'Desiste! Criança não gosta de alface mesmo!',
  'Aposto meu chapéu que você não come nem UM feijão!',
  'Só os fortes comem arroz… e você não é! HAHA!',
  'Essa comida saudável NUNCA vai chegar no seu prato!',
  'Vai, tenta! Duvido você aguentar comer legumes!',
] as const;

export const VILLAIN_OUCHES = [
  'AI!! Isso foi… nutritivo demais!',
  'GRRR! Pare de comer direito!',
  'Meu monóculo! Que golpe saudável!',
  'Impossível! Ninguém resiste aos meus doces!',
  'AAAH! Vitaminas NÃO! Tudo menos isso!',
] as const;

export const VILLAIN_DEFEAT_LINE = 'NÃÃÃO! Meus doces! Isso não fica assim!!';

const randomFrom = <T>(values: readonly T[]): T =>
  values[Math.floor(Math.random() * values.length)];

const enterStagedDefeat = (state: GameState): GameState => ({
  ...state,
  villainHp: 0,
  villainMood: 'bravo',
  villainAttacking: false,
  villainDying: true,
  villainTalking: true,
  villainTalk: VILLAIN_DEFEAT_LINE,
  villainTaunt: VILLAIN_DEFEAT_LINE,
  villainTalkKind: 'defeat',
  villainTalkDurationMs: GAME_CONSTANTS.VILLAIN_DEFEAT_DURATION_MS,
});

export const useGameStore = create<GameStore>((set) => ({
  state: INITIAL_GAME_STATE,

  actions: {
    pick: (who: Who) => set((s) => ({ state: { ...s.state, who } })),

    toDifficulty: () => set((s) => ({ state: { ...s.state, screen: 'difficulty' } })),

    start: (difficulty?: Difficulty) =>
      set((s) => ({
        state: {
          ...s.state,
          screen: 'game',
          difficulty: difficulty ?? s.state.difficulty,
          lives: START_LIVES,
          score: 0,
          villainHp: GAME_CONSTANTS.VILLAIN_HP,
          charges: 0,
          powerIndex: 0,
          toast: null,
          villainMood: 'feliz',
          villainAttacking: false,
          villainDying: false,
          villainTalking: false,
          villainTalk: '',
          villainTaunt: '',
          villainTalkKind: null,
          villainTalkDurationMs: 0,
        },
      })),

    hitHero: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
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
      set((s) =>
        s.state.screen === 'game' && !s.state.villainDying
          ? { state: { ...s.state, score: s.state.score + points } }
          : s
      ),

    applyVillainHit: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
        const villainHp = Math.max(0, s.state.villainHp - 1);
        if (villainHp === 0) {
          return { state: enterStagedDefeat(s.state) };
        }
        const ouch = randomFrom(VILLAIN_OUCHES);
        return {
          state: {
            ...s.state,
            villainHp,
            villainMood: 'bravo',
            villainTalking: true,
            villainTalk: ouch,
            villainTaunt: ouch,
            villainTalkKind: 'ouch',
            villainTalkDurationMs: GAME_CONSTANTS.VILLAIN_OUCH_DURATION_MS,
          },
        };
      }),

    beginVillainDefeat: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
        return { state: enterStagedDefeat(s.state) };
      }),

    completeVillainDefeat: () =>
      set((s) => {
        if (s.state.screen !== 'game' || !s.state.villainDying) return s;
        return {
          state: {
            ...s.state,
            screen: 'win',
            villainTalking: false,
            best: Math.max(s.state.best, s.state.score),
          },
        };
      }),

    applyPowerFired: (powerIndex: number) =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying || s.state.charges <= 0) return s;
        return {
          state: {
            ...s.state,
            charges: s.state.charges - 1,
            powerIndex: (powerIndex + 1) % 3,
            toast: { type: 'power-fired', name: POWER_NAMES[s.state.who][powerIndex % 3] },
            toastId: s.state.toastId + 1,
          },
        };
      }),

    collectFood: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
        const charges = Math.min(GAME_CONSTANTS.POWER_MAX_CHARGES, s.state.charges + 1);
        return {
          state: {
            ...s.state,
            charges,
            toast: 'food-collected',
            toastId: s.state.toastId + 1,
          },
        };
      }),

    clearToast: (toastId: number) =>
      set((s) => (s.state.toastId === toastId ? { state: { ...s.state, toast: null } } : s)),

    clearVillainMood: () =>
      set((s) =>
        s.state.screen === 'game' && !s.state.villainDying && s.state.villainMood === 'bravo'
          ? { state: { ...s.state, villainMood: 'feliz' } }
          : s
      ),

    triggerVillainBurst: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
        const taunt = randomFrom(VILLAIN_TAUNTS);
        return {
          state: {
            ...s.state,
            villainAttacking: true,
            villainTalking: true,
            villainTalk: taunt,
            villainTaunt: taunt,
            villainTalkKind: 'taunt',
            villainTalkDurationMs: GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS,
          },
        };
      }),

    showVillainTaunt: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
        const taunt = randomFrom(VILLAIN_TAUNTS);
        return {
          state: {
            ...s.state,
            villainTalking: true,
            villainTalk: taunt,
            villainTaunt: taunt,
            villainTalkKind: 'taunt',
            villainTalkDurationMs: GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS,
          },
        };
      }),

    showVillainOuch: () =>
      set((s) => {
        if (s.state.screen !== 'game' || s.state.villainDying) return s;
        const ouch = randomFrom(VILLAIN_OUCHES);
        return {
          state: {
            ...s.state,
            villainMood: 'bravo',
            villainTalking: true,
            villainTalk: ouch,
            villainTaunt: ouch,
            villainTalkKind: 'ouch',
            villainTalkDurationMs: GAME_CONSTANTS.VILLAIN_OUCH_DURATION_MS,
          },
        };
      }),

    setVillainTalking: (talking: boolean) =>
      set((s) =>
        s.state.villainTalking === talking ? s : { state: { ...s.state, villainTalking: talking } }
      ),

    clearVillainBurst: () =>
      set((s) =>
        s.state.villainAttacking ? { state: { ...s.state, villainAttacking: false } } : s
      ),

    clearVillainTaunt: () =>
      set((s) =>
        s.state.villainTaunt || s.state.villainTalk || s.state.villainTalking
          ? {
              state: {
                ...s.state,
                villainTalking: false,
                villainTalk: '',
                villainTaunt: '',
                villainTalkKind: null,
                villainTalkDurationMs: 0,
              },
            }
          : s
      ),

    toSelect: () => set((s) => ({ state: { ...s.state, screen: 'select' } })),

    updateFps: (fps: number) => set((s) => ({ state: { ...s.state, fps } })),

    reset: () =>
      set((s) => ({
        state: {
          ...INITIAL_GAME_STATE,
          who: s.state.who,
          difficulty: s.state.difficulty,
          best: s.state.best,
        },
      })),
  },
}));
