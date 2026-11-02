import { useEffect } from 'react';
import {
  useSharedValue, withRepeat, withTiming, Easing, type SharedValue,
} from 'react-native-reanimated';

const DEG = Math.PI / 180;

/** Ping-pong rotation in radians: -deg..+deg over periodMs each half. */
export const useSwing = (deg: number, periodMs: number): SharedValue<number> => {
  const v = useSharedValue(-deg * DEG);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(deg * DEG, { duration: periodMs, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, [deg, periodMs, v]);
  return v;
};

/** Ping-pong vertical bob: 0..-px over periodMs each half. */
export const useBob = (px: number, periodMs: number): SharedValue<number> => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(-px, { duration: periodMs, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, [px, periodMs, v]);
  return v;
};

/** Continuous rotation 0..2π (dir=-1 reverses). */
export const useSpin = (periodMs: number, dir: 1 | -1 = 1): SharedValue<number> => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(dir * 2 * Math.PI, { duration: periodMs, easing: Easing.linear }),
      -1, false,
    );
  }, [periodMs, dir, v]);
  return v;
};
