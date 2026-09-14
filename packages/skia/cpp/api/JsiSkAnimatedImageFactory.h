#pragma once

#include <memory>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

#include "JsiSkAnimatedImage.h"
#include "JsiSkConverters.h"
#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "jsi/JsiPromises.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkAnimatedImageFactory
    : public JsiSkNativeObject<JsiSkAnimatedImageFactory> {
public:
  static constexpr const char *CLASS_NAME = "AnimatedImageFactory";

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkAnimatedImage>>
  MakeAnimatedImageFromEncoded(sk_sp<SkData> data) {
    auto codec = SkAndroidCodec::MakeFromData(data);
    auto image = SkAnimatedImage::Make(std::move(codec));
    if (image == nullptr) {
      return nullptr;
    }
    return std::make_shared<JsiSkAnimatedImage>(getContext(),
                                                std::move(image));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeAnimatedImageFromEncoded",
                  &JsiSkAnimatedImageFactory::MakeAnimatedImageFromEncoded);
  }

  explicit JsiSkAnimatedImageFactory(
      std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkAnimatedImageFactory>(std::move(context)) {}
};

} // namespace RNSkia
