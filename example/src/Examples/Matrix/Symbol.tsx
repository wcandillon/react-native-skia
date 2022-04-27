import React, { useRef } from "react";
import type { SkiaReadonlyValue, SkFont } from "@shopify/react-native-skia";
import {
  Rect,
  useDerivedValue,
  interpolateColors,
  vec,
  Glyphs,
} from "@shopify/react-native-skia";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
export const COLS = 20;
export const ROWS = 30;
export const SYMBOL = { width: width / COLS, height: height / ROWS };
const pos = vec(0, 0);

interface SymbolProps {
  i: number;
  j: number;
  timestamp: SkiaReadonlyValue<number>;
  stream: number[];
  font: SkFont;
  symbols: number[];
}

export const Symbol = ({ i, j, timestamp, stream }: SymbolProps) => {
  const x = i * SYMBOL.width;
  const y = j * SYMBOL.height;

  const opacity = useDerivedValue(() => {
    const idx = Math.round(timestamp.current / 50);
    return stream[(stream.length - j + idx) % stream.length];
  }, [timestamp]);

  const color = useDerivedValue(
    () =>
      interpolateColors(
        opacity.current,
        [0.8, 1],
        ["rgb(0, 255, 70)", "rgb(140, 255, 170)"]
      ),
    [opacity]
  );

  return (
    <Rect
      x={x + SYMBOL.width / 4}
      y={y + SYMBOL.height}
      width={SYMBOL.width}
      height={SYMBOL.height}
      color={color}
      opacity={opacity}
    />
  );
};
