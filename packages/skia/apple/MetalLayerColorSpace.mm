#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <QuartzCore/CAMetalLayer.h>

#include "MetalLayerColorSpace.h"

namespace RNSkia {

// The surface holds gamma-encoded (SDR) values in the gamut the view renders
// in (sRGB or Display P3, see DawnUtils::viewColorSpace) regardless of the
// texture format, so the same content must display identically on bgra8unorm
// and rgba16float surfaces. With an 8-bit format a nil colorspace displays
// sRGB values as they are, but Core Animation reads a float-format layer with
// a nil colorspace as extended linear sRGB, which displays the same values
// noticeably brighter. Tagging the float layer with the gamma-encoded
// extended colorspace of its gamut gives identical colors, with the extra
// precision of float16.
void applyCAMetalLayerColorSpace(CAMetalLayer *layer, bool highBitDepth,
                                 bool useP3ColorSpace) {
  // Main thread only: the property lands in the calling thread's implicit
  // CATransaction, which the main run loop commits. Committing it from any
  // other thread ([CATransaction flush]) commits the whole layer tree there,
  // and lays out whatever UIKit view has a layout pending, off the main
  // thread (#4474).
  NSCAssert(NSThread.isMainThread,
            @"applyCAMetalLayerColorSpace must be called on the main thread");
  CFStringRef name = nullptr;
  if (highBitDepth) {
    name = useP3ColorSpace ? kCGColorSpaceExtendedDisplayP3
                           : kCGColorSpaceExtendedSRGB;
  } else if (useP3ColorSpace) {
    name = kCGColorSpaceDisplayP3;
  }
  // An 8-bit sRGB layer keeps the nil colorspace it is made with (no color
  // matching).
  if (name == nullptr) {
    return;
  }
  CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(name);
  layer.colorspace = colorSpace;
  CGColorSpaceRelease(colorSpace);
}

} // namespace RNSkia
