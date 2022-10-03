import type { SkData } from "../Data";

import type { SkImage } from "./Image";

export enum AlphaType {
  Unknown,
  Opaque,
  Premul,
  Unpremul,
}

export enum ColorType {
  Unknown, //!< uninitialized
  Alpha_8, //!< pixel with alpha in 8-bit byte
  RGB_565, //!< pixel with 5 bits red, 6 bits green, 5 bits blue, in 16-bit word
  ARGB_4444, //!< pixel with 4 bits for alpha, red, green, blue; in 16-bit word
  RGBA_8888, //!< pixel with 8 bits for red, green, blue, alpha; in 32-bit word
  RGB_888x, //!< pixel with 8 bits each for red, green, blue; in 32-bit word
  BGRA_8888, //!< pixel with 8 bits for blue, green, red, alpha; in 32-bit word
  RGBA_1010102, //!< 10 bits for red, green, blue; 2 bits for alpha; in 32-bit word
  BGRA_1010102, //!< 10 bits for blue, green, red; 2 bits for alpha; in 32-bit word
  RGB_101010x, //!< pixel with 10 bits each for red, green, blue; in 32-bit word
  BGR_101010x, //!< pixel with 10 bits each for blue, green, red; in 32-bit word
  Gray_8, //!< pixel with grayscale level in 8-bit byte
  RGBA_F16Norm, //!< pixel with half floats in [0,1] for red, green, blue, alpha;
  //   in 64-bit word
  RGBA_F16, //!< pixel with half floats for red, green, blue, alpha;
  //   in 64-bit word
  RGBA_F32, //!< pixel using C float for red, green, blue, alpha; in 128-bit word

  // The following 6 colortypes are just for reading from - not for rendering to
  R8G8_unorm, //!< pixel with a uint8_t for red and green

  A16_float, //!< pixel with a half float for alpha
  R16G16_float, //!< pixel with a half float for red and green

  A16_unorm, //!< pixel with a little endian uint16_t for alpha
  R16G16_unorm, //!< pixel with a little endian uint16_t for red and green
  R16G16B16A16_unorm, //!< pixel with a little endian uint16_t for red, green, blue
  //   and alpha
  SRGBA_8888,
}

export interface ImageInfo {
  alphaType: AlphaType;
  // TODO: add support for color space
  // colorSpace: ColorSpace;
  colorType: ColorType;
  height: number;
  width: number;
}

export interface ImageFactory {
  /**
   * Return an Image backed by the encoded data, but attempt to defer decoding until the image
   * is actually used/drawn. This deferral allows the system to cache the result, either on the
   * CPU or on the GPU, depending on where the image is drawn.
   * This decoding uses the codecs that have been compiled into CanvasKit. If the bytes are
   * invalid (or an unrecognized codec), null will be returned. See Image.h for more details.
   * @param data - Data object with bytes of data
   * @returns If the encoded format is not supported, or subset is outside of the bounds of the decoded
   *  image, nullptr is returned.
   */
  MakeImageFromEncoded: (encoded: SkData) => SkImage | null;

  /**
   * Returns an image with the given pixel data and format.
   * Note that we will always make a copy of the pixel data, because of inconsistencies in
   * behavior between GPU and CPU (i.e. the pixel data will be turned into a GPU texture and
   * not modifiable after creation).
   *
   * @param info
   * @param data - bytes representing the pixel data.
   * @param bytesPerRow
   */
  MakeImage(info: ImageInfo, data: SkData, bytesPerRow: number): SkImage | null;
}
