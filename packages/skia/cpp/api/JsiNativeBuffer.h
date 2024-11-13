#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkImage.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 Implementation of the ParagraphBuilderFactory for making ParagraphBuilder JSI
 object
 */
class JsiNativeBufferFactory : public JsiSkHostObject {
public:
  JSI_HOST_FUNCTION(MakeFromImage) {
    auto image = JsiSkImage::fromValue(runtime, arguments[0]);
	DawnContext::getInstance().MakeRasterImage(image);
    uint64_t pointer = getContext()->makeNativeBuffer(image);
    return jsi::BigInt::fromUint64(runtime, pointer);
  }

  JSI_HOST_FUNCTION(Release) {

    jsi::BigInt pointer = arguments[0].asBigInt(runtime);
    const uintptr_t nativeBufferPointer = pointer.asUint64(runtime);

    getContext()->releaseNativeBuffer(nativeBufferPointer);
    return jsi::Value::undefined();
  }

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiNativeBufferFactory, Release),
                       JSI_EXPORT_FUNC(JsiNativeBufferFactory, MakeFromImage))

  explicit JsiNativeBufferFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkHostObject(std::move(context)) {}
};

} // namespace RNSkia
