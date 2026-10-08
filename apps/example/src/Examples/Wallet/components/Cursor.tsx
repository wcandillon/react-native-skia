import { Circle, Group, Paint } from "react-native-skia";
import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { interpolateColor, useDerivedValue } from "react-native-reanimated";

import { COLORS } from "../Model";

const COLOR_STOPS =
  COLORS.length <= 1
    ? [0]
    : COLORS.map((_, index) => index / (COLORS.length - 1));

interface CursorProps {
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: number;
}

export const Cursor = ({ x, y, width }: CursorProps) => {
  const color = useDerivedValue(() => {
    "worklet";
    const ratio = width === 0 ? 0 : x.value / width;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const interpolated = interpolateColor(clamped, COLOR_STOPS, COLORS);
    if (typeof interpolated === "string") {
      return interpolated;
    }
    const r = (interpolated & 0xff0000) >> 16;
    const g = (interpolated & 0x00ff00) >> 8;
    const b = interpolated & 0x0000ff;
    const a = ((interpolated >>> 24) & 0xff) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  });
  const transform = useDerivedValue(() => {
    "worklet";
    return [{ translateX: x.value }, { translateY: y.value }];
  });
  return (
    <Group transform={transform}>
      <Circle cx={0} cy={0} r={27} color={color} opacity={0.15} />
      <Circle cx={0} cy={0} r={18} color={color} opacity={0.15} />
      <Circle cx={0} cy={0} r={9} color={color}>
        <Paint style="stroke" strokeWidth={2} color="white" />
      </Circle>
    </Group>
  );
};
