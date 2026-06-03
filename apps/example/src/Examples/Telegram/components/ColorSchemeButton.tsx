import React from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useColorScheme, useTheme } from "../ColorSchemeContext";

import { Icon } from "./Icon";

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
      <View>
        <Icon
          name={colorScheme === "light" ? "moon" : "sun"}
          size={26}
          color={theme.mainForeground}
        />
      </View>
    </GestureDetector>
  );
};
