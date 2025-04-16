import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Circle, Fill } from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { AnimationDemo, Size, Padding } from "./Components";

function mix(value: number, x: number, y: number) {
  "worklet";
  return x * (1 - value) + y * value;
}

export const InterpolationWithEasing = () => {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  const position = useDerivedValue(() => {
    return mix(progress.value, 10, width - (Size + Padding));
  });
  const radius = useDerivedValue(() => {
    return 5 + progress.value * 55;
  });
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, [progress]);
  return (
    <AnimationDemo title={"Interpolating value using an easing"}>
      <Canvas style={styles.canvas}>
        <Fill color="white" />
        <Circle cx={position} cy={20} r={radius} color="#DC4C4C" />
      </Canvas>
    </AnimationDemo>
  );
};

const styles = StyleSheet.create({
  canvas: {
    height: 40,
    width: "100%" as const,
    backgroundColor: "#FEFEFE" as const,
  },
});
