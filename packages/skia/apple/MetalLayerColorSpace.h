#pragma once

#import <QuartzCore/CAMetalLayer.h>

namespace RNSkia {

// Tags the CAMetalLayer with the colorspace matching the bit depth the window
// is configured with and the gamut the view renders in. Main thread only,
// where the platform view calls it before it posts the attach (see
// -[SkiaView attachWindowWithWidth:height:]): the present thread configures
// the surface and never touches a CATransaction.
void applyCAMetalLayerColorSpace(CAMetalLayer *layer, bool highBitDepth,
                                 bool useP3ColorSpace);

} // namespace RNSkia
