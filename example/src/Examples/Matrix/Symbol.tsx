import React, { useRef } from "react";
import type { SkiaValue, SkFont } from "@shopify/react-native-skia";
import {
  useComputedValue,
  interpolateColors,
  vec,
  Glyphs,
} from "@shopify/react-native-skia";
import { Platform } from "react-native";

export const COLS = Platform.OS === "web" ? 15 : 10;
export const ROWS = Platform.OS === "web" ? 30 : 20;
const pos = vec(0, 0);

interface SymbolProps {
  i: number;
  j: number;
  timestamp: SkiaValue<number>;
  stream: number[];
  font: SkFont;
  symbols: number[];
  symbol: { width: number; height: number };
}

export const Symbol = ({
  i,
  j,
  timestamp,
  stream,
  font,
  symbols,
  symbol,
}: SymbolProps) => {
  const offset = useRef(Math.round(Math.random() * (symbols.length - 1)));
  const range = useRef(100 + Math.random() * 900);
  const x = i * symbol.width;
  const y = j * symbol.height;

  const glyphs = useComputedValue(() => {
    const idx = offset.current + Math.floor(timestamp.current / range.current);
    return [{ id: symbols[idx % symbols.length], pos }];
  }, [timestamp]);

  const opacity = useComputedValue(() => {
    const idx = Math.round(timestamp.current / 100);
    return stream[(stream.length - j + idx) % stream.length];
  }, [timestamp]);

  const color = useComputedValue(
    () =>
      interpolateColors(
        opacity.current,
        [0.8, 1],
        ["rgb(0, 255, 70)", "rgb(140, 255, 170)"]
      ),
    [opacity]
  );

  return (
    <Glyphs
      x={x + symbol.width / 4}
      y={y + symbol.height}
      font={font}
      glyphs={glyphs}
      opacity={opacity}
      color={color}
    />
  );
};
