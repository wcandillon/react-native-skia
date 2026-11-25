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
   * Throws a `SkiaDecodeError` when the bytes are not an image format Skia
   * can decode.
   * @param data - Data object with bytes of data
   */
  MakeFromEncoded: (encoded: SkData) => SkImage;

  /**
   * Web only. Creates an image from a `CanvasImageSource`: an
   * `HTMLVideoElement`, an `ImageBitmap`, a canvas, an `HTMLImageElement`...
   *
   * On native platforms, camera and video frames are rendered into a texture
   * of the shared device by React Native WebGPU
   * (`queue.copyExternalImageToTexture()`), and the texture is wrapped with
   * {@link MakeFromGPUTexture}. Calling this method there throws.
   *
   * @param source The image source
   */
  MakeFromNativeBuffer: (source: CanvasImageSource) => SkImage;

  /**
   * Returns a raster (CPU) image with the given pixel data and format.
   * The pixel data is always copied: the image is not modifiable after
   * creation. Drawing the image uploads it on the first frame that draws
   * it, once, shared by every canvas; call `makeTextureImage()` on it to
   * upload it beforehand.
   *
   * Throws a `SkiaValidationError` when the image info is invalid, or the
   * data does not hold `bytesPerRow * height` bytes.
   *
   * @param info
   * @param data - bytes representing the pixel data.
   * @param bytesPerRow
   */
  MakeRaster(info: ImageInfo, data: SkData, bytesPerRow: number): SkImage;

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
   * Throws a `SkiaValidationError` for a texture without the
   * TEXTURE_BINDING usage, or that is not of the shared device. While the
   * GPU device is lost, it returns an image that draws nothing.
   *
   * @returns An SkImage sampling the texture
   */
  MakeFromGPUTexture(texture: GPUTextureHandle): SkImage;

  /**
   * Draws an SkImage into a new WebGPU texture on the shared device.
   * The returned pointer carries one reference and must be adopted exactly
   * once with React Native WebGPU's adoptTexture(), which builds the
   * GPUTexture and owns the reference from then on.
   *
   * Native only.
   *
   * @param image - The SkImage to draw into the texture
   * Throws a `SkiaOutOfMemoryError` when there is no GPU memory for the
   * texture.
   *
   * @returns A WGPUTexture pointer for adoptTexture()
   */
  MakeGPUTextureFromImage(image: SkImage): bigint;
}
