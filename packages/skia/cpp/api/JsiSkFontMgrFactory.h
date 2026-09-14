#pragma once

#include <memory>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkFontMgr.h"
#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkFontMgr.h"
#include "include/ports/SkFontMgr_data.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkFontMgrFactory : public JsiSkNativeObject<JsiSkFontMgrFactory> {
public:
  static constexpr const char *CLASS_NAME = "FontMgrFactory";

  static sk_sp<SkFontMgr>
  getFontMgr(std::shared_ptr<RNSkPlatformContext> context) {
    static SkOnce once;
    static sk_sp<SkFontMgr> fontMgr;
    once([&context] { fontMgr = context->createFontMgr(); });
    return fontMgr;
  }

  std::shared_ptr<JsiSkFontMgr> System() {
    auto fontMgr = JsiSkFontMgrFactory::getFontMgr(getContext());
    return std::make_shared<JsiSkFontMgr>(getContext(), fontMgr);
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "System", &JsiSkFontMgrFactory::System);
  }

  explicit JsiSkFontMgrFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkFontMgrFactory>(std::move(context)) {}
};

} // namespace RNSkia
