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
import type { JsiRecorder } from "./Recorder";
import type { SkottieFactory } from "./Skottie";

/**
 * The GPU Skia renders with, probed once when the module is installed (on
 * a native thread; the first read waits for the probe). On Android Skia
 * renders with Vulkan (1.1 or later), on iOS with Metal. When the device has
 * none, `isAvailable` is false and `error` says why: every `Canvas` stays
 * blank, CPU work (paths, decoding, encoding, raster images) still runs, and
 * the APIs that need the GPU (offscreen surfaces, snapshots, texture images)
 * throw an Error with the same message. The library's Android manifest
 * declares Vulkan 1.1 as a required feature, so the Play Store does not
 * serve the app to such devices unless the app removes that declaration and
 * handles them itself with this flag.
 *
 * `isAvailable` also turns false if the GPU device is lost while the app
 * runs (a driver reset, the GPU out of memory): canvases keep their last
 * frame and stop updating, GPU calls fail or return null, `error` says so,
 * and only a restart of the app recovers.
 */
export interface SkGpuInfo {
  /** Whether Skia can render on this device, right now. */
  readonly isAvailable: boolean;
  /** "Vulkan", "Metal" or "WebGL"; empty when unavailable. */
  readonly backend: string;
  /** The adapter in the terms of WebGPU's GPUAdapterInfo (native only). */
  readonly vendor: string;
  readonly architecture: string;
  readonly device: string;
  readonly description: string;
  /** Why the GPU is unavailable; null when it is. */
  readonly error: string | null;
}

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
   * @param positions - a list of points, or a Float32Array of interleaved
   * x, y pairs. The Float32Array is copied in one go, which is much faster
   * for large meshes that are rebuilt on every frame.
   * @param textureCoordinates - in the same form as positions.
   * @param colors - either a list of int colors or a flattened color array.
   * @param indices
   * @param isVolatile
   */
  MakeVertices(
    mode: VertexMode,
    positions: SkPoint[] | Float32Array,
    textureCoordinates?: SkPoint[] | Float32Array | null,
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
  Recorder(): JsiRecorder;
  /**
   * Raw WGPUDevice pointer of Skia's Graphite device, as a BigInt. Pass it to
   * react-native-webgpu's importDevice() to get a GPUDevice sharing Skia's
   * device (zero-copy interop). Native only.
   */
  getNativeDevice(): bigint;
  /**
   * The GPU Skia renders with, or why there is none. See {@link SkGpuInfo}.
   */
  readonly gpu: SkGpuInfo;
}
