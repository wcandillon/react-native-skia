/**
 * Mock implementation for test runners.
 *
 * Example:
 *
 * ```js
 * jest.mock('@shopify/react-native-skia', () => require('@shopify/react-native-skia/lib/commonjs/mock'));
 * ```
 */

import type { Skia as SkiaApi, SkRect } from "../skia/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockJSIInstance: any = {};
const Noop = () => MockJSIInstance;

export const Skia: SkiaApi = {
  Point: Noop,
  XYWHRect: Noop,
  RuntimeShaderBuilder: Noop,
  RRectXY: Noop,
  RSXform: Noop,
  Color: Noop,
  ContourMeasureIter: Noop,
  Paint: Noop,
  PictureRecorder: Noop,
  Picture: {
    MakePicture: Noop,
  },
  Path: {
    Make: Noop,
    MakeFromSVGString: Noop,
    MakeFromOp: Noop,
    MakeFromCmds: Noop,
    MakeFromText: Noop,
  },
  Matrix: Noop,
  ColorFilter: {
    MakeMatrix: Noop,
    MakeBlend: Noop,
    MakeCompose: Noop,
    MakeLerp: Noop,
    MakeLinearToSRGBGamma: Noop,
    MakeSRGBToLinearGamma: Noop,
    MakeLumaColorFilter: Noop,
  },
  Font: Noop,
  Typeface: {
    MakeFreeTypeFaceFromData: Noop,
  },
  MaskFilter: {
    MakeBlur: Noop,
  },
  RuntimeEffect: {
    Make: Noop,
  },
  ImageFilter: {
    MakeOffset: Noop,
    MakeDisplacementMap: Noop,
    MakeShader: Noop,
    MakeBlur: Noop,
    MakeColorFilter: Noop,
    MakeCompose: Noop,
    MakeDropShadow: Noop,
    MakeDropShadowOnly: Noop,
    MakeErode: Noop,
    MakeDilate: Noop,
    MakeBlend: Noop,
    MakeRuntimeShader: Noop,
  },
  Shader: {
    MakeLinearGradient: Noop,
    MakeRadialGradient: Noop,
    MakeTwoPointConicalGradient: Noop,
    MakeSweepGradient: Noop,
    MakeTurbulence: Noop,
    MakeFractalNoise: Noop,
    MakeBlend: Noop,
    MakeColor: Noop,
  },
  PathEffect: {
    MakeCorner: Noop,
    MakeDash: Noop,
    MakeDiscrete: Noop,
    MakeCompose: Noop,
    MakeSum: Noop,
    MakeLine2D: Noop,
    MakePath1D: Noop,
    MakePath2D: Noop,
  },
  MakeVertices: Noop,
  Data: {
    fromURI: Noop,
    fromBytes: Noop,
    fromBase64: Noop,
  },
  Image: {
    MakeImageFromEncoded: Noop,
    MakeImage: Noop,
  },
  SVG: {
    MakeFromData: Noop,
    MakeFromString: Noop,
  },
  FontMgr: {
    RefDefault: Noop,
  },
  TextBlob: {
    MakeFromText: Noop,
    MakeFromGlyphs: Noop,
    MakeFromRSXform: Noop,
    MakeFromRSXformGlyphs: Noop,
  },
  Surface: {
    Make: Noop,
  },
};

export const vec = (x: number, y: number) => ({ x, y });

export const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

export const rrect = (r: SkRect, rx: number, ry: number) => ({
  rect: r,
  rx,
  ry,
});

export const useTouchHandler = Noop;
export const useComputedValue = Noop;
export const useValue = Noop;
export const useClockValue = Noop;
export const useValueEffect = Noop;
export const useTiming = Noop;
export const runTiming = Noop;
export const timing = Noop;
export const useSpring = Noop;
export const runSpring = Noop;
export const spring = Noop;
export const runDecay = Noop;
export const decay = Noop;

export const useSharedValueEffect = Noop;

export const useData = Noop;
export const useDataCollection = Noop;
export const useFont = Noop;
export const useImage = Noop;
export const usePicture = Noop;
export const useSVG = Noop;
export const useTypeface = Noop;
