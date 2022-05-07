import ColorParser from "color";

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
import type { PictureFactory, SkPicture, SkPictureRecorder } from "./Picture";
import type { Color, SkColor } from "./Color";
import { canvasKit } from "./NativeSetup.web";
import { SkiaApiInterface } from "./SkiaInterface";

/*
 * Parse CSS colors
 */
const SkiaColor = (cl: Color) => {
  if (typeof cl === "number") {
    return cl;
  }
  const color = new ColorParser(cl).rgb().array();
  if (color !== undefined) {
    return canvasKit.current!.Color(
      color[0],
      color[1],
      color[2],
      isNaN(color[3]) ? undefined : color[3]
    );
  } else {
    // If the color is not recognized, we fallback to React Native
    const rnColor = 0; // TODO: RNWeb processColor(cl);
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

class SkiaWebApi implements SkiaApiInterface {
  constructor() {}

  // Factories
  public get Typeface(): TypefaceFactory {
    return canvasKit.current!.Typeface as unknown as TypefaceFactory;
  }

  public get MaskFilter(): MaskFilterFactory {
    return canvasKit.current!.MaskFilter as unknown as MaskFilterFactory;
  }

  public get RuntimeEffect(): RuntimeEffectFactory {
    return canvasKit.current!.RuntimeEffect as unknown as RuntimeEffectFactory;
  }

  public get Shader(): ShaderFactory {
    return canvasKit.current!.Shader as unknown as ShaderFactory;
  }

  public get ImageFilter(): ImageFilterFactory {
    return canvasKit.current!.ImageFilter as unknown as ImageFilterFactory;
  }

  public get PathEffect(): PathEffectFactory {
    return canvasKit.current!.PathEffect as unknown as PathEffectFactory;
  }

  public get Data(): DataFactory {
    return canvasKit.current!.Data as unknown as DataFactory;
  }

  public get SVG(): SVGFactory {
    return canvasKit.current!.SVG as unknown as SVGFactory;
  }

  public get FontMgr(): FontMgrFactory {
    return canvasKit.current!.FontMgr as unknown as FontMgrFactory;
  }

  public get TextBlob(): TextBlobFactory {
    return canvasKit.current!.TextBlob as unknown as TextBlobFactory;
  }

  public get Picture(): PictureFactory {
    return canvasKit.current! as unknown as PictureFactory;
  }

  public get Path(): PathFactory {
    return {
      MakeFromCmds: canvasKit.current!.Path.MakeFromCmds,
      MakeFromOp: canvasKit.current!.Path.MakeFromOp,
      MakeFromSVGString: canvasKit.current!.Path.MakeFromSVGString,
      Make: () => new canvasKit.current!.Path() as unknown as SkPath,
    };
  }

  public ColorFilter(): ColorFilterFactory {
    return {
      MakeBlend: canvasKit.current!.ColorFilter.MakeBlend,
      MakeCompose: canvasKit.current!.ColorFilter.MakeCompose,
      MakeLerp: canvasKit.current!.ColorFilter.MakeLerp,
      MakeMatrix: canvasKit.current!.ColorFilter.MakeMatrix,
      MakeLinearToSRGBGamma:
        canvasKit.current!.ColorFilter.MakeLinearToSRGBGamma,
      // TODO: Missing in canvasKit??
      // MakeLumaColorFilter:canvasKit.current!.ColorFilter.MakeLumaColorFilter,
      MakeSRGBToLinearGamma:
        canvasKit.current!.ColorFilter.MakeSRGBToLinearGamma,
    };
  }

  // Constructors
  Matrix() {
    return canvasKit.current!.Matrix();
  }

  Font(face?: SkTypeface, size?: number): SkFont {
    return new canvasKit.current!.Font(face, size) as unknown as SkFont;
  }

  Point(x: number, y: number) {
    return [x, y] as unknown as SkPoint;
  }

  XYWHRect(x: number, y: number, width: number, height: number) {
    return canvasKit.current!.XYWHRect(
      x,
      y,
      width,
      height
    ) as unknown as SkRect;
  }

  RRectXY(rect: SkRect, rx: number, ry: number) {
    return canvasKit.current!.RRectXY(
      [rect.x, rect.y, rect.width, rect.height],
      rx,
      ry
    ) as unknown as SkRRect;
  }

  Paint() {
    return new canvasKit.current!.Paint() as unknown as SkPaint;
  }

  PictureRecorder() {
    return new canvasKit.current!.PictureRecorder() as unknown as SkPictureRecorder;
  }

  ContourMeasureIter(path: SkPath, forceClosed: boolean, resScale: number) {
    return new canvasKit.current!.ContourMeasureIter(
      path,
      forceClosed,
      resScale
    ) as unknown as SkContourMeasureIter;
  }

  // Here are constructors for data types which are represented as typed arrays in CanvasKit
  public get Color() {
    return SkiaColor;
  }

  parseColorString(cl: string) {
    return new ColorParser(cl).rgb().array();
  }

  public get RSXform() {
    // TODO
    return null;
  }
  // For the following methods the factory symmetry is broken to be comptatible with CanvasKit
  public get MakeSurface() {
    return canvasKit.current!.MakeSurface;
  }
  public get MakeImageFromEncoded() {
    return canvasKit.current!.MakeImageFromEncoded;
  }

  public get MakeImage() {
    return canvasKit.current!.MakeImage;
  }

  public get MakeVertices() {
    return canvasKit.current!.MakeVertices;
  }
}
/**
 * Declares the implemented API with overrides.
 */
export const Skia = new SkiaWebApi();

const BLACK = 0; // Skia.parseColorString("black")!;
