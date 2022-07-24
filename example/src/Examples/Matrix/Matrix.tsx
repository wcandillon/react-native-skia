import {
  Skia,
  SkiaView,
  useClockValue,
  useDrawCallback,
  useFont,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { COLS, ROWS } from "./Symbol";

// This is an interesting one!
const cols = new Array(COLS).fill(0).map((_, i) => i);

const randomArray = (from: number, to: number, blank?: boolean) => {
  const size = Math.round(from + Math.random() * (to - from));
  const a = new Array(size).fill(0).map((_, i) => (blank ? 0 : i / size));
  return a.reverse();
};

const streams = cols.map(() =>
  new Array(3)
    .fill(0)
    .map(() => [
      ...randomArray(1, 4, true),
      ...randomArray(4, 16),
      ...randomArray(2, 8, true),
    ])
    .flat()
);


export const Matrix = () => {
  const _clock = useClockValue();
  const { width, height } = useWindowDimensions();
  const symbol = { width: width / COLS, height: height / ROWS };
  const _font = useFont(require("./matrix-code-nfi.otf"), symbol.height);
  // This not clear which variables need to be redeclared, which don't need
  const _positions = useMemo(() => {
    const data = [];
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        const x = i * symbol.width;
        const y = j * symbol.height;
        const offset = Math.round(Math.random() * (26 - 1));
        const range = 100 + Math.random() * 900;
        const stream = streams[i];
        data.push({ x, y, offset, range, stream, i, j });
      }
    }
    return data;
  }, []);

  const onDraw = useDrawCallback((canvas) => {
    "worklet";
    const font = _font!;
    const clock = _clock;
    const positions = _positions;
    const symbols = font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz");
    const paint = Skia.Paint();
    const pos = Skia.Point(0, 0);
    canvas.drawColor(Skia.Color("black"));

    positions.forEach(({ x, y, range, offset, stream , j}) => {
      const idx = offset + Math.floor(clock.current / range);
      const glyphs = [symbols[idx % symbols.length]];
      const jdx = Math.round(clock.current / 100);
      const opacity = stream[(stream.length - j + jdx) % stream.length];
      paint.setColor(Skia.Color(`rgba(0, 255, 70, ${opacity})`));
      canvas.drawGlyphs(glyphs, [pos], x, y, font, paint);
    });
  }, [_font]);
  if (_font === null) {
    return null;
  }
  return (
    <SkiaView style={{ flex: 1 }} onDraw={onDraw} mode="continuous"  />
  );
}