import React from "react";
import { Pressable, useWindowDimensions } from "react-native";
import { Canvas, Fill } from "@shopify/react-native-skia";
import { useSharedValue, withTiming } from "react-native-reanimated";

import { Switch } from "./components/Switch";

const PADDING = 32;
const x = PADDING;
const y = 75;

export const Neumorphism = () => {
  const { width } = useWindowDimensions();
  const size = width - PADDING * 2;
  const pressed = useSharedValue(0);
  return (
    <Pressable
      onPress={() => {
        pressed.value = withTiming(pressed.value ? 0 : 1, { duration: 150 });
      }}
      style={{ flex: 1 }}
    >
      <Canvas style={{ flex: 1 }}>
        <Fill color="#F0F0F3" />
        <Switch x={x} y={y} width={size} pressed={pressed} />
      </Canvas>
    </Pressable>
  );
};
