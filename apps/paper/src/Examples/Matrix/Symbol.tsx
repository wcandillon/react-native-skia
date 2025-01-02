import React, { useRef } from "react";
import type { SkFont } from "@shopify/react-native-skia";
import { interpolateColors, Text } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";

const f = 4;
export const COLS = 8 * f;
export const ROWS = 15 * f;

interface SymbolProps {
  i: number;
  j: number;
  timestamp: SharedValue<number>;
  stream: number[];
  font: SkFont;
  symbols: string[];
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

  const text = useDerivedValue(() => {
    const idx = offset.current + Math.floor(timestamp.value / range.current);
    return symbols[idx % symbols.length];
  }, [timestamp]);

  const opacity = useDerivedValue(() => {
    const idx = Math.round(timestamp.value / 32);
    return stream[(stream.length - j + idx) % stream.length];
  }, [timestamp]);

  const color = useDerivedValue(
    () =>
      interpolateColors(
        opacity.value,
        [0.8, 1],
        ["rgb(0, 255, 70)", "rgb(140, 255, 170)"]
      ),
    [opacity]
  );

  return (
    <Text
      x={x + symbol.width / 4}
      y={y + symbol.height}
      font={font}
      text={text}
      opacity={opacity}
      color={color}
    />
  );
};
