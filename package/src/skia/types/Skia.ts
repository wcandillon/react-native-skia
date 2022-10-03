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
import type {
  RuntimeEffectFactory,
  SkRuntimeEffect,
  SkRuntimeShaderBuilder,
} from "./RuntimeEffect";
import type { ShaderFactory } from "./Shader";
import type { SkMatrix } from "./Matrix";
import type { PathEffectFactory } from "./PathEffect";
import type { SkPoint } from "./Point";
import type { SkVertices, VertexMode } from "./Vertices/Vertices";
import type { DataFactory } from "./Data";
import type { SVGFactory } from "./SVG";
import type { TextBlobFactory } from "./TextBlob";
import type { SurfaceFactory } from "./Surface";
import type { SkRSXform } from "./RSXform";
import type { SkPath } from "./Path/Path";
import type { SkContourMeasureIter } from "./ContourMeasure";
import type { PictureFactory, SkPictureRecorder } from "./Picture";
import type { Color, SkColor } from "./Color";

/**
 * Declares the interface for the native Skia API
 */
export interface Skia {
  Point: (x: number, y: number) => SkPoint;
  XYWHRect: (x: number, y: number, width: number, height: number) => SkRect;
  RuntimeShaderBuilder: (rt: SkRuntimeEffect) => SkRuntimeShaderBuilder;
  RRectXY: (rect: SkRect, rx: number, ry: number) => SkRRect;
  RSXform: (scos: number, ssin: number, tx: number, ty: number) => SkRSXform;
  Color: (color: Color) => SkColor;
  ContourMeasureIter: (
    path: SkPath,
    forceClosed: boolean,
    resScale: number
  ) => SkContourMeasureIter;
  Paint: () => SkPaint;
  PictureRecorder: () => SkPictureRecorder;
  Picture: PictureFactory;
  Path: PathFactory;
  Matrix: (matrix?: readonly number[]) => SkMatrix;
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
  TextBlob: TextBlobFactory;
  Surface: SurfaceFactory;
}
