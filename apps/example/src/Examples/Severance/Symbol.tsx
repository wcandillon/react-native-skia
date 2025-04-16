import type { SkFont, Vector } from "@shopify/react-native-skia";
import {
  interpolate,
  dist,
  vec,
  Group,
  Text,
} from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

import { createNoise2D } from "../../components/SimpleNoise";

import { FG } from "./Theme";

export const COLS = 5;
export const ROWS = 10;
const DIGITS = new Array(10).fill(0).map((_, i) => `${i}`);
const F = 0.0008;
const R = 125;
const A = 10;

interface SymbolProps {
  i: number;
  j: number;
  font: SkFont;
  pointer: SharedValue<Vector>;
  clock: SharedValue<number>;
}

export const Symbol = ({ i, j, font, pointer, clock }: SymbolProps) => {
  const { width, height } = useWindowDimensions();
  const SIZE = { width: width / COLS, height: height / ROWS };
  const x = i * SIZE.width;
  const y = j * SIZE.height;
  const noise = createNoise2D();
  const text = DIGITS[Math.round(Math.random() * 9)];
  const [symbolWidth] = font.getGlyphWidths(font.getGlyphIDs(text));
  const origin = vec(x + SIZE.width / 2, y + SIZE.height / 2);
  const transform = useDerivedValue(
    () => [
      {
        scale: interpolate(dist(pointer.value, origin), [0, R], [1.25, 0.25], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      },
    ],
    [pointer]
  );
  const dx = useDerivedValue(() => {
    const d = A * noise(x, clock.value * F);
    return origin.x - symbolWidth / 2 + d;
  }, [clock]);
  const dy = useDerivedValue(() => {
    const d = A * noise(y, clock.value * F);
    return origin.y + font.getSize() / 2 + d;
  }, [clock]);
  return (
    <Group transform={transform} origin={origin}>
      <Text text={text} x={dx} y={dy} font={font} color={FG} />
    </Group>
  );
};
