import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { ThemeProvider } from './src/theme';
import { useGameStore } from './src/store/gameStore';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { SelectScreen } from './src/screens/SelectScreen';
import { GameScreen } from './src/screens/GameScreen';
import { styles } from './src/screens/appStyles';

function Flow() {
  const screen = useGameStore((s) => s.state.screen);
  // 'game' and 'over' both render GameScreen (over draws its modal on top).
  if (screen === 'select') return <SelectScreen />;
  return <GameScreen />;
}

export default function App() {
  const [loadingDone, setLoadingDone] = React.useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  // A missing font must not strand the player on the loader: fall back to the
  // system font and keep the game reachable.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontError) {
      console.warn('[fonts] Fredoka failed to load; using the system font', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch((error) => {
      console.warn('[orientation] landscape lock failed', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <View style={styles.container}>
          {!fontsReady || !loadingDone ? (
            <LoadingScreen ready={fontsReady} onFinished={() => setLoadingDone(true)} />
          ) : (
            <Flow />
          )}
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
