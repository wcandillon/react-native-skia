#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkTypefaceFontProvider.h"

namespace RNSkia {

namespace jsi = facebook::jsi;
namespace para = skia::textlayout;

class JsiSkTypefaceFontProviderFactory
    : public JsiSkNativeObject<JsiSkTypefaceFontProviderFactory> {
public:
  static constexpr const char *CLASS_NAME = "TypefaceFontProviderFactory";

  std::shared_ptr<JsiSkTypefaceFontProvider> Make() {
    return std::make_shared<JsiSkTypefaceFontProvider>(
        getContext(), sk_make_sp<para::TypefaceFontProvider>());
  }

  size_t getMemoryPressure() override { return 2048; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "Make",
                  &JsiSkTypefaceFontProviderFactory::Make);
  }

  explicit JsiSkTypefaceFontProviderFactory(
      std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkTypefaceFontProviderFactory>(
            std::move(context)) {}
};

} // namespace RNSkia
