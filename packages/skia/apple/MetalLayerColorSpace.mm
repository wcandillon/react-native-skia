#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <QuartzCore/CAMetalLayer.h>

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
  // Main thread only: the property lands in the calling thread's implicit
  // CATransaction, which the main run loop commits. Committing it from any
  // other thread ([CATransaction flush]) commits the whole layer tree there,
  // and lays out whatever UIKit view has a layout pending, off the main
  // thread (#4474).
  NSCAssert(NSThread.isMainThread,
            @"applyCAMetalLayerColorSpace must be called on the main thread");
  setCAMetalLayerColorSpace(
      metalLayer, format == wgpu::TextureFormat::RGBA16Float, useP3ColorSpace);
}

} // namespace RNSkia
