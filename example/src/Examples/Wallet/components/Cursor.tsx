import type { SkiaReadonlyValue } from "@shopify/react-native-skia";
import {
  interpolateColors,
  Circle,
  Group,
  useDerivedValue,
  Paint,
} from "@shopify/react-native-skia";
import React from "react";

import { useColorTheme, WIDTH } from "../Model";

interface CursorProps {
  x: SkiaReadonlyValue<number>;
  y: SkiaReadonlyValue<number>;
}

export const Cursor = ({ x, y }: CursorProps) => {
  const COLORS = useColorTheme();
  const color = useDerivedValue(
    () =>
      interpolateColors(
        x.current / WIDTH,
        COLORS.map((_, i) => i / COLORS.length),
        COLORS
      ),
    [x]
  );
  const transform = useDerivedValue(
    () => [{ translateX: x.current }, { translateY: y.current }],
    [x, y]
  );
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
