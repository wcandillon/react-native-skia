import {
  BlurMask,
  Canvas,
  Fill,
  Group,
  ImageSVG,
  Skia,
  useClockValue,
  useFont,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

import { SVG } from "../API/SVG";

import { COLS, ROWS, Symbol, SYMBOL } from "./Symbol";

const { width, height } = Dimensions.get("window");
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

export const Matrix = () => {
  const clock = useClockValue();
  const svg = Skia.SVG.MakeFromString(`<svg>
  <rect x="0" y="0" width="${width}" height="${height}" fill="black" />
</svg>`)!;

  return (
    <Canvas style={{ flex: 1 }} debug>
      <ImageSVG svg={svg} x={0} y={0} width={width} height={height} />
    </Canvas>
  );
};
