#pragma once

#ifdef __APPLE__

#include "webgpu/webgpu_cpp.h"

namespace RNSkia {

// Tags the CAMetalLayer with the colorspace matching the configured texture
// format. Implemented in apple/MetalLayerColorSpace.mm.
void applyCAMetalLayerColorSpace(void *nativeSurface,
                                 wgpu::TextureFormat format);

} // namespace RNSkia

#endif // __APPLE__
