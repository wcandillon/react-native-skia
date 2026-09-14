#ifdef SK_GRAPHITE

#include "RNDawnContext.h"

// Runtime discovery surface for react-native-webgpu.
//
// webgpu looks this symbol up with dlsym(RTLD_DEFAULT, ...) when it creates
// its GPU object and, when found, adopts the returned instance instead of
// creating its own. Sharing one wgpu::Instance across both packages makes
// pointer-based device handoff (RNWebGPU.importDevice(Skia.getNativeDevice()))
// sound: async callbacks of imported devices settle on the instance webgpu
// pumps. Plain C, default visibility: no C++ ABI surface, works across
// separately compiled pods, and stays dlsym-able under -fvisibility=hidden.
extern "C" __attribute__((visibility("default"))) WGPUInstance
rnskia_getWGPUInstance() {
  return RNSkia::DawnContext::getInstance().getWGPUInstance().Get();
}

#endif
