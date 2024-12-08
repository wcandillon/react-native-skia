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
   * Returns the backend texture of the image.
   * The returned object can be used to create a Skia Image object.
   * The returned object is backend specific and should be used with caution.
   * It is the caller's responsibility to ensure that the texture is not used after the image is deleted.
   * The returned object may be null if the image does not have a backend texture.
   *
   * @return backend texture of the image or null
   */
  getNativeTextureUnstable(): unknown;

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
   * into CPU memory if needed. Returns original SkImage if decoded in raster
   * bitmap, or if encoded in a stream.
   */
  makeNonTextureImage(): SkImage;
}
