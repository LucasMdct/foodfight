import { useEffect, useMemo } from 'react';
import {
  useSharedValue,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { bobTimelineForDelay } from './bobTimeline';

export { bobTimelineForDelay } from './bobTimeline';
export type { BobTimeline } from './bobTimeline';

const DEG = Math.PI / 180;

/** Ping-pong rotation in radians: -deg..+deg over periodMs each half. */
export const useSwing = (deg: number, periodMs: number): SharedValue<number> => {
  const v = useSharedValue(-deg * DEG);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(deg * DEG, { duration: periodMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [deg, periodMs, v]);
  return v;
};

/** Ping-pong vertical bob: 0..-px over periodMs each half. */
export const useBob = (px: number, periodMs: number, phaseDelayMs = 0): SharedValue<number> => {
  const timeline = useMemo(
    () => bobTimelineForDelay(px, periodMs, phaseDelayMs),
    [periodMs, phaseDelayMs, px]
  );
  const v = useSharedValue(timeline.initialValue);
  useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withTiming(timeline.firstTarget, {
          duration: timeline.firstDurationMs,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(timeline.secondTarget, {
          duration: timeline.secondDurationMs,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, [timeline, v]);
  return v;
};

/** Continuous rotation 0..2π (dir=-1 reverses). */
export const useSpin = (periodMs: number, dir: 1 | -1 = 1): SharedValue<number> => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(dir * 2 * Math.PI, { duration: periodMs, easing: Easing.linear }),
      -1,
      false
    );
  }, [periodMs, dir, v]);
  return v;
};
