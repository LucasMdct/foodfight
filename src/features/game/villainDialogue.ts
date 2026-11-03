import { GAME_CONSTANTS } from '../../types/constants';

export interface VillainDialogueController {
  show: (text: string, holdMs?: number) => void;
  cancel: () => void;
  dispose: () => void;
}

export const createVillainDialogueController = (
  onChange: (text: string) => void,
  onComplete?: () => void
): VillainDialogueController => {
  let typeTimer: ReturnType<typeof setInterval> | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

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
    clearTimers();
    onChange('');
  };

  const show = (text: string, holdMs = GAME_CONSTANTS.VILLAIN_TAUNT_DURATION_MS) => {
    clearTimers();
    if (!text) {
      onChange('');
      onComplete?.();
      return;
    }
    let charIndex = 0;
    onChange('');
    typeTimer = setInterval(() => {
      charIndex += 1;
      onChange(text.slice(0, charIndex));
      if (charIndex >= text.length) {
        if (typeTimer !== null) {
          clearInterval(typeTimer);
          typeTimer = null;
        }
        onComplete?.();
        holdTimer = setTimeout(() => {
          holdTimer = null;
          onChange('');
        }, holdMs);
      }
    }, GAME_CONSTANTS.DIALOGUE_CHAR_INTERVAL_MS);
  };

  const dispose = () => {
    clearTimers();
  };

  return { show, cancel, dispose };
};
