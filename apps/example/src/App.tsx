import type { LinkingOptions } from "@react-navigation/native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "react-native";
import type { HeaderBackButtonProps } from "@react-navigation/elements";
import { HeaderBackButton } from "@react-navigation/elements";
import { FiberProvider } from "its-fine";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

// The lines below are needed by three.js
import "fast-text-encoding";
window.parent = window;
if (!navigator.userAgent) {
  // GLTFLoader reads navigator.userAgent and calls .match on it
  (navigator as { userAgent: string }).userAgent = "react-native";
}

import {
  ReanimatedExample,
  API,
  Aurora,
  Breathe,
  Filters,
  Gooey,
  GraphsScreen,
  Hue,
  Matrix,
  Glassmorphism,
  Neumorphism,
  PerformanceDrawingTest,
  Wallpaper,
  Vertices,
  Wallet,
  Severance,
  Transitions,
  Stickers,
  FrostedCard,
  SpeedTest,
  Video,
  Chat,
  LiquidGlass,
  Pictures,
  WebGPU,
  ThreeJS,
} from "./Examples";
import { CI, Tests } from "./Tests";
import { HomeScreen } from "./Home";
import type { StackParamList } from "./types";
import { useAssets } from "./Tests/useAssets";
import { Chess } from "./Examples/Chess";
import "./resolveAssetSourcePolyfill";

const linking: LinkingOptions<StackParamList> = {
  config: {
    screens: {
      Home: "",
      Vertices: "vertices",
      API: "api",
      LiquidGlass: "liquid-glass",
      Breathe: "breathe",
      Filters: "filters",
      Gooey: "gooey",
      Hue: "hue",
      Matrix: "matrix",
      Severance: "severance",
      Aurora: "aurora",
      Chess: "chess",
      Glassmorphism: "glassmorphism",
      Neumorphism: "neumorphism",
      Wallpaper: "wallpaper",
      Wallet: "wallet",
      Graphs: "graphs",
      Animation: "animation",
      Reanimated: "reanimated",
      Performance: "performance",
      Tests: "test",
      Transitions: "transitions",
      Stickers: "stickers",
      FrostedCard: "frosted-card",
      SpeedTest: "speedtest",
      Video: "video",
      Chat: "chat",
      Pictures: "pictures",
      WebGPU: "webgpu",
      ThreeJS: "threejs",
    },
  },
  prefixes: ["rnskia://"],
};

const HeaderLeft = (props: HeaderBackButtonProps) => {
  const navigation = useNavigation();
  return (
    <HeaderBackButton
      {...props}
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
      testID="back"
    />
  );
};

enableScreens(true);

const App = () => {
  const Stack = createNativeStackNavigator<StackParamList>();
  const assets = useAssets();
  if (assets === null) {
    return null;
  }
  return (
    <FiberProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar hidden />
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            screenOptions={{
              headerLeft: HeaderLeft,
            }}
            initialRouteName={CI ? "Tests" : "Home"}
          >
            <Stack.Screen
              name="Home"
              key="Home"
              component={HomeScreen}
              options={{
                title: "🎨 Skia",
              }}
            />
            <Stack.Screen
              key="Tests"
              name="Tests"
              options={{
                title: "🔧 Tests",
              }}
            >
              {(props) => <Tests {...props} assets={assets} />}
            </Stack.Screen>
            <Stack.Screen
              name="Vertices"
              component={Vertices}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen name="API" component={API} />
            <Stack.Screen name="LiquidGlass" component={LiquidGlass} />
            <Stack.Screen name="Breathe" component={Breathe} />
            <Stack.Screen
              name="Chess"
              component={Chess}
              options={{
                title: "👸🏼's Gambit",
              }}
            />
            <Stack.Screen name="Filters" component={Filters} />
            <Stack.Screen name="Gooey" component={Gooey} />
            <Stack.Screen name="Hue" component={Hue} />
            <Stack.Screen
              name="Matrix"
              component={Matrix}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="Severance"
              component={Severance}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="Aurora"
              component={Aurora}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="SpeedTest"
              component={SpeedTest}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="Glassmorphism"
              component={Glassmorphism}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="FrostedCard"
              component={FrostedCard}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen name="Neumorphism" component={Neumorphism} />
            <Stack.Screen
              name="Wallpaper"
              component={Wallpaper}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="Wallet"
              component={Wallet}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen name="Graphs" component={GraphsScreen} />
            <Stack.Screen name="Reanimated" component={ReanimatedExample} />
            <Stack.Screen name="Stickers" component={Stickers} />
            <Stack.Screen
              name="Transitions"
              component={Transitions}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="Video"
              component={Video}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="Chat"
              component={Chat}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Performance"
              component={PerformanceDrawingTest}
            />
            <Stack.Screen name="Pictures" component={Pictures} />
            <Stack.Screen
              name="WebGPU"
              component={WebGPU}
              options={{
                header: () => null,
              }}
            />
            <Stack.Screen
              name="ThreeJS"
              component={ThreeJS}
              options={{
                header: () => null,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </FiberProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
