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
} from "@shopify/react-native-skia";
import type { ColorNode } from "@shopify/react-native-skia/src/skia/Node";

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

const bg = Skia.Node.MakeColor(Skia.Color("black"));
const plane = Skia.Node.MakePlane();
const draw = Skia.Node.MakeDraw(plane, bg.to());
const group = Skia.Node.MakeGroup();
group.addChild(draw);
const nodes = new Map<string, ColorNode>();
cols.map((_i, i) =>
  rows.map((_j, j) => {
    const rctPaint = Skia.Node.MakeColor(Skia.Color("rgb(0, 255, 70)"));
    const x = i * SYMBOL.width;
    const y = j * SYMBOL.height;
    const rct = Skia.Node.MakeRect(
      Skia.XYWHRect(x, y, SYMBOL.width, SYMBOL.height)
    );
    const r = Skia.Node.MakeDraw(rct.to(), rctPaint.to());
    group.addChild(r);
    nodes.set(`${i}-${j}`, rctPaint);
  })
);
const scene = Skia.Node.MakeScene(group);

export const Matrix = () => {
  const clock = useClockValue();
  const onDraw = useDrawCallback((canvas) => {
    cols.map((_i, i) =>
      rows.map((_j, j) => {
        const paint = nodes.get(`${i}-${j}`)!;
        const idx = Math.round(clock.current / 50);
        const stream = streams[i];
        const opacity = stream[(stream.length - j + idx) % stream.length];
        paint.setColor(
          Skia.Color(
            `rgba(${mix(opacity, 255, 140)}, 255, ${mix(
              opacity,
              70,
              170
            )}, ${opacity})`
          )
        );
      })
    );
    canvas.drawScene(scene);
  });
  return (
    <SkiaView style={{ flex: 1 }} onDraw={onDraw} mode="continuous" debug />
  );
};
