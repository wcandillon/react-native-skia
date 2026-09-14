#pragma once

#import <CoreGraphics/CoreGraphics.h>
#import <QuartzCore/CAMetalLayer.h>

namespace RNSkia {

// The surface writes sRGB-encoded (SDR) values regardless of the texture
// format. With an 8-bit format a nil colorspace displays them as-is, but Core
// Animation interprets a float-format layer with a nil colorspace as extended
// linear sRGB, which displays the same values noticeably brighter. Tag the
// float layer with the matching gamma-encoded (extended) colorspace so colors
// are identical to the 8-bit path, only with more precision.
inline void setCAMetalLayerColorSpace(CAMetalLayer *layer, bool isFloatFormat,
                                      bool useP3ColorSpace) {
  if (isFloatFormat) {
    CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(
        useP3ColorSpace ? kCGColorSpaceExtendedDisplayP3
                        : kCGColorSpaceExtendedSRGB);
    layer.colorspace = colorSpace;
    CGColorSpaceRelease(colorSpace);
  } else if (useP3ColorSpace) {
    CGColorSpaceRef colorSpace =
        CGColorSpaceCreateWithName(kCGColorSpaceDisplayP3);
    layer.colorspace = colorSpace;
    CGColorSpaceRelease(colorSpace);
  } else if (layer.colorspace != nil) {
    // Restore the default (no color matching) when reconfiguring a layer
    // back to an 8-bit format.
    layer.colorspace = nil;
  }
}

} // namespace RNSkia
