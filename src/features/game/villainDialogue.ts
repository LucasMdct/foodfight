import { GAME_CONSTANTS } from '../../types/constants';
import type { GameActions, GameState, VillainTalkKind } from '../../types/game';

export interface VillainDialogueController {
  show: (text: string, holdMs?: number, charIntervalMs?: number) => void;
  cancel: () => void;
  dispose: () => void;
}

export interface VillainDialogueStore {
  getState: () => {
    state: Pick<
      GameState,
      'screen' | 'villainTalk' | 'villainTalkKind' | 'villainTalkDurationMs' | 'dialogueRequestId'
    >;
    actions: Pick<GameActions, 'setVillainTalking' | 'clearVillainTaunt'>;
  };
  subscribe: (
    listener: (snapshot: {
      state: Pick<
        GameState,
        'screen' | 'villainTalk' | 'villainTalkKind' | 'villainTalkDurationMs' | 'dialogueRequestId'
      >;
      actions: Pick<GameActions, 'setVillainTalking' | 'clearVillainTaunt'>;
    }) => void
  ) => () => void;
}

/**
 * Resolves typewriter cadence and post-reveal hold time for a dialogue request.
 * Defeat lines tighten their cadence so the full line finishes revealing with
 * readable dwell time inside the terminal defeat window before `win` mounts.
 */
export const resolveDialogueTiming = (
  text: string,
  kind: VillainTalkKind,
  durationMs: number
): { charIntervalMs: number; holdMs: number } => {
  const defaultCadence = GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS;
  if (kind !== 'defeat' || text.length === 0 || durationMs <= 0) {
    return { charIntervalMs: defaultCadence, holdMs: durationMs };
  }

  const typingBudgetMs =
    durationMs > GAME_CONSTANTS.VILLAIN_DEFEAT_DIALOGUE_HOLD_MS
      ? durationMs - GAME_CONSTANTS.VILLAIN_DEFEAT_DIALOGUE_HOLD_MS
      : Math.floor(durationMs * 0.7);
  const charIntervalMs = Math.max(
    1,
    Math.min(defaultCadence, Math.floor(typingBudgetMs / text.length))
  );
  return { charIntervalMs, holdMs: durationMs };
};

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

  const show = (
    text: string,
    holdMs = GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS,
    charIntervalMs = GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS
  ) => {
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
    }, charIntervalMs);
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
    const { screen, villainTalk, villainTalkKind, villainTalkDurationMs, dialogueRequestId } =
      snapshot.state;
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
    const { charIntervalMs, holdMs } = resolveDialogueTiming(
      villainTalk,
      villainTalkKind,
      villainTalkDurationMs
    );
    controller.show(villainTalk, holdMs, charIntervalMs);
  };

  sync(store.getState());
  const unsubscribe = store.subscribe(sync);

  return () => {
    activeRequestId = null;
    unsubscribe();
    controller.dispose();
  };
};
