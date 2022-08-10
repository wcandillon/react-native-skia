import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "react-native";

import {
  AnimationExample,
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
} from "./Examples";
import { HomeScreen } from "./Home";

const linking = {
  config: {
    screens: {
      Home: "",
      Vertices: "vertices",
      API: "api",
      Breathe: "breathe",
      Filters: "filters",
      Gooey: "gooey",
      Hue: "hue",
      Matrix: "matrix",
      Severance: "severance",
      Aurora: "aurora",
      Glassmorphism: "glassmorphism",
      Neumorphism: "neumorphism",
      Wallpaper: "wallpaper",
      Wallet: "wallet",
      Graphs: "graphs",
      Animation: "animation",
      Performance: "performance",
    },
  },
  prefixes: ["rnskia://"],
};

const App = () => {
  const Stack = createNativeStackNavigator();

  return (
    <>
      <StatusBar hidden />
      <NavigationContainer linking={linking}>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: "🎨 Skia",
              headerTitleAlign: "center",
            }}
          />
          <Stack.Screen
            name="Vertices"
            component={Vertices}
            options={{
              header: () => null,
            }}
          />
          <Stack.Screen name="API" component={API} />
          <Stack.Screen name="Breathe" component={Breathe} />
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
            name="Glassmorphism"
            component={Glassmorphism}
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
          <Stack.Screen name="Animation" component={AnimationExample} />
          <Stack.Screen name="Performance" component={PerformanceDrawingTest} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
