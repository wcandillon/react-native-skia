import type { TileMode } from "../ImageFilter";
import type { SkShader } from "../Shader";
import type { SkMatrix } from "../Matrix";
import type { SkJSIInstance } from "../JsiInstance";

export enum FilterMode {
  Linear,
  Nearest,
}

export enum MipmapMode {
  None,
  Nearest,
  Linear,
}

export enum ImageFormat {
  PNG,
  JPEG,
  WEBP,
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
}
