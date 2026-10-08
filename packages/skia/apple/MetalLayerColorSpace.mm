#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <QuartzCore/CAMetalLayer.h>
#import <QuartzCore/CATransaction.h>

#include "MetalLayerColorSpaceUtils.h"
#include "rnskia/RNMetalLayerColorSpace.h"

namespace RNSkia {

// The surface holds gamma-encoded values in the gamut the view renders in
// (sRGB or Display P3, see DawnUtils::viewColorSpace) regardless of the
// texture format, so the same content must display identically on bgra8unorm
// and rgba16float surfaces. Tagging the float layer with the gamma-encoded
// extended colorspace of that gamut gives identical colors, with the extra
// precision of float16.
void applyCAMetalLayerColorSpace(void *nativeSurface,
                                 wgpu::TextureFormat format,
                                 bool useP3ColorSpace) {
  CALayer *layer = (__bridge CALayer *)nativeSurface;
  if (![layer isKindOfClass:[CAMetalLayer class]]) {
    return;
  }
  auto metalLayer = static_cast<CAMetalLayer *>(layer);
  setCAMetalLayerColorSpace(
      metalLayer, format == wgpu::TextureFormat::RGBA16Float, useP3ColorSpace);
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
