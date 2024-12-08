import type { SkData } from "../Data";
import type { NativeBuffer } from "../NativeBuffer";

import type { ColorType } from "./ColorType";
import type { SkImage } from "./Image";

export enum AlphaType {
  Unknown,
  Opaque,
  Premul,
  Unpremul,
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
   * Return an Image backed by a given native buffer.
   * The native buffer must be a valid owning reference.
   *
   * For instance, this API is used by
   * [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)
   * to render a Skia Camera preview.
   *
   * - On Android; This is an `AHardwareBuffer*`
   * - On iOS, this is a `CVPixelBufferRef`
   * @param nativeBuffer A strong `uintptr_t` pointer to the native buffer
   * @throws Throws an error if the Image could not be created, for example when the given
   * native buffer is invalid.
   */
  MakeImageFromNativeBuffer: (nativeBuffer: NativeBuffer) => SkImage;

  /**
   *
   * Return an Image backed by a given native texture.
   *
   * The native texture must be a valid owning reference.
   *
   * This API might be used to integrate with other libraries using gpu textures,
   * or to transfer images between different threads.
   *
   * @param texture A native texture handle
   * @param width The width of the texture
   * @param height The height of the texture
   * @param mipmapped Whether the texture is mipmapped
   * @throws Throws an error if the Image could not be created, for example when the given native texture is invalid.
   *
   * @returns Returns a valid SkImage, if the texture is invalid, an error is thrown.
   */
  MakeImageFromNativeTextureUnstable: (
    texture: unknown,
    width: number,
    height: number,
    mipmapped?: boolean
  ) => SkImage;

  /**
   * Returns an image that will be a screenshot of the view represented by
   * the view tag
   * @param viewTag - The tag of the view to make an image from.
   * @returns Returns a valid SkImage, if the view tag is invalid, nullptr is returned.
   */
  MakeImageFromViewTag: (viewTag: number) => Promise<SkImage | null>;

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
