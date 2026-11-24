import type { CanvasKit } from "canvaskit-wasm";

import type { SkColor, SkPoint, VertexMode } from "../types";

import { JsiSkVertices } from "./JsiSkVertices";
import { getEnum } from "./Host";

const concat = (...arrays: Float32Array[]) => {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

const flatten = (points: SkPoint[] | Float32Array) =>
  points instanceof Float32Array
    ? points
    : points.flatMap(({ x, y }) => [x, y]);

export const MakeVertices = (
  CanvasKit: CanvasKit,
  mode: VertexMode,
  positions: SkPoint[] | Float32Array,
  textureCoordinates?: SkPoint[] | Float32Array | null,
  colors?: SkColor[],
  indices?: number[] | null,
  isVolatile?: boolean
) =>
  new JsiSkVertices(
    CanvasKit,
    CanvasKit.MakeVertices(
      getEnum(CanvasKit, "VertexMode", mode),
      flatten(positions),
      flatten(textureCoordinates || []),
      !colors ? null : colors.reduce((a, c) => concat(a, c)),
      indices,
      isVolatile
    )
  );
