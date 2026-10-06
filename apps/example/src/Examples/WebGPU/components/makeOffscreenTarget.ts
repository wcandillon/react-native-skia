// A minimal GPUCanvasContext stand-in that three's WebGPURenderer can draw
// into without an onscreen canvas. Instead of a swapchain, getCurrentTexture()
// always returns one persistent texture created on the given device, so the
// renderer's output can be sampled by whoever owns that device (e.g. wrapped
// into an SkImage with Skia.Image.MakeImageFromNativeTexture when `device` is
// Skia's Graphite device).
// Carries the device alongside the context so it can be handed directly to
// makeWebGPURenderer().
export interface OffscreenTarget {
  device: GPUDevice;
  context: GPUCanvasContext;
  texture: GPUTexture;
  destroy: () => void;
}

export const makeOffscreenTarget = (
  device: GPUDevice,
  width: number,
  height: number
): OffscreenTarget => {
  // three renders to the preferred canvas format when no render target is set.
  const format = navigator.gpu.getPreferredCanvasFormat();
  const usage =
    GPUTextureUsage.RENDER_ATTACHMENT |
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_SRC;
  const texture = device.createTexture({
    size: [width, height],
    format,
    usage,
  });
  // three reads width/height off the canvas for its drawing buffer size.
  const canvas = { width, height } as unknown as HTMLCanvasElement;
  const context: GPUCanvasContext = {
    __brand: "GPUCanvasContext",
    canvas,
    // The texture is allocated up front on the shared device; the renderer's
    // configure() call carries nothing we need.
    configure: () => undefined,
    unconfigure: () => undefined,
    getConfiguration: () => ({
      device,
      format,
      usage,
      viewFormats: [],
      colorSpace: "srgb",
      toneMapping: { mode: "standard" },
      alphaMode: "opaque",
    }),
    getCurrentTexture: () => texture,
  };
  return {
    device,
    context,
    texture,
    destroy: () => texture.destroy(),
  };
};
