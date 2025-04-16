import type { Color, Vector } from "@shopify/react-native-skia";
import { mixColors, dist, vec } from "@shopify/react-native-skia";

export const bilinearInterpolate = (
  [color0, color1, color2, color3]: Color[],
  size: Vector,
  pos: Vector
) => {
  "worklet";
  const uv = vec(pos.x / size.x, pos.y / size.y);
  const colorA = mixColors(uv.x, color0, color1);
  const colorB = mixColors(uv.x, color2, color3);
  return mixColors(uv.y, colorA, colorB);
};

export const inRadius = (a: Vector, b: Vector, r = 20) => {
  "worklet";
  return dist(a, b) < r;
};

export const getPointAtLength = (length: number, from: Vector, to: Vector) => {
  "worklet";
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const x = from.x + length * Math.cos(angle);
  const y = from.y + length * Math.sin(angle);
  return vec(x, y);
};

export const symmetric = (v: Vector, center: Vector) => {
  "worklet";
  const d = dist(v, center);
  return getPointAtLength(d * 2, v, center);
};
