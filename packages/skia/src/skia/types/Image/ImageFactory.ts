import type { SkData } from "../Data";
import type { GPUTextureHandle } from "../GPUTexture";

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
  MakeNull: () => SkImage;
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
   * Web only. Creates an image from a `CanvasImageSource`: an
   * `HTMLVideoElement`, an `ImageBitmap`, a canvas, an `HTMLImageElement`...
   *
   * On native platforms, camera and video frames are rendered into a texture
   * of the shared device by React Native WebGPU
   * (`queue.copyExternalImageToTexture()`), and the texture is wrapped with
   * {@link MakeImageFromGPUTexture}. Calling this method there throws.
   *
   * @param source The image source
   */
  MakeImageFromNativeBuffer: (source: CanvasImageSource) => SkImage;

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

  /**
   * Creates an SkImage from a WebGPU texture, without copying it.
   * The texture must be created with React Native WebGPU on the shared
   * device (importDevice(Skia.getNativeDevice())) with the TEXTURE_BINDING
   * usage. The image takes its own reference to the texture, so it stays
   * valid even if the JS GPUTexture is garbage collected; do not call
   * texture.destroy() while the image is in use, as destroy() releases the
   * GPU resource regardless of references.
   *
   * Native only.
   *
   * @param texture - The GPUTexture (see {@link GPUTextureHandle})
   * @returns An SkImage sampling the texture, or throws if the texture is invalid
   */
  MakeImageFromGPUTexture(texture: GPUTextureHandle): SkImage;

  /**
   * Draws an SkImage into a new WebGPU texture on the shared device.
   * The returned pointer carries one reference and must be adopted exactly
   * once with React Native WebGPU's adoptTexture(), which builds the
   * GPUTexture and owns the reference from then on.
   *
   * Native only.
   *
   * @param image - The SkImage to draw into the texture
   * @returns A WGPUTexture pointer for adoptTexture(), or throws on failure
   */
  MakeGPUTextureFromImage(image: SkImage): bigint;
}
