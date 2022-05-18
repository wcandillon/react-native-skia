import { mix } from "../../renderer/processors";
import type { Color } from "../../skia";
import { alphaf, blue, green, red, rgbaColor, Skia } from "../../skia";

import { interpolate } from "./interpolate";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const interpolateColorsRGB = (
  value: number,
  inputRange: number[],
  outputRange: number[]
) => {
  const r = interpolate(
    value,
    inputRange,
    outputRange.map((c) => red(c)),
    CLAMP
  );
  const g = interpolate(
    value,
    inputRange,
    outputRange.map((c) => green(c)),
    CLAMP
  );
  const b = interpolate(
    value,
    inputRange,
    outputRange.map((c) => blue(c)),
    CLAMP
  );
  const a = interpolate(
    value,
    inputRange,
    outputRange.map((c) => alphaf(c)),
    CLAMP
  );
  return rgbaColor(r, g, b, a);
};

export const interpolateColors = (
  value: number,
  inputRange: number[],
  _outputRange: Color[]
) => {
  const outputRange = _outputRange.map((cl) => Skia.Color(cl));
  return interpolateColorsRGB(value, inputRange, outputRange);
};

// This is fast. To be reconcilled with interpolateColors
// it looks like interpolateColors may not be working as expected
// these functions need to be tested more thoroughly on both platform
export const mixColors = (value: number, x: number, y: number) => {
  const r = mix(value, red(x), red(y));
  const g = mix(value, green(x), green(y));
  const b = mix(value, blue(x), blue(y));
  const a = mix(value, alphaf(x), alphaf(y));
  return rgbaColor(r, g, b, a);
};
