import type { SkPath } from "@shopify/react-native-skia";
import {
  useFont,
  Group,
  Line,
  Canvas,
  Circle,
  Fill,
  LinearGradient,
  Path,
  Text as SkiaText,
  vec,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { createGraphPath } from "./createGraphPath";
import type { GraphProps } from "./types";

export const Slider: React.FC<GraphProps> = ({ height, width }) => {
  const font = useFont(require("../../assets/SF-Pro-Display-Bold.otf"), 17);
  const path = useMemo(
    () => createGraphPath(width, height, 60, false),
    [height, width]
  );

  const touchPos = useSharedValue(
    getPointAtPositionInPath(width / 2, width, 60, path)
  );

  const label = useDerivedValue(
    () => "$ " + (touchPos.value ? (touchPos.value.y * -1).toFixed(2) : "-"),
    [touchPos]
  );

  const textX = useDerivedValue(() => touchPos.value.x - 24, [touchPos]);
  const textY = useDerivedValue(() => touchPos.value.y - 18, [touchPos]);
  const lineP1 = useDerivedValue(
    () => vec(touchPos.value.x, touchPos.value.y + 14),
    [touchPos]
  );
  const lineP2 = useDerivedValue(
    () => vec(touchPos.value.x, height),
    [touchPos]
  );

  const gesture = Gesture.Pan().onChange((e) => {
    touchPos.value = getPointAtPositionInPath(e.x, width, 60, path);
  });
  return (
    <View style={{ height, marginBottom: 10 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.graph}>
          <Fill color="black" />
          <Path
            path={path}
            strokeWidth={4}
            style="stroke"
            strokeJoin="round"
            strokeCap="round"
          >
            <LinearGradient
              start={vec(0, height * 0.5)}
              end={vec(width * 0.5, height * 0.5)}
              colors={["black", "#DA4167"]}
            />
          </Path>
          <Group color="#fff">
            <Circle c={touchPos} r={10} />
            <Circle color="#DA4167" c={touchPos} r={7.5} />
            <SkiaText font={font} x={textX} y={textY} text={label} />
            <Line p1={lineP1} p2={lineP2} />
          </Group>
        </Canvas>
      </GestureDetector>
      <Text>Touch and drag to move center point</Text>
    </View>
  );
};

const getPointAtPositionInPath = (
  x: number,
  width: number,
  steps: number,
  path: SkPath
) => {
  "worklet";
  const index = Math.max(0, Math.floor(x / (width / steps)));
  const fraction = (x / (width / steps)) % 1;
  const p1 = path.getPoint(index);
  if (index < path.countPoints() - 1) {
    const p2 = path.getPoint(index + 1);
    // Interpolate between p1 and p2
    return {
      x: p1.x + (p2.x - p1.x) * fraction,
      y: p1.y + (p2.y - p1.y) * fraction,
    };
  }
  return p1;
};

const styles = StyleSheet.create({
  graph: {
    flex: 1,
  },
});
