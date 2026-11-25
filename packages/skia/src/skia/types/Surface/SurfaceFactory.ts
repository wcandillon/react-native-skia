import type { GPUTextureHandle } from "../GPUTexture";

import type { SkSurface } from "./Surface";

export const ColorSpace = {
  SRGB: "srgb",
  DisplayP3: "display-p3",
} as const;

export type ColorSpaceValue = (typeof ColorSpace)[keyof typeof ColorSpace];

export interface SurfaceOptions {
  colorSpace: ColorSpaceValue;
}

export interface SurfaceFactory {
  /**
   * Creates a CPU backed (raster) surface with the given dimensions, an SRGB
   * colorspace and an 8888 color type. Its pixels live in memory: drawing
   * into it runs on the CPU, and the images it snapshots are raster images.
   * For a GPU surface, see {@link MakeOffscreen}.
   *
   * Throws a `SkiaValidationError` for a size below 1x1, and a
   * `SkiaOutOfMemoryError` when there is no memory for the pixels.
   * @param width - number of pixels of the width of the drawable area.
   * @param height - number of pixels of the height of the drawable area.
   */
  MakeRaster: (width: number, height: number) => SkSurface;

  /**
   * Creates a GPU backed surface. For a CPU surface, see {@link MakeRaster}.
   *
   * Throws a `SkiaValidationError` for a size below 1x1 or larger than the
   * GPU's largest texture, a `SkiaOutOfMemoryError` when there is no GPU
   * memory for it, and a `SkiaGPUUnavailableError` on a device without a
   * GPU. While the GPU device is lost (see `Skia.gpu.lost`), it returns a
   * surface that draws nothing, like the objects of a lost WebGPU device:
   * make it again once `Skia.gpu.lost` resolves.
   * @param width - number of pixels of the width of the drawable area.
   * @param height - number of pixels of the height of the drawable area.
   * @param opts - optional surface options (e.g. colorSpace: "display-p3" | "srgb").
   */
  MakeOffscreen: (
    width: number,
    height: number,
    opts?: SurfaceOptions
  ) => SkSurface;

  /**
   * Creates a GPU backed surface that draws directly into a WebGPU texture
   * (zero-copy). The texture must be created with React Native WebGPU on
   * the shared device (importDevice(Skia.getNativeDevice())) with the
   * RENDER_ATTACHMENT usage; add TEXTURE_BINDING to sample what Skia drew
   * from WebGPU after each flush(). The surface holds its own reference to
   * the texture and keeps it alive for its lifetime, so the caller may
   * release the GPUTexture once the surface exists. Calling destroy() on the
   * GPUTexture still invalidates the surface.
   *
   * Native only.
   *
   * @param texture - The GPUTexture (see {@link GPUTextureHandle})
   * Throws a `SkiaValidationError` for a texture without the
   * RENDER_ATTACHMENT usage, or that is not of the shared device. While the
   * GPU device is lost, it returns a surface that draws nothing.
   *
   * @returns An SkSurface rendering into the texture
   */
  MakeFromGPUTexture: (texture: GPUTextureHandle) => SkSurface;
}
