/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Color, Skia as SkiaApi, SkRect, Vector } from "../skia/types";
import * as Values from "../values/web";
import * as ValuesHooks from "../values/hooks";
import * as BaseSkia from "../skia/types";
import type * as SkiaExports from "../skia";
import type * as ExternalExports from "../external";
import type * as ValueExports from "../values";
import type * as AnimationExports from "../animation";
import { useSharedValueEffect } from "../external/reanimated/useSharedValueEffect";
import * as timingFunctions from "../animation/timing";
import * as springFunctions from "../animation/spring";
import * as decayFunctions from "../animation/decay";
import * as interpolateFn from "../animation/functions/interpolate";
import * as interpolatePathFn from "../animation/functions/interpolatePaths";
import * as interpolateVectorFn from "../animation/functions/interpolateVector";
import { ShaderLib } from "../renderer/components/shaders/ShaderLib";

class Stub {
  constructor() {
    return new Proxy(() => {}, {
      get: () => new Stub(),
      apply: () => new Stub(),
      set: () => true,
    });
  }
}

const Noop: () => any = () => {};

export const Skia: SkiaApi = new Stub() as any;

export const vec = (x?: number, y?: number) => ({ x: x ?? 0, y: y ?? x ?? 0 });

export const Mock: typeof SkiaExports &
  typeof ExternalExports &
  typeof ValueExports &
  typeof AnimationExports & {
    createDrawing: () => any;
    createDeclaration: () => any;
    ShaderLib: typeof ShaderLib;
  } = {
  // SkiaExports
  // 1. Skia API. BaseSkia contains the enums, and functions like isPaint etc
  Skia,
  ...BaseSkia,
  // 2. Hooks
  useDataCollection: Noop,
  useRawData: Noop,
  useData: Noop,
  useFont: Noop,
  useTypeface: Noop,
  useImage: Noop,
  useSVG: Noop,
  usePicture: Noop,
  // 3. Point/Rect/Transform utilities
  vec,
  rect: (x: number, y: number, width: number, height: number) => ({
    x,
    y,
    width,
    height,
  }),
  rrect: (r: SkRect, rx: number, ry: number) => ({
    rect: r,
    rx,
    ry,
  }),
  point: vec,
  add: (a: Vector, b: Vector) => vec(a.x + b.x, a.y + b.y),
  sub: (a: Vector, b: Vector) => vec(a.x - b.x, a.y - b.y),
  neg: (a: Vector) => vec(-a.x, -a.y),
  dist: (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.y - b.y),
  translate: ({ x, y }: Vector) =>
    [{ translateX: x }, { translateY: y }] as const,

  bounds: Noop,
  topLeft: Noop,
  topRight: Noop,
  bottomLeft: Noop,
  bottomRight: Noop,
  center: Noop,
  processTransform2d: Noop,
  // ExternalExports
  useSharedValueEffect,
  // ValueExports
  ...Values,
  ...ValuesHooks,
  // Animations
  ...timingFunctions,
  ...springFunctions,
  ...decayFunctions,
  ...interpolateFn,
  ...interpolatePathFn,
  ...interpolateVectorFn,
  interpolateColors: (
    _value: number,
    _inputRange: number[],
    _outputRange: Color[]
  ) => Float32Array.of(0, 0, 0, 0),
  mixColors: (_v: number, _x: Color, _y: Color) => Float32Array.of(0, 0, 0, 0),
  ShaderLib,
  createDrawing: Noop,
  createDeclaration: Noop,
};
