import type { SkMatrix } from "../Matrix";
import type { SkJSIInstance } from "../JsiInstance";
import type { TileMode } from "../ImageFilter";
import type { SkShader } from "../Shader";

import type { ImageInfo } from "./ImageFactory";

export interface CubicResampler {
  B: number;
  C: number;
}

export interface FilterOptions {
  filter: FilterMode;
  mipmap?: MipmapMode;
}

export enum FilterMode {
  Nearest,
  Linear,
}

export enum MipmapMode {
  None,
  Nearest,
  Linear,
}

export enum ImageFormat {
  JPEG = 3,
  PNG = 4,
  WEBP = 6,
}

export type SamplingOptions = CubicResampler | FilterOptions;

export const isCubicSampling = (
  sampling: SamplingOptions
): sampling is CubicResampler => {
  "worklet";
  return "B" in sampling && "C" in sampling;
};

export const MitchellCubicSampling = { B: 1 / 3.0, C: 1 / 3.0 };
export const CatmullRomCubicSampling = { B: 0, C: 1 / 2.0 };
export const CubicSampling = { B: 0, C: 0 };
export const MakeCubic = (B: number, C: number) => ({ B, C });

export interface SkImage extends SkJSIInstance<"Image"> {
  /**
   * Returns the possibly scaled height of the image.
   */
  height(): number;

  /**
   * Returns the possibly scaled width of the image.
   */
  width(): number;

  /**
   * Returns the ImageInfo describing the image.
   */
  getImageInfo(): ImageInfo;

  /**
   * Returns this image as a shader with the specified tiling. It will use cubic sampling.
   * @param tx - tile mode in the x direction.
   * @param ty - tile mode in the y direction.
   * @param fm - The filter mode. (default nearest)
   * @param mm - The mipmap mode. Note: for settings other than None, the image must have mipmaps (default none)
   *             calculated with makeCopyWithDefaultMipmaps;
   * @param localMatrix
   */
  makeShaderOptions(
    tx: TileMode,
    ty: TileMode,
    fm: FilterMode,
    mm: MipmapMode,
    localMatrix?: SkMatrix
  ): SkShader;

  /**
   * Returns this image as a shader with the specified tiling. It will use cubic sampling.
   * @param tx - tile mode in the x direction.
   * @param ty - tile mode in the y direction.
   * @param B - See CubicResampler in SkSamplingOptions.h for more information
   * @param C - See CubicResampler in SkSamplingOptions.h for more information
   * @param localMatrix
   */
  makeShaderCubic(
    tx: TileMode,
    ty: TileMode,
    B: number,
    C: number,
    localMatrix?: SkMatrix
  ): SkShader;

  /** Encodes Image pixels, returning result as UInt8Array. Returns existing
     encoded data if present; otherwise, SkImage is encoded with
     SkEncodedImageFormat::kPNG. Skia must be built with SK_ENCODE_PNG to encode
     SkImage.

    Returns nullptr if existing encoded data is missing or invalid, and
    encoding fails.

    @param fmt - PNG is the default value.
    @param quality - a value from 0 to 100; 100 is the least lossy. May be ignored.

    @return  Uint8Array with data
  */
  encodeToBytes(fmt?: ImageFormat, quality?: number): Uint8Array;

  /** Encodes Image pixels, returning result as a base64 encoded string. Returns existing
     encoded data if present; otherwise, SkImage is encoded with
     SkEncodedImageFormat::kPNG. Skia must be built with SK_ENCODE_PNG to encode
     SkImage.

    Returns nullptr if existing encoded data is missing or invalid, and
    encoding fails.

    @param fmt - PNG is the default value.
    @param quality - a value from 0 to 100; 100 is the least lossy. May be ignored.

    @return  base64 encoded string of data
  */
  encodeToBase64(fmt?: ImageFormat, quality?: number): string;

  /** Read Image pixels
   *
   * On a GPU image, only the requested rectangle is read back from the GPU,
   * and the call waits for it. To read back without blocking, call
   * {@link makeRasterImage} first.
   *
   * @param srcX - optional x-axis upper left corner of the rectangle to read from
   * @param srcY - optional y-axis upper left corner of the rectangle to read from
   * @param imageInfo - optional describes the pixel format and dimensions of the data to read into
   * @return Float32Array or Uint8Array with data or null if the read failed.
   */
  readPixels(
    srcX?: number,
    srcY?: number,
    imageInfo?: ImageInfo
  ): Float32Array | Uint8Array | null;

  /**
   * Returns raster image or lazy image. Copies SkImage backed by GPU texture
   * into CPU memory if needed, waiting for the GPU. Returns original SkImage
   * if decoded in raster bitmap, or if encoded in a stream.
   * Returns null if the conversion fails.
   *
   * This is the synchronous counterpart of {@link makeRasterImage}, for
   * worklets and scripts; on the JS thread, prefer `makeRasterImage()`.
   */
  makeNonTextureImage(): SkImage | null;

  /**
   * Resolves to a CPU image, without blocking the calling thread: a GPU
   * image is read back from the GPU, an encoded image is decoded on a
   * background thread, and a raster image resolves to itself.
   *
   * Encoding or reading the pixels of the result is then a CPU operation.
   * The promise resolves on the JS thread: call it from there, not from a
   * worklet (see {@link makeNonTextureImage}).
   */
  makeRasterImage(): Promise<SkImage>;
}
