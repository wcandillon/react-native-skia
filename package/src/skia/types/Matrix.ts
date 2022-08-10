import type { SkJSIInstance } from "./JsiInstance";
import type { SkCanvas } from "./Canvas";
export enum MatrixIndex {
  ScaleX = 0,
  SkewX = 1,
  TransX = 2,
  SkewY = 3,
  ScaleY = 4,
  TransY = 5,
  Persp0 = 6,
  Persp1 = 7,
  Persp2 = 8,
}

export const isMatrix = (obj: unknown): obj is SkMatrix =>
  obj !== null && (obj as SkJSIInstance<string>).__typename__ === "Matrix";

export interface SkMatrix extends SkJSIInstance<"Matrix"> {
  concat: (matrix: SkMatrix) => void;
  translate: (x: number, y: number) => void;
  scale: (x: number, y?: number) => void;
  skew: (x: number, y: number) => void;
  rotate: (theta: number) => void;
  identity: () => void;
}

type Transform2dName =
  | "translateX"
  | "translateY"
  | "scale"
  | "skewX"
  | "skewY"
  | "scaleX"
  | "scaleY"
  | "rotateZ"
  | "rotate";

type Transformations = {
  readonly [Name in Transform2dName]: number;
};

export type Transforms2d = readonly (
  | Pick<Transformations, "translateX">
  | Pick<Transformations, "translateY">
  | Pick<Transformations, "scale">
  | Pick<Transformations, "scaleX">
  | Pick<Transformations, "scaleY">
  | Pick<Transformations, "skewX">
  | Pick<Transformations, "skewY">
  | Pick<Transformations, "rotate">
)[];

export interface TransformProp {
  transform?: Transforms2d;
}

export const processTransform = <T extends SkMatrix | SkCanvas>(
  m: T,
  transforms: Transforms2d
) => {
  for (const transform of transforms) {
    const key = Object.keys(transform)[0] as Transform2dName;
    const value = (transform as Pick<Transformations, typeof key>)[key];
    if (key === "translateX") {
      m.translate(value, 0);
      continue;
    }
    if (key === "translateY") {
      m.translate(0, value);
      continue;
    }
    if (key === "scale") {
      m.scale(value, value);
      continue;
    }
    if (key === "scaleX") {
      m.scale(value, 1);
      continue;
    }
    if (key === "scaleY") {
      m.scale(1, value);
      continue;
    }
    if (key === "skewX") {
      m.skew(value, 0);
      continue;
    }
    if (key === "skewY") {
      m.skew(0, value);
      continue;
    }
    if (key === "rotate" || key === "rotateZ") {
      if (isMatrix(m)) {
        m.rotate(value);
      } else {
        m.rotate(toDegrees(value), 0, 0);
      }
      continue;
    }
    exhaustiveCheck(key);
  }
  return m;
};

const exhaustiveCheck = (a: never): never => {
  throw new Error(`Unknown transformation: ${a}`);
};

export const toDegrees = (rad: number) => {
  return (rad * 180) / Math.PI;
};
