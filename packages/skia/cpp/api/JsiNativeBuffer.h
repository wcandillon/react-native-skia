#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkImage.h"
#include "JsiSkNativeObjects.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 Implementation of the ParagraphBuilderFactory for making ParagraphBuilder JSI
 object
 */
class JsiNativeBufferFactory
    : public JsiSkNativeObject<JsiNativeBufferFactory> {
public:
  static constexpr const char *CLASS_NAME = "NativeBufferFactory";

  // Native buffer pointers travel as BigInts, which the void* converter
  // produces/consumes.
  void *MakeFromImage(sk_sp<SkImage> image) {
    image->makeNonTextureImage();
    uint64_t pointer = getContext()->makeNativeBuffer(image);
    return reinterpret_cast<void *>(pointer);
  }

  void *MakeTestBuffer(int width, int height) {
    uint64_t pointer = getContext()->makeTestNativeBuffer(width, height);
    return reinterpret_cast<void *>(pointer);
  }

  void Release(void *pointer) {
    getContext()->releaseNativeBuffer(reinterpret_cast<uintptr_t>(pointer));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "Release",
                  &JsiNativeBufferFactory::Release);
    installMethod(runtime, prototype, "MakeFromImage",
                  &JsiNativeBufferFactory::MakeFromImage);
    installMethod(runtime, prototype, "MakeTestBuffer",
                  &JsiNativeBufferFactory::MakeTestBuffer);
  }

  size_t getMemoryPressure() override { return 1024; }

  explicit JsiNativeBufferFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiNativeBufferFactory>(std::move(context)) {}
};

} // namespace RNSkia
