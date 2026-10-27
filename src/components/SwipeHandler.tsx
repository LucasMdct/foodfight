import React, { useCallback, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

interface SwipeHandlerProps {
  children: React.ReactNode;
  onMoveLane: (direction: -1 | 1) => void;
}

const INPUT_DEBOUNCE_MS = 100;

export const SwipeHandler = ({ children, onMoveLane }: SwipeHandlerProps) => {
  const { height } = useWindowDimensions();
  const lastInputTimeRef = useRef(0);

  const handleInput = useCallback(
    (direction: -1 | 1) => {
      const now = Date.now();
      if (now - lastInputTimeRef.current < INPUT_DEBOUNCE_MS) return;
      lastInputTimeRef.current = now;
      onMoveLane(direction);
    },
    [onMoveLane]
  );

  // Tap is the accessibility path: top half moves up, bottom half moves down.
  // It shares the debounce with flings so one physical gesture cannot double.
  const handleTap = useCallback(
    (y: number) => {
      handleInput(y < height / 2 ? -1 : 1);
    },
    [handleInput, height]
  );

  // Fling's onEnd payload has no `direction`, so use one gesture per direction
  // and pass the known direction explicitly (via runOnJS — onEnd is a worklet).
  const flingUp = useMemo(
    () =>
      Gesture.Fling()
        .direction(Directions.UP)
        .onEnd(() => {
          'worklet';
          runOnJS(handleInput)(-1); // up = toward the top lane
        }),
    [handleInput]
  );

  const flingDown = useMemo(
    () =>
      Gesture.Fling()
        .direction(Directions.DOWN)
        .onEnd(() => {
          'worklet';
          runOnJS(handleInput)(1); // down = toward the bottom lane
        }),
    [handleInput]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((event) => {
        'worklet';
        runOnJS(handleTap)(event.y);
      }),
    [handleTap]
  );

  return (
    <GestureDetector gesture={Gesture.Race(flingUp, flingDown, tap)}>{children}</GestureDetector>
  );
};
