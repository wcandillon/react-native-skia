import type { SkRect } from "@shopify/react-native-skia";
import {
  Matrix4,
  multiply4,
  rotateZ,
  scale,
  translate,
  convertToColumnMajor,
  convertToAffineMatrix,
} from "@shopify/react-native-skia";
import React from "react";
import { Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const multiply = (...matrices: Matrix4[]) => {
  "worklet";
  return matrices.reduce((acc, matrix) => multiply4(acc, matrix), Matrix4());
};

interface GestureHandlerProps {
  matrix: SharedValue<Matrix4>;
  dimensions: SkRect;
  debug?: boolean;
  label: string;
}

export const GestureHandler = ({
  matrix,
  dimensions,
  debug,
  label,
}: GestureHandlerProps) => {
  const { x, y, width, height } = dimensions;
  const origin = useSharedValue({ x: 0, y: 0 });
  const offset = useSharedValue(Matrix4());

  const pan = Gesture.Pan().onChange((e) => {
    matrix.value = multiply4(translate(e.changeX, e.changeY), matrix.value);
  });

  const rotate = Gesture.Rotation()
    .onBegin((e) => {
      origin.value = { x: e.anchorX, y: e.anchorY };
      offset.value = matrix.value;
    })
    .onChange((e) => {
      matrix.value = multiply4(offset.value, rotateZ(e.rotation, origin.value));
    });

  const pinch = Gesture.Pinch()
    .onBegin((e) => {
      origin.value = { x: e.focalX, y: e.focalY };
      offset.value = matrix.value;
    })
    .onChange((e) => {
      matrix.value = multiply4(
        offset.value,
        scale(e.scale, e.scale, 1, origin.value)
      );
    });

  const style = useAnimatedStyle(() => {
    const m = multiply(
      translate(-width / 2, -height / 2),
      matrix.value,
      translate(width / 2, height / 2)
    );
    const m4 = convertToColumnMajor(m);
    return {
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      backgroundColor: debug ? "rgba(100, 200, 300, 0.4)" : "transparent",
      transform: [
        {
          matrix:
            Platform.OS === "web"
              ? convertToAffineMatrix(m4)
              : (m4 as unknown as number[]),
        },
      ],
    };
  });
  const gesture = Gesture.Race(pinch, rotate, pan);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={style}
        accessible={true}
        accessibilityLabel={label}
      />
    </GestureDetector>
  );
};
