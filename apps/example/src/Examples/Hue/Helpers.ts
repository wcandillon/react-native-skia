import { mix } from "@shopify/react-native-skia";

const TAU = Math.PI * 2;

const quadraticIn = (t: number) => {
  "worklet";
  return t * t;
};

const fract = (x: number) => {
  "worklet";
  return x - Math.floor(x);
};

const clamp = (value: number, lowerBound: number, upperBound: number) => {
  "worklet";
  return Math.min(Math.max(lowerBound, value), upperBound);
};

const hsv2rgb = (h: number, s: number, v: number) => {
  "worklet";
  const K = {
    x: 1,
    y: 2 / 3,
    z: 1 / 3,
    w: 3,
  };
  const p = {
    x: Math.abs(fract(h + K.x) * 6 - K.w),
    y: Math.abs(fract(h + K.y) * 6 - K.w),
    z: Math.abs(fract(h + K.z) * 6 - K.w),
  };
  // return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  const rgb = {
    x: v * mix(s, K.x, clamp(p.x - K.x, 0, 1)),
    y: v * mix(s, K.x, clamp(p.y - K.x, 0, 1)),
    z: v * mix(s, K.x, clamp(p.z - K.x, 0, 1)),
  };

  const r = Math.round(rgb.x * 255);
  const g = Math.round(rgb.y * 255);
  const b = Math.round(rgb.z * 255);

  return { r, g, b };
};

const normalizeRad = (value: number) => {
  "worklet";
  const rest = value % TAU;
  return rest > 0 ? rest : TAU + rest;
};

export const polar2Color = (
  theta: number,
  radius: number,
  maxRadius: number
) => {
  "worklet";
  const h = normalizeRad(theta) / TAU;
  const s = quadraticIn(radius / maxRadius);
  const { r, g, b } = hsv2rgb(h, s, 1);
  return Float32Array.of(r / 255, g / 255, b / 255, 1);
};
