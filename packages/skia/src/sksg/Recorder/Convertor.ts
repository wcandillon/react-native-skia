import type { CTMProps, PaintProps, RRectDef } from "../../dom/types";
import {
  processColor,
  processPath,
  processRRect,
  processTransformProps2,
} from "../../dom/nodes";
import type { Skia } from "../../skia/types";

import { CommandType } from "./Core";

export interface Disposable {
  dispose: () => void;
}

type Props = Record<string, unknown>;

/**
 * Converts the static props of a command into the values the player draws
 * with, once, when the command is recorded; the native recorder does the same
 * (Convertor.h). The player converts the props driven by shared values on
 * every frame, as they change, and takes a converted value as is, so only
 * those cost anything per frame. The props are never written to: they belong
 * to the scene graph.
 *
 * Rects, rounded rects, matrices and colors are plain data on CanvasKit (the
 * only Skia the JS recorder runs on). Paths hold native memory: they go to
 * the recording's disposables, which disposeRecording() deletes.
 */
export const convertProps = (
  Skia: Skia,
  type: CommandType,
  props: Props,
  animatedProps: Props | undefined,
  disposables: Disposable[]
): Props => {
  switch (type) {
    case CommandType.SavePaint:
      return convertPaint(Skia, props, animatedProps);
    case CommandType.SaveCTM:
      return convertCTM(Skia, props, animatedProps, disposables);
    case CommandType.DrawRect:
    case CommandType.DrawOval:
    case CommandType.DrawImage:
      return convertRect(Skia, props, animatedProps);
    case CommandType.DrawRRect:
      return convertRRect(Skia, props, animatedProps);
    case CommandType.DrawPath:
      return convertPath(Skia, props, animatedProps, disposables);
    default:
      return props;
  }
};

/** True when none of the keys is driven by a shared value. */
const isStatic = (animatedProps: Props | undefined, ...keys: string[]) => {
  if (animatedProps === undefined) {
    return true;
  }
  return keys.every((key) => !(key in animatedProps));
};

const convertPaint = (
  Skia: Skia,
  props: Props,
  animatedProps: Props | undefined
) => {
  const { color } = props as PaintProps;
  if (
    color === undefined ||
    color instanceof Float32Array ||
    !isStatic(animatedProps, "color")
  ) {
    return props;
  }
  return { ...props, color: processColor(Skia, color) };
};

const convertCTM = (
  Skia: Skia,
  props: Props,
  animatedProps: Props | undefined,
  disposables: Disposable[]
) => {
  const { transform, origin, matrix, clip } = props as CTMProps;
  let result = props;
  if (
    (transform !== undefined || matrix !== undefined) &&
    isStatic(animatedProps, "transform", "origin", "matrix")
  ) {
    const m3 = processTransformProps2(Skia, { transform, origin, matrix });
    if (m3) {
      // saveCTM() concatenates a matrix with no transform and no origin as is.
      result = {
        ...result,
        matrix: m3,
        transform: undefined,
        origin: undefined,
      };
    }
  }
  if (typeof clip === "string" && isStatic(animatedProps, "clip")) {
    const path = processPath(Skia, clip);
    disposables.push(path);
    result = { ...result, clip: path };
  }
  return result;
};

const convertRect = (
  Skia: Skia,
  props: Props,
  animatedProps: Props | undefined
) => {
  const { rect, x, y, width, height } = props as {
    rect?: unknown;
    x?: number;
    y?: number;
    width?: unknown;
    height?: unknown;
  };
  if (
    rect !== undefined ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    !isStatic(animatedProps, "x", "y", "width", "height")
  ) {
    return props;
  }
  return { ...props, rect: Skia.XYWHRect(x ?? 0, y ?? 0, width, height) };
};

const convertRRect = (
  Skia: Skia,
  props: Props,
  animatedProps: Props | undefined
) => {
  const { rect, width, height } = props as {
    rect?: unknown;
    width?: unknown;
    height?: unknown;
  };
  if (
    rect !== undefined ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    !isStatic(animatedProps, "x", "y", "width", "height", "r")
  ) {
    return props;
  }
  return { ...props, rect: processRRect(Skia, props as RRectDef) };
};

const convertPath = (
  Skia: Skia,
  props: Props,
  animatedProps: Props | undefined,
  disposables: Disposable[]
) => {
  const { path } = props;
  if (typeof path !== "string" || !isStatic(animatedProps, "path")) {
    return props;
  }
  const skPath = processPath(Skia, path);
  disposables.push(skPath);
  return { ...props, path: skPath };
};
