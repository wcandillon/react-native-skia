import { Skia } from "./Skia";

// This is the JSI color. Currently a number. This may change.
export type SkColor = number;
// Input colors can be string or number
export type Color = string | number;

export const alphaf = (c: number) => ((c >> 24) & 255) / 255;
export const red = (c: number) => (c >> 16) & 255;
export const green = (c: number) => (c >> 8) & 255;
export const blue = (c: number) => c & 255;
export const rgbaColor = (r: number, g: number, b: number, af: number) => {
  const a = Math.round(af * 255);
  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
};

const processColorAsArray = (cl: Color) => {
  const icl = typeof cl === "string" ? Skia.Color(cl) : cl;
  const r = red(icl);
  const g = green(icl);
  const b = blue(icl);
  const a = alphaf(icl);
  return [r, g, b, a] as const;
};

export const processColor = (cl: Color, currentOpacity: number) => {
  const [r, g, b, a] = processColorAsArray(cl);
  return rgbaColor(r, g, b, a * currentOpacity);
};

export const processColorAsUnitArray = (cl: Color, currentOpacity: number) => {
  const [r, g, b, a] = processColorAsArray(cl);
  return [r / 255, g / 255, b / 255, a * currentOpacity] as const;
};
