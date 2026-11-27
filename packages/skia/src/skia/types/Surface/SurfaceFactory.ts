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
   * Returns a CPU backed surface with the given dimensions, Premul alphaType and
   * 8888 color type. The pixels belonging to this surface will be in memory and
   * not visible. Without a color space the surface is untagged and images with
   * an ICC profile (e.g. Display P3 photos) are drawn without color conversion.
   * @param width - number of pixels of the width of the drawable area.
   * @param height - number of pixels of the height of the drawable area.
   * @param opts - optional surface options (e.g. colorSpace: "srgb" | "display-p3").
   */
  Make: (
    width: number,
    height: number,
    opts?: SurfaceOptions
  ) => SkSurface | null;

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
   * (zero-copy). The texture must be created on Skia's device
   * (importDevice(Skia.getNativeDevice())) with RENDER_ATTACHMENT usage; add
   * TEXTURE_BINDING to sample what Skia drew from WebGPU after each flush().
   * The surface holds its own reference to the texture and keeps it alive
   * for its lifetime, so the caller may release the GPUTexture once the
   * surface exists. Calling destroy() on the GPUTexture still invalidates
   * the surface.
   *
   * Note: This method is only available when the Graphite backend is enabled.
   *
   * @param pointer - The WGPUTexture pointer (texture.nativePointer)
   * @returns An SkSurface rendering into the texture, or throws if the texture is invalid
   */
  MakeFromNativeTexture: (pointer: bigint) => SkSurface;
}
