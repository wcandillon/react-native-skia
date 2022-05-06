import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Skia,
  Drawing,
  Canvas,
  useClockValue,
  SkiaView,
  useDrawCallback,
  vec,
  mix,
  rgbaColor,
} from "@shopify/react-native-skia";

import { DrawNode, GroupNode, PaintNode, RectNode, Scene } from "./Node";

const { width, height } = Dimensions.get("window");
const COLS = 40;
const ROWS = 60;
const pos = vec(0, 0);
const cols = new Array(COLS).fill(0).map((_, i) => i);
const rows = new Array(ROWS).fill(0).map((_, i) => i);
const SYMBOL = { width: width / COLS, height: height / ROWS };
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

const group = new GroupNode();
const nodes = new Map<string, PaintNode>();
cols.map((_i, i) =>
  rows.map((_j, j) => {
    const rctPaint = new PaintNode();
    rctPaint.setColor(Skia.Color("rgb(0, 255, 70)"));
    const x = i * SYMBOL.width;
    const y = j * SYMBOL.height;
    const rct = new RectNode(Skia.XYWHRect(x, y, SYMBOL.width, SYMBOL.height));
    const r = new DrawNode(rct, rctPaint);
    group.addChild(r);
    nodes.set(`${i}-${j}`, rctPaint);
  })
);
const scene = new Scene(group);

export const Matrix = () => {
  const clock = useClockValue();
  const onDraw = useDrawCallback((canvas) => {
    canvas.drawColor(Skia.Color("black"));
    cols.map((_i, i) =>
      rows.map((_j, j) => {
        const paint = nodes.get(`${i}-${j}`)!;
        const idx = Math.round(clock.current / 50);
        const stream = streams[i];
        const opacity = stream[(stream.length - j + idx) % stream.length];
        paint.setColor(
          rgbaColor(mix(opacity, 0, 140), 255, mix(opacity, 70, 170), opacity)
        );
      })
    );
    scene.render(canvas);
  });
  return (
    <SkiaView style={{ flex: 1 }} onDraw={onDraw} mode="continuous" debug />
  );
};
