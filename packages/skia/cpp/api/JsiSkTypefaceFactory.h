#pragma once

#include <memory>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkData.h"
#include "JsiSkFontMgrFactory.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkTypeface.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkTypefaceFactory : public JsiSkNativeObject<JsiSkTypefaceFactory> {
public:
  static constexpr const char *CLASS_NAME = "TypefaceFactory";

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkTypeface>>
  MakeFreeTypeFaceFromData(sk_sp<SkData> data) {
    auto fontMgr = JsiSkFontMgrFactory::getFontMgr(getContext());
    auto typeface = fontMgr->makeFromData(std::move(data));
    if (typeface == nullptr) {
      return nullptr;
    }
    return std::make_shared<JsiSkTypeface>(getContext(), std::move(typeface));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeFreeTypeFaceFromData",
                  &JsiSkTypefaceFactory::MakeFreeTypeFaceFromData);
  }

  explicit JsiSkTypefaceFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkTypefaceFactory>(std::move(context)) {}
};

} // namespace RNSkia
