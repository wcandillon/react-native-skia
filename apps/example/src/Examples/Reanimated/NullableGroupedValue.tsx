import React from "react";
import { StyleSheet } from "react-native";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { Canvas, Circle, Fill, select } from "@shopify/react-native-skia";

import { AnimationDemo } from "./Components";

interface CircleState {
  cx: number;
  cy: number;
  r: number;
}

export const NullableGroupedValue = () => {
  const data = useSharedValue<CircleState>(null as unknown as CircleState);

  useFrameCallback(({ timeSinceFirstFrame }) => {
    "worklet";
    if (timeSinceFirstFrame < 600) {
      return;
    }
    const t = (timeSinceFirstFrame - 600) / 1000;
    data.value = {
      cx: 60 + Math.cos(t * 2) * 40,
      cy: 60 + Math.sin(t * 2) * 30,
      r: 20,
    };
  }, true);

  return (
    <AnimationDemo title={"Nullable grouped value (loads after a moment)"}>
      <Canvas style={styles.canvas}>
        <Fill color="white" />
        <Circle
          cx={select(data, "cx")}
          cy={select(data, "cy")}
          r={select(data, "r")}
          color="#8556E5"
        />
      </Canvas>
    </AnimationDemo>
  );
};

const styles = StyleSheet.create({
  canvas: {
    height: 120,
    width: "100%" as const,
    backgroundColor: "#FEFEFE" as const,
  },
});
