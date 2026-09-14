#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"
#include "JsiSkSkottie.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkottieFactory : public JsiSkNativeObject<JsiSkottieFactory> {
public:
  static constexpr const char *CLASS_NAME = "SkottieFactory";

  JSI_HOST_FUNCTION(Make) {
    auto fontMgr = JsiSkFontMgrFactory::getFontMgr(getContext());
    auto json = arguments[0].asString(runtime).utf8(runtime);
    SkottieAssetProvider::AssetMap assets;
    if (count > 1 && arguments[1].isObject()) {
      auto jsAssetMap = arguments[1].asObject(runtime);

      // Convert JS object to C++ AssetMap
      auto propertyNames = jsAssetMap.getPropertyNames(runtime);
      size_t propertyCount = propertyNames.size(runtime);

      for (size_t i = 0; i < propertyCount; i++) {
        auto propertyName =
            propertyNames.getValueAtIndex(runtime, i).asString(runtime);
        auto key = propertyName.utf8(runtime);
        auto jsValue = jsAssetMap.getProperty(runtime, propertyName);

        if (jsValue.isObject()) {
          auto jsObject = jsValue.asObject(runtime);

          // Check if the object is a SkData host object
          auto skData = tryGetJsiObject<JsiSkData>(runtime, jsObject);
          if (skData) {
            std::string k = key;
            assets[k] = skData->getObject();
          }
        }
      }
    }

    auto managedAnimation = std::make_shared<ManagedAnimation>(
        json, std::move(assets), std::move(fontMgr));
    if (!managedAnimation->_animation) {
      return jsi::Value::null();
    }
    return makeJsiObject(
        runtime, std::make_shared<JsiSkSkottie>(getContext(),
                                                std::move(managedAnimation)));
  }

  size_t getMemoryPressure() override { return 4096; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "Make", &JsiSkottieFactory::Make);
  }

  explicit JsiSkottieFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkottieFactory>(std::move(context)) {}
};

} // namespace RNSkia
