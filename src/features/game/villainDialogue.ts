import { GAME_CONSTANTS } from '../../types/constants';
import type { GameActions, GameState } from '../../types/game';

export interface VillainDialogueController {
  show: (text: string, holdMs?: number) => void;
  cancel: () => void;
  dispose: () => void;
}

export interface VillainDialogueStore {
  getState: () => {
    state: Pick<
      GameState,
      'screen' | 'villainTalk' | 'villainTalkDurationMs' | 'dialogueRequestId'
    >;
    actions: Pick<GameActions, 'setVillainTalking' | 'clearVillainTaunt'>;
  };
  subscribe: (
    listener: (snapshot: {
      state: Pick<
        GameState,
        'screen' | 'villainTalk' | 'villainTalkDurationMs' | 'dialogueRequestId'
      >;
      actions: Pick<GameActions, 'setVillainTalking' | 'clearVillainTaunt'>;
    }) => void
  ) => () => void;
}

/**
 * Drives the character-by-character typewriter effect and post-line hold timer
 * for villain dialogue on the JS thread without touching per-frame worklets.
 */
export const createVillainDialogueController = (
  onChange: (text: string) => void,
  onComplete?: () => void,
  onHoldExpire?: () => void
): VillainDialogueController => {
  let typeTimer: ReturnType<typeof setInterval> | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let requestToken = 0;

  const clearTimers = () => {
    if (typeTimer !== null) {
      clearInterval(typeTimer);
      typeTimer = null;
    }
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const cancel = () => {
    requestToken += 1;
    clearTimers();
    onChange('');
  };

  const show = (text: string, holdMs = GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS) => {
    requestToken += 1;
    const token = requestToken;
    clearTimers();
    if (!text) {
      onChange('');
      onComplete?.();
      onHoldExpire?.();
      return;
    }
    let charIndex = 0;
    onChange('');
    typeTimer = setInterval(() => {
      if (token !== requestToken) return;
      charIndex += 1;
      onChange(text.slice(0, charIndex));
      if (charIndex >= text.length) {
        if (typeTimer !== null) {
          clearInterval(typeTimer);
          typeTimer = null;
        }
        onComplete?.();
        holdTimer = setTimeout(() => {
          if (token !== requestToken) return;
          holdTimer = null;
          onChange('');
          onHoldExpire?.();
        }, holdMs);
      }
    }, GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS);
  };

  const dispose = () => {
    requestToken += 1;
    clearTimers();
  };

  return { show, cancel, dispose };
};

/**
 * Binds discrete store dialogue requests (`dialogueRequestId`) to the typewriter
 * controller so repeated lines restart typing and ignore `villainTalking` changes.
 */
export const bindVillainDialogue = (
  store: VillainDialogueStore,
  onTextChange: (text: string) => void
): (() => void) => {
  let lastText = '';
  let lastSeenRequestId = -1;
  let activeRequestId: number | null = null;

  const emitText = (nextText: string) => {
    if (nextText === lastText) return;
    lastText = nextText;
    onTextChange(nextText);
  };

  const controller = createVillainDialogueController(
    emitText,
    () => {
      const requestId = activeRequestId;
      if (requestId !== null) {
        store.getState().actions.setVillainTalking(false, requestId);
      }
    },
    () => {
      const requestId = activeRequestId;
      if (requestId !== null) {
        activeRequestId = null;
        store.getState().actions.clearVillainTaunt(requestId);
      }
    }
  );

  const sync = (snapshot: ReturnType<VillainDialogueStore['getState']>) => {
    const { screen, villainTalk, villainTalkDurationMs, dialogueRequestId } = snapshot.state;
    if (screen !== 'game' || dialogueRequestId <= 0 || !villainTalk || villainTalkDurationMs <= 0) {
      lastSeenRequestId = dialogueRequestId;
      if (activeRequestId !== null) {
        activeRequestId = null;
        controller.cancel();
      } else {
        emitText('');
      }
      return;
    }

    if (dialogueRequestId === lastSeenRequestId) return;

    lastSeenRequestId = dialogueRequestId;
    activeRequestId = dialogueRequestId;
    controller.show(villainTalk, villainTalkDurationMs);
  };

  sync(store.getState());
  const unsubscribe = store.subscribe(sync);

  return () => {
    activeRequestId = null;
    unsubscribe();
    controller.dispose();
  };
};
