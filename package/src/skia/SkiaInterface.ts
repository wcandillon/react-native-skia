import type { SVGFactory } from "react";

import type { Color, SkColor } from "./Color";
import type { ColorFilterFactory } from "./ColorFilter";
import type { SkContourMeasureIter } from "./ContourMeasure";
import type { DataFactory } from "./Data";
import type { SkFont } from "./Font";
import type { FontMgrFactory } from "./FontMgr";
import type { ImageFactory } from "./Image";
import type { ImageFilterFactory } from "./ImageFilter";
import type { MaskFilterFactory } from "./MaskFilter";
import type { SkMatrix } from "./Matrix";
import type { SkPaint } from "./Paint";
import type { SkPath, PathFactory } from "./Path";
import type { PathEffectFactory } from "./PathEffect";
import type { SkPictureRecorder, PictureFactory } from "./Picture";
import type { SkPoint } from "./Point";
import type { SkRect } from "./Rect";
import type { SkRRect } from "./RRect";
import type { SkRSXform } from "./RSXform";
import type { RuntimeEffectFactory } from "./RuntimeEffect";
import type { ShaderFactory } from "./Shader";
import type { SurfaceFactory } from "./Surface";
import type { TextBlobFactory } from "./TextBlob";
import type { SkTypeface, TypefaceFactory } from "./Typeface";
import type { VertexMode, SkVertices } from "./Vertices";

/**
 * Declares the interface for the native Skia API
 */
export interface SkiaApiInterface {
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
