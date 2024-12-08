#pragma once

#include <jsi/jsi.h>

#include "RNSkPlatformContext.h"

namespace jsi = facebook::jsi;
namespace react = facebook::react;

namespace RNSkia {

namespace JsiTextureInfo {

inline jsi::Value toValue(jsi::Runtime &runtime, const TextureInfo &texInfo) {
  jsi::Object textureInfo(runtime);
  textureInfo.setProperty(
      runtime, "mtlTexture",
      jsi::BigInt::fromUint64(runtime,
                              reinterpret_cast<uint64_t>(texInfo.mtlTexture)));
  textureInfo.setProperty(runtime, "glTarget",
                          static_cast<int>(texInfo.glTarget));
  textureInfo.setProperty(runtime, "glID", static_cast<int>(texInfo.glID));
  textureInfo.setProperty(runtime, "glFormat",
                          static_cast<int>(texInfo.glFormat));
  textureInfo.setProperty(runtime, "glProtected",
                          static_cast<int>(texInfo.glProtected));
  return textureInfo;
}

inline TextureInfo fromValue(jsi::Runtime &runtime, const jsi::Value &value) {
  auto object = value.getObject(runtime);
  TextureInfo texInfo;
  if (object.hasProperty(runtime, "mtlTexture")) {
    texInfo.mtlTexture =
        reinterpret_cast<const void *>(object.getProperty(runtime, "mtlTexture")
                                           .asBigInt(runtime)
                                           .asUint64(runtime));
  }
  if (object.hasProperty(runtime, "glID")) {
    texInfo.glTarget = static_cast<unsigned int>(
        object.getProperty(runtime, "glTarget").asNumber());
    texInfo.glID = static_cast<unsigned int>(
        object.getProperty(runtime, "glID").asNumber());
    texInfo.glFormat = static_cast<unsigned int>(
        object.getProperty(runtime, "glFormat").asNumber());
    texInfo.glProtected =
        object.getProperty(runtime, "glProtected").asNumber() != 0;
  }
  return texInfo;
}

} // namespace JsiTextureInfo
} // namespace RNSkia
