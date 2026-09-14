import type { ImageFilterFactory } from "./ImageFilter";
import type { PathFactory, PathBuilderFactory } from "./Path";
import type { ColorFilterFactory } from "./ColorFilter";
import type { SkFont, FontMgrFactory } from "./Font";
import type { SkTypeface, TypefaceFactory } from "./Typeface";
import type { ImageFactory } from "./Image";
import type { MaskFilterFactory } from "./MaskFilter";
import type { SkPaint } from "./Paint";
import type { SkHostRect, SkRect } from "./Rect";
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
import type { TypefaceFontProviderFactory } from "./Paragraph/TypefaceFontProviderFactory";
import type { AnimatedImageFactory } from "./AnimatedImage";
import type { ParagraphBuilderFactory } from "./Paragraph/ParagraphBuilder";
import type { Video } from "./Video";
import type { NativeBufferFactory } from "./NativeBuffer";
import type { JsiRecorder } from "./Recorder";
import type { SkottieFactory } from "./Skottie";

/**
 * Declares the interface for the native Skia API
 */
export interface Skia {
  Point: (x: number, y: number) => SkPoint;
  XYWHRect: (x: number, y: number, width: number, height: number) => SkHostRect;
  RuntimeShaderBuilder: (rt: SkRuntimeEffect) => SkRuntimeShaderBuilder;
  RRectXY: (rect: SkRect, rx: number, ry: number) => SkRRect;
  RSXform: (scos: number, ssin: number, tx: number, ty: number) => SkRSXform;
  RSXformFromRadians: (
    scale: number,
    radians: number,
    tx: number,
    ty: number,
    px: number,
    py: number
  ) => SkRSXform;
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
  PathBuilder: PathBuilderFactory;
  Matrix: (matrix?: readonly number[]) => SkMatrix;
  ColorFilter: ColorFilterFactory;
  Font: (typeface?: SkTypeface, size?: number) => SkFont;
  Typeface: TypefaceFactory;
  TypefaceFontProvider: TypefaceFontProviderFactory;
  FontMgr: FontMgrFactory;
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
  AnimatedImage: AnimatedImageFactory;
  SVG: SVGFactory;
  TextBlob: TextBlobFactory;
  Surface: SurfaceFactory;
  ParagraphBuilder: ParagraphBuilderFactory;
  Skottie: SkottieFactory;
  Video: (url: string) => Promise<Video> | Video;
  NativeBuffer: NativeBufferFactory;
  Recorder(): JsiRecorder;
  /**
   * Raw WGPUDevice pointer of Skia's Graphite device, as a BigInt. Pass it to
   * react-native-webgpu's importDevice() to get a GPUDevice sharing Skia's
   * device (zero-copy interop). Only available on Graphite builds; throws
   * otherwise.
   */
  getNativeDevice(): bigint;
}
