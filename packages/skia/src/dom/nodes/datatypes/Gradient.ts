import type { Skia, SkRect, Transforms3d, Vector } from "../../../skia/types";
import { TileMode } from "../../../skia/types";
import type { GradientProps, ImageShaderProps } from "../../types";

import { enumKey } from "./Enum";
import { processTransformProps } from "./Transform";

export const transformOrigin = (origin: Vector, transform: Transforms3d) => {
  "worklet";
  return [
    { translateX: origin.x },
    { translateY: origin.y },
    ...transform,
    { translateX: -origin.x },
    { translateY: -origin.y },
  ];
};

export const processColor = (
  Skia: Skia,
  color: number | string | Float32Array | number[]
) => {
  "worklet";
  // A converted color first: the renderer converts its static colors once
  // and passes them back here on every frame.
  if (color instanceof Float32Array) {
    return color;
  } else if (typeof color === "string" || typeof color === "number") {
    return Skia.Color(color);
  } else if (Array.isArray(color)) {
    return new Float32Array(color);
  } else {
    throw new Error(
      `Invalid color type: ${typeof color}. Expected number, string, or array.`
    );
  }
};

export const processGradientProps = (
  Skia: Skia,
  { colors, positions, mode, flags, ...transform }: GradientProps
) => {
  "worklet";
  const localMatrix = Skia.Matrix();
  processTransformProps(localMatrix, transform);
  return {
    colors: colors.map((color) => processColor(Skia, color)),
    positions: positions ?? null,
    mode: TileMode[enumKey(mode ?? "clamp")],
    flags,
    localMatrix,
  };
};

export const getRect = (
  Skia: Skia,
  props: Omit<ImageShaderProps, "tx" | "ty" | "fm" | "mm" | "fit" | "image">
): SkRect | undefined => {
  "worklet";
  const { x, y, width, height } = props;
  if (props.rect) {
    return props.rect;
  } else if (width !== undefined && height !== undefined) {
    return Skia.XYWHRect(x ?? 0, y ?? 0, width, height);
  } else {
    return undefined;
  }
};
