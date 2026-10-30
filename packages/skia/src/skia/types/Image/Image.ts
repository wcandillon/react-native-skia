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

  /**
   * Resolves to the pixels of the image encoded in `fmt` (PNG by default),
   * as a Uint8Array. A GPU image is read back first; the encoding runs on
   * a background thread. Returns existing encoded data if present.
   *
   * Rejects when the image cannot be read back or encoded.
   *
   * @param fmt - PNG is the default value.
   * @param quality - a value from 0 to 100; 100 is the least lossy. May be ignored.
   */
  encodeToBytes(fmt?: ImageFormat, quality?: number): Promise<Uint8Array>;

  /**
   * Resolves to the pixels of the image encoded in `fmt` (PNG by default),
   * as a base64 string. A GPU image is read back first; the encoding runs
   * on a background thread. Returns existing encoded data if present.
   *
   * Rejects when the image cannot be read back or encoded.
   *
   * @param fmt - PNG is the default value.
   * @param quality - a value from 0 to 100; 100 is the least lossy. May be ignored.
   */
  encodeToBase64(fmt?: ImageFormat, quality?: number): Promise<string>;

  /**
   * Resolves to the pixels of the image, converted to `imageInfo` (the
   * image's own by default): a Float32Array for an F32 color type, else a
   * Uint8Array; to null when nothing could be read. On a GPU image, only
   * the requested rectangle is read back; the part of the rectangle
   * outside the image stays zero.
   *
   * @param srcX - optional x-axis upper left corner of the rectangle to read from
   * @param srcY - optional y-axis upper left corner of the rectangle to read from
   * @param imageInfo - optional describes the pixel format and dimensions of the data to read into
   */
  readPixels(
    srcX?: number,
    srcY?: number,
    imageInfo?: ImageInfo
  ): Promise<Float32Array | Uint8Array | null>;

  /**
   * Resolves to a CPU image: a GPU image is read back from the GPU, an
   * encoded image is decoded on a background thread, and a raster image
   * resolves to itself. Rejects when the readback fails.
   *
   * Readbacks are asynchronous, as the GPU is: there is no synchronous
   * counterpart. The promise settles on the runtime that called: the React
   * Native runtime, the Reanimated UI runtime, or a worklet runtime of your
   * own (which polls for the result through its own setTimeout while it
   * waits).
   */
  makeRasterImage(): Promise<SkImage>;

  /**
   * Returns a GPU image: the image is uploaded now, on the calling thread,
   * and every canvas draws it afterwards without a copy. A raster image
   * drawn directly is uploaded on the first frame that draws it instead,
   * once, shared by every canvas, and held in a cache for as long as it is
   * drawn;
   * an encoded image is decoded first. Returns the image itself when it
   * already is a GPU image. Throws if the upload fails.
   *
   * Native only: on the Web, a texture belongs to the canvas that created
   * it, so the image is returned as is.
   *
   * @param opts - `mipmapped`: also build the mipmaps, for the
   * `MipmapMode` sampling options.
   */
  makeTextureImage(opts?: { mipmapped?: boolean }): SkImage;
}
