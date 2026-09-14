#ifdef SK_GRAPHITE

#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <QuartzCore/CAMetalLayer.h>
#import <QuartzCore/CATransaction.h>

#include "MetalLayerColorSpaceUtils.h"
#include "rnskia/RNMetalLayerColorSpace.h"

namespace RNSkia {

// WebGPU canvas values are sRGB-encoded regardless of the texture format
// (GPUCanvasConfiguration.colorSpace defaults to "srgb"), so the same shader
// output must display identically on bgra8unorm and rgba16float surfaces.
// Tagging the float layer as (gamma-encoded) extended sRGB matches the
// browser behavior: identical colors, with the extra precision of float16.
void applyCAMetalLayerColorSpace(void *nativeSurface,
                                 wgpu::TextureFormat format) {
  CALayer *layer = (__bridge CALayer *)nativeSurface;
  if (![layer isKindOfClass:[CAMetalLayer class]]) {
    return;
  }
  auto metalLayer = static_cast<CAMetalLayer *>(layer);
  setCAMetalLayerColorSpace(metalLayer,
                            format == wgpu::TextureFormat::RGBA16Float, false);
  // The change must be set synchronously so the first present already sees
  // it, and it must reach the render server. On a non-main thread (RN JS or
  // worklet runtime) the property lands in that thread's implicit
  // CATransaction, which may never commit on threads without a spinning
  // runloop, so flush it now. On the main thread the runloop commits it.
  if (!NSThread.isMainThread) {
    [CATransaction flush];
  }
}

} // namespace RNSkia

#endif // SK_GRAPHITE
