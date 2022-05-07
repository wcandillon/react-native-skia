import { Platform, processColor } from "react-native";

/*global SkiaApi*/
import type { Color } from "./Color";
import type { SkiaApiInterface } from "./SkiaInterface";

/*
 * Parse CSS colors
 */
const SkiaColor = (cl: Color) => {
  if (typeof cl === "number") {
    return cl;
  }
  const color = Skia.parseColorString(cl);
  if (color !== undefined) {
    return color;
  } else {
    // If the color is not recognized, we fallback to React Native
    let rnColor = processColor(cl);
    // 1. Neither Skia or RN could parse the color
    if (typeof rnColor !== "number") {
      console.warn("Skia couldn't parse the following color " + cl);
      return BLACK;
      // 2. The color is recognized by RN but not by Skia
    } else {
      console.warn(
        "Skia couldn't parse the following color " +
          cl +
          ". The color parsing was delegated to React Native. Please file on issue with that color."
      );
      // On android we need to move the alpha byte to the start of the structure
      if (Platform.OS === "android") {
        rnColor = rnColor >>> 0;
        const a = (rnColor >> 24) & 0xff;
        const r = (rnColor >> 16) & 0xff;
        const g = (rnColor >> 8) & 0xff;
        const b = rnColor & 0xff;
        rnColor = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
      }
      return rnColor;
    }
  }
};

/**
 * Declares the SkiaApi as an available object in the global scope
 */
declare global {
  var SkiaApi: SkiaApiInterface;
}

/**
 * Declares the implemented API with overrides.
 */
export const Skia = {
  // Factories
  Typeface: SkiaApi.Typeface,
  MaskFilter: SkiaApi.MaskFilter,
  RuntimeEffect: SkiaApi.RuntimeEffect,
  Shader: SkiaApi.Shader,
  ImageFilter: SkiaApi.ImageFilter,
  PathEffect: SkiaApi.PathEffect,
  Data: SkiaApi.Data,
  SVG: SkiaApi.SVG,
  FontMgr: SkiaApi.FontMgr,
  TextBlob: SkiaApi.TextBlob,
  // Constructors
  Matrix: SkiaApi.Matrix,
  Font: SkiaApi.Font,
  Point: SkiaApi.Point,
  XYWHRect: SkiaApi.XYWHRect,
  RRectXY: SkiaApi.RRectXY,
  Paint: SkiaApi.Paint,
  PictureRecorder: SkiaApi.PictureRecorder,
  Picture: SkiaApi.Picture,
  Path: SkiaApi.Path,
  ColorFilter: SkiaApi.ColorFilter,
  ContourMeasureIter: SkiaApi.ContourMeasureIter,
  // Here are constructors for data types which are represented as typed arrays in CanvasKit
  Color: SkiaColor,
  parseColorString: SkiaApi.parseColorString,
  RSXform: SkiaApi.RSXform,
  // For the following methods the factory symmetry is broken to be comptatible with CanvasKit
  MakeSurface: SkiaApi.Surface.Make,
  MakeImageFromEncoded: SkiaApi.Image.MakeImageFromEncoded,
  MakeImage: SkiaApi.Image.MakeImage,
  MakeVertices: SkiaApi.MakeVertices,
};

const BLACK = Skia.parseColorString("black")!;
