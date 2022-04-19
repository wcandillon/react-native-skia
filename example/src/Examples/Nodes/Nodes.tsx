import React, { useEffect, useMemo, useRef } from "react";
import { Dimensions } from "react-native";
import type { SkFont } from "@shopify/react-native-skia";
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
const COLS = 30;
const ROWS = 50;
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

const offset = 0;
const range = 100;

interface MatrixProps {
  font: SkFont;
}

const Matrix = ({ font }: MatrixProps) => {
  const ref = useRef<SkiaView>(null);
  const clock = useMemo(() => ValueApi.createClockValue(), []);
  const symbols = font.getGlyphIDs("abcdefghijklmnopqrstuvwxyz");
  useEffect(() => {
    clock.start();
    return ref.current?.registerValues([clock]);
  }, [clock]);

  const glyphs = useDerivedValue(() => {
    const idx = offset + Math.floor(clock.current / range);
    return [{ id: symbols[idx % symbols.length], pos }];
  }, [clock]);

  const node = useMemo(() => {
    console.log("Build Tree");
    const root = Skia.Node.MakeCanvas({});
    const fill = Skia.Node.MakeFill({ color: "black" });
    const blurMask = Skia.Node.MakeBlurMask({
      blur: 5,
      respectCTM: true,
      style: BlurStyle.Solid,
    });
    root.appendChild(fill);
    root.appendChild(blurMask);

    cols.map((_i, i) =>
      rows.map((_j, j) => {
        const x = i * SYMBOL.width;
        const y = j * SYMBOL.height;
        const symbol = Skia.Node.MakeGlyphs({
          color: "rgb(0, 255, 70)",
          glyphs,
          font,
          x,
          y,
        });
        root.appendChild(symbol);
      })
    );
    return root;
  }, [font, glyphs]);
  const onDraw = useDrawCallback(
    (canvas) => {
      console.log("Draw Frame");
      canvas.drawNode(node);
    },
    [font]
  );
  return <SkiaView ref={ref} onDraw={onDraw} style={{ flex: 1 }} debug />;
};

export const Nodes = () => {
  const font = useFont(require("../Matrix/matrix-code-nfi.otf"), SYMBOL.height);
  if (!font) {
    return null;
  }
  return <Matrix font={font} />;
};
