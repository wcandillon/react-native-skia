import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Circle, Fill } from "@shopify/react-native-skia";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useSharedValue, withDecay } from "react-native-reanimated";

import { AnimationDemo, Size, Padding } from "./Components";

export const AnimationWithTouchHandler = () => {
  const { width } = useWindowDimensions();

  const translateX = useSharedValue((width - Size - Padding) / 2);

  const gesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value += e.changeX;
    })
    .onEnd((e) => {
      const leftBoundary = Size;
      const rightBoundary = width - Size - Padding;
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [leftBoundary, rightBoundary],
      });
    });

  return (
    <AnimationDemo title={"Decay animation with touch handler"}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.canvas}>
          <Fill color="white" />
          <Circle cx={translateX} cy={40} r={20} color="#3E3E" />
          <Circle cx={translateX} cy={40} r={15} color="#AEAE" />
        </Canvas>
      </GestureDetector>
    </AnimationDemo>
  );
};

const styles = StyleSheet.create({
  canvas: {
    height: 80,
    width: "100%" as const,
    backgroundColor: "#FEFEFE" as const,
  },
});
