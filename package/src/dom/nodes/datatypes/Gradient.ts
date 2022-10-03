import type { Skia, SkRect, Transforms2d, Vector } from "../../../skia/types";
import { TileMode } from "../../../skia/types";
import type { GradientProps, ImageShaderProps } from "../../types";

import { enumKey } from "./Enum";
import { processTransformProps } from "./Transform";

export const transformOrigin = (origin: Vector, transform: Transforms2d) => [
  { translateX: origin.x },
  { translateY: origin.y },
  ...transform,
  { translateX: -origin.x },
  { translateY: -origin.y },
];

export const processGradientProps = (
  Skia: Skia,
  { colors, positions, mode, flags, ...transform }: GradientProps
) => {
  const localMatrix = Skia.Matrix();
  processTransformProps(localMatrix, transform);
  return {
    colors: colors.map((color) => Skia.Color(color)),
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
  const { x, y, width, height } = props;
  if (props.rect) {
    return props.rect;
  } else if (
    x !== undefined &&
    y !== undefined &&
    width !== undefined &&
    height !== undefined
  ) {
    return Skia.XYWHRect(x, y, width, height);
  } else {
    return undefined;
  }
};
