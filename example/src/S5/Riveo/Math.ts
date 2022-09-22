import type { Vector } from "@shopify/react-native-skia";
import { vec } from "@shopify/react-native-skia";

export const getPointAtLength = (length: number, from: Vector, to: Vector) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const x = from.x + length * Math.cos(angle);
  const y = from.y + length * Math.sin(angle);
  return vec(x, y);
};

export const scale = (v: Vector, s: number) => vec(v.x * s, v.y * s);

export const length = (v: Vector) => Math.hypot(v.x, v.y);

export const normalize = (v: Vector) => scale(v, 1 / length(v));

export const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y;
