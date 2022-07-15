import {
  Canvas,
  Fill,
  SweepGradient,
  useTouchHandler,
  useValue,
  vec,
  useComputedValue,
  interpolate,
  Circle,
} from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions } from "react-native";
import { SensorType, useAnimatedSensor } from "react-native-reanimated";

const colors = [
  "#BFB2F3",
  "#96CAF7",
  "#9CDCAA",
  "#E5E1AB",
  "#F3C6A5",
  "#F8A3A8",
];
const delta = 1 / (colors.length - 1);

export const MetalicEffect = () => {
  const { width, height } = useWindowDimensions();
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 10,
  });

  const c = vec(width / 2, height / 2);
  const offsetX = useValue(c.x);
  const offsetY = useValue(c.y);
  const x = useValue(offsetX.current);
  const y = useValue(offsetY.current);
  const onTouch = useTouchHandler({
    onStart: (pos) => {
      offsetX.current = x.current - pos.x;
      offsetY.current = y.current - pos.y;
    },
    onActive: (pos) => {
      x.current = offsetX.current + pos.x;
      y.current = offsetY.current + pos.y;
    },
  });
  const positions = useComputedValue(
    () => [
      0,
      interpolate(x.current, [0, width], [0, delta]),
      interpolate(y.current, [0, height], [delta, 3 * delta]),
      interpolate(x.current, [0, width], [3 * delta, 4 * delta]),
      interpolate(y.current, [0, height], [4 * delta, 1]),
      1,
    ],
    [x, y]
  );
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Fill>
        <SweepGradient c={c} colors={colors} positions={positions} />
      </Fill>
      <Circle cx={x} cy={y} r={20} color="white" />
    </Canvas>
  );
};
