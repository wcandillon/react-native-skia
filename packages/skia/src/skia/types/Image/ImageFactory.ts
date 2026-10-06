import type { SkData } from "../Data";

import type { ColorType } from "./ColorType";
import type { SkImage } from "./Image";

/**
 * A native buffer, as accepted by `MakeImageFromNativeBuffer`.
 *
 * On native platforms it is a raw pointer encoded as a BigInt: an
 * `IOSurfaceRef` or a `CVPixelBufferRef` on Apple platforms, an
 * `AHardwareBuffer*` on Android. This is the shape of
 * `NativeVideoFrame.handle` in React Native WebGPU and of
 * `frame.getNativeBuffer().pointer` in VisionCamera.
 *
 * On Web it is any `CanvasImageSource` (an `HTMLVideoElement`, an
 * `ImageBitmap`, a canvas...).
 */
export type NativeBuffer = bigint | CanvasImageSource;

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
   * Wraps a native buffer (a camera or video frame) into an image, without
   * copying its pixels. On native platforms the buffer is imported into Dawn
   * as shared texture memory, so the image samples the buffer directly.
   *
   * The buffer is typically obtained from React Native WebGPU
   * (`NativeVideoFrame.handle`, from `createVideoPlayer()` or
   * `createVideoFrameFromNativeBuffer()`) or from VisionCamera
   * (`frame.getNativeBuffer().pointer`).
   *
   * The caller keeps ownership of the buffer: keep it alive for as long as the
   * image is in use, and dispose the image before releasing it.
   *
   * The buffer must be in a format Skia can sample (BGRA or RGBA 8 bits, F16,
   * or 10 bits per channel); YUV frames are not supported yet. On Android the
   * buffer must have been allocated with the `GPU_SAMPLED_IMAGE` usage.
   *
   * @param nativeBuffer The native buffer (see {@link NativeBuffer})
   * @throws Throws an error when the buffer cannot be wrapped, with the reason
   */
  MakeImageFromNativeBuffer: (nativeBuffer: NativeBuffer) => SkImage;

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
   * Creates an SkImage from a WebGPU texture.
   * This allows using textures rendered by WebGPU in Skia drawings. The
   * texture crosses the package boundary as a raw pointer: pass
   * `texture.nativePointer` from a react-native-webgpu GPUTexture created on
   * the shared device (importDevice(Skia.getNativeDevice())). The native side
   * takes its own reference, so the handle stays valid even if the JS
   * GPUTexture is garbage collected — but do not call texture.destroy()
   * while the image is in use: destroy() releases the underlying GPU
   * resource regardless of reference counts.
   *
   * Native only.
   *
   * @param pointer - The WGPUTexture pointer (texture.nativePointer)
   * @returns An SkImage wrapping the texture, or throws if the texture is invalid
   */
  MakeImageFromNativeTexture(pointer: bigint): SkImage;

  /**
   * Creates a WebGPU texture from an SkImage.
   * This allows using Skia images in WebGPU rendering pipelines. The
   * returned pointer carries one reference and must be adopted exactly once
   * with react-native-webgpu's adoptTexture(), which owns it from then on.
   *
   * Native only.
   *
   * @param image - An SkImage to convert to a texture
   * @returns A WGPUTexture pointer for adoptTexture(), or throws on failure
   */
  MakeNativeTextureFromImage(image: SkImage): bigint;
}
