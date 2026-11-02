import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, Text, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useTheme } from '../../theme';
import { Foodie } from '../../render/foodie/Foodie';
import { makeStyles } from './LoadingScreen.styles';

const BAR_DURATION_MS = 1200;

export const LoadingScreen = ({ ready, onFinished }: { ready: boolean; onFinished: () => void }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [barDone, setBarDone] = useState(false);
  const barValue = useRef(new RNAnimated.Value(0)).current;
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const firedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  // Animate the progress bar to 100% once, on mount.
  useEffect(() => {
    RNAnimated.timing(barValue, {
      toValue: 100,
      duration: BAR_DURATION_MS,
      useNativeDriver: false, // width can't use the native driver
    }).start(() => setBarDone(true));
  }, [barValue]);

  const burst = useCallback(() => {
    RNAnimated.parallel([
      RNAnimated.spring(scaleAnim, { toValue: 4, damping: 12, useNativeDriver: true }),
      RNAnimated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      onFinishedRef.current();
    });
  }, [scaleAnim, fadeAnim]);

  // Fire onFinished exactly once, once BOTH the bar is full and fonts/assets are ready.
  useEffect(() => {
    if (barDone && ready && !firedRef.current) {
      firedRef.current = true;
      burst();
    }
  }, [barDone, ready, burst]);

  const barWidth = barValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <RNAnimated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
    >
      <Text style={styles.logo}>FOOD FIGHT</Text>
      <Canvas style={styles.foodieCanvas}>
        <Foodie who="alface" size={130} />
      </Canvas>
      <View style={styles.barTrack}>
        <RNAnimated.View style={[styles.barFill, { width: barWidth }]} />
      </View>
    </RNAnimated.View>
  );
};
