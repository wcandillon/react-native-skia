import React from "react";
import { Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useColorScheme, useTheme } from "../ColorSchemeContext";

export const ColorSchemeButton = () => {
  const theme = useTheme();
  const { toggle, colorScheme, active } = useColorScheme();
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onStart((e) => {
      if (!active) {
        toggle(e.absoluteX, e.absoluteY);
      }
    });
  return (
    <GestureDetector gesture={tap}>
      <Text style={{ fontSize: 26, color: theme.mainForeground }}>
        {colorScheme === "light" ? "🌙" : "☀️"}
      </Text>
    </GestureDetector>
  );
};
