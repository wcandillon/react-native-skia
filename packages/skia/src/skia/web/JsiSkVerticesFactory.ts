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

export const MakeVertices = (
  CanvasKit: CanvasKit,
  mode: VertexMode,
  positions: SkPoint[],
  textureCoordinates?: SkPoint[] | null,
  colors?: SkColor[],
  indices?: number[] | null,
  isVolatile?: boolean
) =>
  new JsiSkVertices(
    CanvasKit,
    CanvasKit.MakeVertices(
      getEnum(CanvasKit, "VertexMode", mode),
      positions.map(({ x, y }) => [x, y]).flat(),
      (textureCoordinates || []).map(({ x, y }) => [x, y]).flat(),
      !colors ? null : colors.reduce((a, c) => concat(a, c)),
      indices,
      isVolatile
    )
  );
