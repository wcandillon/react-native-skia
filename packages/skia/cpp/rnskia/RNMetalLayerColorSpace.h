#pragma once

#ifdef __APPLE__

#include "webgpu/webgpu_cpp.h"

namespace RNSkia {

// Tags the CAMetalLayer with the colorspace matching the configured texture
// format and the gamut the view renders in. Implemented in
// apple/MetalLayerColorSpace.mm.
void applyCAMetalLayerColorSpace(void *nativeSurface,
                                 wgpu::TextureFormat format,
                                 bool useP3ColorSpace);

} // namespace RNSkia

#endif // __APPLE__
