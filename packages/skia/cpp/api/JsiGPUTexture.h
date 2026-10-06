#pragma once

#include <stdexcept>
#include <string>

#include <jsi/jsi.h>

#include "webgpu/webgpu_cpp.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

// Reads a GPUTexture argument: the react-native-webgpu object, whose
// nativePointer (a non-spec extension) holds the WGPUTexture handle, or the
// handle itself as a BigInt for libraries that export textures without
// react-native-webgpu. The returned wgpu::Texture holds a reference of its
// own, so the image or surface wrapping it keeps the texture alive while the
// caller keeps ownership of the JS object.
inline wgpu::Texture gpuTextureFromValue(jsi::Runtime &runtime,
                                         const jsi::Value &value,
                                         const char *method) {
  uint64_t raw = 0;
  if (value.isBigInt()) {
    raw = value.asBigInt(runtime).asUint64(runtime);
  } else if (value.isObject()) {
    auto pointer =
        value.asObject(runtime).getProperty(runtime, "nativePointer");
    if (!pointer.isBigInt()) {
      throw std::runtime_error(
          std::string(method) +
          " expects a GPUTexture created with react-native-webgpu on the "
          "shared device (or a WGPUTexture pointer as a BigInt)");
    }
    raw = pointer.asBigInt(runtime).asUint64(runtime);
  } else {
    throw std::runtime_error(std::string(method) +
                             " expects a GPUTexture or a WGPUTexture pointer");
  }
  auto texture = reinterpret_cast<WGPUTexture>(raw);
  if (texture == nullptr) {
    throw std::runtime_error(std::string(method) + ": the texture is null");
  }
  wgpuTextureAddRef(texture);
  return wgpu::Texture::Acquire(texture);
}

} // namespace RNSkia
