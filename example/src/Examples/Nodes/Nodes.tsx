import React, { useEffect, useMemo, useRef } from "react";
import { Dimensions } from "react-native";
import {
  useDerivedValue,
  SkiaView,
  useDrawCallback,
  Skia,
  ValueApi,
  BlurStyle,
  useFont,
  vec,
  interpolateColors,
} from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");
const COLS = 5;
const ROWS = 10;
const SYMBOL = { width: width / COLS, height: height / ROWS };
const pos = vec(0, 0);
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

export const Nodes = () => {
  const font = useFont(require("../Matrix/matrix-code-nfi.otf"), SYMBOL.height);
  const ref = useRef<SkiaView>(null);
  const clock = useMemo(() => ValueApi.createClockValue(), []);
  useEffect(() => {
    clock.start();
    return ref.current?.registerValues([clock]);
  }, [clock]);
  const progress = useDerivedValue(() => clock.current, [clock]);
  const node = useMemo(() => {
    const root = Skia.Node.MakeCanvas({});
    const fill = Skia.Node.MakeFill({ color: "black" });
    const blurMask = Skia.Node.MakeBlurMask({
      blur: 5,
      respectCTM: true,
      style: BlurStyle.Solid,
    });
    root.appendChild(fill);
    root.appendChild(blurMask);
    if (font) {
      const symbols = font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz");
      cols.map((_i, i) =>
        rows.map((_j, j) => {
          const stream = streams[i];
          const offset = Math.round(Math.random() * (symbols.length - 1));
          const range = 100 + Math.random() * 900;
          const x = i * SYMBOL.width;
          const y = j * SYMBOL.height;
          const idx = offset + Math.floor(progress.current / range);
          const glyphs = [{ id: symbols[idx % symbols.length], pos }];
          const idx2 = Math.round(progress.current / 100);
          const opacity = stream[(stream.length - j + idx2) % stream.length];
          const color = "rgb(0, 255, 70)";
          const symbol = Skia.Node.MakeGlyphs({
            color,
            opacity,
            glyphs,
            font,
            x,
            y,
          });
          root.appendChild(symbol);
        })
      );
    }
    return root;
  }, [progress, font]);
  const onDraw = useDrawCallback(
    (canvas) => {
      if (node != null) {
        canvas.drawNode(node);
      }
    },
    [font]
  );
  return <SkiaView ref={ref} onDraw={onDraw} style={{ flex: 1 }} debug />;
};
