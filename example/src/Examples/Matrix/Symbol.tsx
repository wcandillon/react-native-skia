import React, { useRef } from "react";
import type { SkiaReadonlyValue, SkFont } from "@shopify/react-native-skia";
import {
  Skia,
  mixColors,
  Rect,
  useDerivedValue,
  interpolateColors,
  vec,
} from "@shopify/react-native-skia";
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
export const COLS = 40;
export const ROWS = 60;
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
      mixColors(
        opacity.current,
        Skia.Color("rgb(0, 255, 70)"),
        Skia.Color("rgb(140, 255, 170)")
      ),
    [opacity]
  );

  return (
    <Rect
      x={x + SYMBOL.width / 4}
      y={y + SYMBOL.height}
      width={SYMBOL.width}
      height={SYMBOL.height}
      opacity={opacity}
      color={color}
    />
  );
};
