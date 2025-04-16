import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Circle, Fill, Line } from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

import { AnimationDemo, Size, Padding } from "./Components";

const FgColor = "#DC4C4C";
const BgColor = "#EC795A";

export const SpringBackTouchAnimation = () => {
  const { width } = useWindowDimensions();

  const startX = width / 2 - (Size * 2 - Padding) + Size;
  const startY = 2 * Size;
  const centerX = useSharedValue(startX);
  const centerY = useSharedValue(startY);

  const rectCenter = useDerivedValue(() => {
    return { x: centerX.value, y: centerY.value };
  });

  const gesture = Gesture.Pan()
    .onChange((e) => {
      centerX.value += e.changeX;
      centerY.value += e.changeY;
    })
    .onEnd(() => {
      centerX.value = withSpring(startX);
      centerY.value = withSpring(startY);
    });

  return (
    <AnimationDemo title={"Spring back animation"}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.canvas}>
          <Fill color="white" />
          <Line
            p1={{ x: width / 2 - (Size - Padding), y: 0 }}
            p2={rectCenter}
            color={BgColor}
            strokeWidth={2}
            style="fill"
          />
          <Circle c={rectCenter} r={Size} color={FgColor} />
          <Circle
            c={rectCenter}
            r={Size}
            color={BgColor}
            strokeWidth={5}
            style="stroke"
          />
        </Canvas>
      </GestureDetector>
    </AnimationDemo>
  );
};

const styles = StyleSheet.create({
  canvas: {
    height: 280,
    width: "100%" as const,
    backgroundColor: "#FEFEFE" as const,
  },
});
