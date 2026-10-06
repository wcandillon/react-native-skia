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
   * Returns a CPU backed surface with the given dimensions, an SRGB colorspace, Unpremul
   * alphaType and 8888 color type. The pixels belonging to this surface  will be in memory and
   * not visible.
   * @param width - number of pixels of the width of the drawable area.
   * @param height - number of pixels of the height of the drawable area.
   */
  Make: (width: number, height: number) => SkSurface | null;

  /**
   * Creates a GPU backed surface.
   * @param width - number of pixels of the width of the drawable area.
   * @param height - number of pixels of the height of the drawable area.
   * @param opts - optional surface options (e.g. colorSpace: "display-p3" | "srgb").
   */
  MakeOffscreen: (
    width: number,
    height: number,
    opts?: SurfaceOptions
  ) => SkSurface | null;

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
   * @returns An SkSurface rendering into the texture, or throws if the texture is invalid
   */
  MakeFromGPUTexture: (texture: GPUTextureHandle) => SkSurface;
}
