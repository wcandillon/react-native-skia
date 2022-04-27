import { Platform, processColor } from "react-native";

/*global SkiaApi*/
import type { ImageFilterFactory } from "./ImageFilter";
import type { PathFactory } from "./Path";
import type { ColorFilterFactory } from "./ColorFilter";
import type { SkFont } from "./Font";
import type { SkTypeface, TypefaceFactory } from "./Typeface";
import type { ImageFactory } from "./Image";
import type { MaskFilterFactory } from "./MaskFilter";
import type { SkPaint } from "./Paint";
import type { SkRect } from "./Rect";
import type { SkRRect } from "./RRect";
import type { RuntimeEffectFactory } from "./RuntimeEffect";
import type { ShaderFactory } from "./Shader";
import type { SkMatrix } from "./Matrix";
import type { PathEffectFactory } from "./PathEffect";
import type { SkPoint } from "./Point";
import type { SkVertices, VertexMode } from "./Vertices/Vertices";
import type { DataFactory } from "./Data";
import type { SVGFactory } from "./SVG";
import type { TextBlobFactory } from "./TextBlob";
import type { FontMgrFactory } from "./FontMgr/FontMgrFactory";
import type { SurfaceFactory } from "./Surface";
import "./NativeSetup";
import type { SkRSXform } from "./RSXform";
import type { SkPath } from "./Path/Path";
import type { SkContourMeasureIter } from "./ContourMeasure";
import type { PictureFactory, SkPictureRecorder } from "./Picture";
import type { Color, SkColor } from "./Color";

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
      throw new Error("Skia couldn't parse the following color " + cl);
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
 * Declares the interface for the native Skia API
 */
export interface Skia {
  Point: (x: number, y: number) => SkPoint;
  XYWHRect: (x: number, y: number, width: number, height: number) => SkRect;
  RRectXY: (rect: SkRect, rx: number, ry: number) => SkRRect;
  RSXform: (scos: number, ssin: number, tx: number, ty: number) => SkRSXform;
  Color: (color: Color) => SkColor;
  parseColorString: (color: string) => SkColor | undefined;
  ContourMeasureIter: (
    path: SkPath,
    forceClosed: boolean,
    resScale: number
  ) => SkContourMeasureIter;
  Paint: () => SkPaint;
  PictureRecorder: () => SkPictureRecorder;
  Picture: PictureFactory;
  Path: PathFactory;
  Matrix: () => SkMatrix;
  ColorFilter: ColorFilterFactory;
  Font: (typeface?: SkTypeface, size?: number) => SkFont;
  Typeface: TypefaceFactory;
  MaskFilter: MaskFilterFactory;
  RuntimeEffect: RuntimeEffectFactory;
  ImageFilter: ImageFilterFactory;
  Shader: ShaderFactory;
  PathEffect: PathEffectFactory;
  /**
   * Returns an Vertices based on the given positions and optional parameters.
   * See SkVertices.h (especially the Builder) for more details.
   * @param mode
   * @param positions
   * @param textureCoordinates
   * @param colors - either a list of int colors or a flattened color array.
   * @param indices
   * @param isVolatile
   */
  MakeVertices(
    mode: VertexMode,
    positions: SkPoint[],
    textureCoordinates?: SkPoint[] | null,
    colors?: SkColor[],
    indices?: number[] | null,
    isVolatile?: boolean
  ): SkVertices;
  Data: DataFactory;
  Image: ImageFactory;
  SVG: SVGFactory;
  FontMgr: FontMgrFactory;
  TextBlob: TextBlobFactory;
  Surface: SurfaceFactory;
}

/**
 * Declares the SkiaApi as an available object in the global scope
 */
declare global {
  var SkiaApi: Skia;
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
