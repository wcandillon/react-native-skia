import {
  BlurMask,
  Canvas,
  Fill,
  Group,
  Skia,
  SkiaView,
  useClockValue,
  useDrawCallback,
  useFont,
} from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions } from "react-native";

import { COLS, ROWS, Symbol } from "./Symbol";

// This is an interesting one!
const cols = new Array(COLS).fill(0).map((_, i) => i);
const rows = new Array(ROWS).fill(0).map((_, i) => i);

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

export const MatrixOld = () => {
  const clock = useClockValue();
  const { width, height } = useWindowDimensions();
  const symbol = { width: width / COLS, height: height / ROWS };
  const font = useFont(require("./matrix-code-nfi.otf"), symbol.height);
  if (font === null) {
    return null;
  }
  const symbols = font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz");
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="black" />
      <Group>
        <BlurMask blur={8} style="solid" />
        {cols.map((_i, i) =>
          rows.map((_j, j) => (
            <Symbol
              symbols={symbols}
              font={font}
              timestamp={clock}
              key={`${i}-${j}`}
              i={i}
              j={j}
              stream={streams[i]}
              symbol={symbol}
            />
          ))
        )}
      </Group>
    </Canvas>
  );
};

export const Matrix = () => {
  const _clock = useClockValue();
  const { width, height } = useWindowDimensions();
  const symbol = { width: width / COLS, height: height / ROWS };
  const _font = useFont(require("./matrix-code-nfi.otf"), symbol.height);

  const onDraw = useDrawCallback((canvas) => {
    "worklet";
    const font = _font!;
    const clock = _clock;
    const symbols = font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz");
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("rgb(0, 255, 70)"));
    const pos = Skia.Point(0, 0);
    canvas.drawColor(Skia.Color("black"));
    const offset = 0;
    const range = 1; 
    const idx = Math.round(clock.current % 2000 / 2000);
    const glyphs = [symbols[idx]];
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        const x = i * symbol.width;
        const y = j * symbol.height;
        canvas.drawGlyphs(glyphs, [pos], x, y, font, paint);
      }
    }
  }, [_font]);
  if (_font === null) {
    return null;
  }
  return (
    <SkiaView style={{ flex: 1 }} onDraw={onDraw} mode="continuous"  />
  );
}