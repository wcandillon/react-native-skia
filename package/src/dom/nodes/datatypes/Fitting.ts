import { exhaustiveCheck } from "../../../renderer/typeddash";
import type { SkRect } from "../../../skia/types";
import type { Fit } from "../../types";

export interface Size {
  width: number;
  height: number;
}

export const size = (width = 0, height = 0) => ({ width, height });

export const rect2rect = (src: SkRect, dst: SkRect) => {
  const scaleX = dst.width / src.width;
  const scaleY = dst.height / src.height;
  const translateX = dst.x - src.x * scaleX;
  const translateY = dst.y - src.y * scaleY;
  return [{ translateX }, { translateY }, { scaleX }, { scaleY }] as const;
};

export const fitRects = (
  fit: Fit,
  rect: SkRect,
  { x, y, width, height }: SkRect
) => {
  const sizes = applyBoxFit(
    fit,
    { width: rect.width, height: rect.height },
    { width, height }
  );
  const src = inscribe(sizes.src, rect);
  const dst = inscribe(sizes.dst, {
    x,
    y,
    width,
    height,
  });
  return { src, dst };
};

const inscribe = (
  { width, height }: Size,
  rect: { x: number; y: number; width: number; height: number }
) => {
  const halfWidthDelta = (rect.width - width) / 2.0;
  const halfHeightDelta = (rect.height - height) / 2.0;
  return {
    x: rect.x + halfWidthDelta,
    y: rect.y + halfHeightDelta,
    width,
    height,
  };
};

const applyBoxFit = (fit: Fit, input: Size, output: Size) => {
  let src = size(),
    dst = size();
  if (
    input.height <= 0.0 ||
    input.width <= 0.0 ||
    output.height <= 0.0 ||
    output.width <= 0.0
  ) {
    return { src, dst };
  }
  switch (fit) {
    case "fill":
      src = input;
      dst = output;
      break;
    case "contain":
      src = input;
      if (output.width / output.height > src.width / src.height) {
        dst = size((src.width * output.height) / src.height, output.height);
      } else {
        dst = size(output.width, (src.height * output.width) / src.width);
      }
      break;
    case "cover":
      if (output.width / output.height > input.width / input.height) {
        src = size(input.width, (input.width * output.height) / output.width);
      } else {
        src = size((input.height * output.width) / output.height, input.height);
      }
      dst = output;
      break;
    case "fitWidth":
      src = size(input.width, (input.width * output.height) / output.width);
      dst = size(output.width, (src.height * output.width) / src.width);
      break;
    case "fitHeight":
      src = size((input.height * output.width) / output.height, input.height);
      dst = size((src.width * output.height) / src.height, output.height);
      break;
    case "none":
      src = size(
        Math.min(input.width, output.width),
        Math.min(input.height, output.height)
      );
      dst = src;
      break;
    case "scaleDown":
      src = input;
      dst = input;
      const aspectRatio = input.width / input.height;
      if (dst.height > output.height) {
        dst = size(output.height * aspectRatio, output.height);
      }
      if (dst.width > output.width) {
        dst = size(output.width, output.width / aspectRatio);
      }
      break;
    default:
      exhaustiveCheck(fit);
  }
  return { src, dst };
};
