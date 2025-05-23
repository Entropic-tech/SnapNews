import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import AppHeader from "@/components/screens/AppHeader";
import { Provider } from "react-redux";
import store, { persistor } from "../dux/store";
import { PersistGate } from 'redux-persist/integration/react';


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppHeader />
        <Navigation />
      </PersistGate>
    </Provider>
  );
}