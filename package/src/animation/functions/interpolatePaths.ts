import type { SkPath } from "../../skia/types";
import { exhaustiveCheck } from "../../renderer/typeddash";

import type { ExtrapolationType } from "./interpolate";
import { validateInterpolationOptions, Extrapolate } from "./interpolate";

const lerp = (
  value: number,
  from: number,
  to: number,
  p1: SkPath,
  p2: SkPath
) => {
  const t = (value - from) / (to - from);
  return p2.interpolate(p1, t)!;
};

/**
 * Maps an input value within a range to an output path within a path range.
 * @param value - The input value.
 * @param inputRange - The range of the input value.
 * @param outputRange - The range of the output path.
 * @param options - Extrapolation options
 * @returns The output path.
 * @example <caption>Map a value between 0 and 1 to a path between two paths.</caption>
 * const path1 = new Path();
 * path1.moveTo(0, 0);
 * path1.lineTo(100, 0);
 * const path2 = new Path();
 * path2.moveTo(0, 0);
 * path2.lineTo(0, 100);
 * const path = interpolatePath(0.5, [0, 1], [path1, path2]);
 */
export const interpolatePaths = (
  value: number,
  input: number[],
  outputRange: SkPath[],
  options?: ExtrapolationType
) => {
  const extrapolation = validateInterpolationOptions(options);
  if (value < input[0]) {
    switch (extrapolation.extrapolateLeft) {
      case Extrapolate.CLAMP:
        return outputRange[0];
      case Extrapolate.EXTEND:
        return lerp(value, input[0], input[1], outputRange[0], outputRange[1]);
      case Extrapolate.IDENTITY:
        throw new Error(
          "Identity is not a supported extrapolation type for interpolatePaths()"
        );
      default:
        exhaustiveCheck(extrapolation.extrapolateLeft);
    }
  } else if (value > input[input.length - 1]) {
    switch (extrapolation.extrapolateRight) {
      case Extrapolate.CLAMP:
        return outputRange[outputRange.length - 1];
      case Extrapolate.EXTEND:
        return lerp(
          value,
          input[input.length - 2],
          input[input.length - 1],
          outputRange[input.length - 2],
          outputRange[input.length - 1]
        );
      case Extrapolate.IDENTITY:
        throw new Error(
          "Identity is not a supported extrapolation type for interpolatePaths()"
        );
      default:
        exhaustiveCheck(extrapolation.extrapolateRight);
    }
  }
  let i = 0;
  for (; i <= input.length - 1; i++) {
    if (value >= input[i] && value <= input[i + 1]) {
      break;
    }
  }
  return lerp(
    value,
    input[i],
    input[i + 1],
    outputRange[i],
    outputRange[i + 1]
  );
};
