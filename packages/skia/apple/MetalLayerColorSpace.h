#pragma once

#import <QuartzCore/CAMetalLayer.h>

namespace RNSkia {

// Tags a new CAMetalLayer with the colorspace matching the bit depth its
// window is configured with and the gamut the view renders in. Main thread
// only, where the platform view calls it as it makes the layer (see
// -[SkiaView willMoveToSuperview:]): the present thread configures the
// surface and never touches a CATransaction.
void applyCAMetalLayerColorSpace(CAMetalLayer *layer, bool highBitDepth,
                                 bool useP3ColorSpace);

} // namespace RNSkia
