#pragma once

#ifdef __APPLE__

#include "webgpu/webgpu_cpp.h"

namespace RNSkia {

// Tags the CAMetalLayer with the colorspace matching the texture format the
// window is configured with and the gamut the view renders in. Main thread
// only, where the platform view calls it before it posts the attach (see
// -[SkiaView attachWindowWithWidth:height:]): the present thread configures
// the surface and never touches a CATransaction. Implemented in
// apple/MetalLayerColorSpace.mm.
void applyCAMetalLayerColorSpace(void *nativeSurface,
                                 wgpu::TextureFormat format,
                                 bool useP3ColorSpace);

} // namespace RNSkia

#endif // __APPLE__
