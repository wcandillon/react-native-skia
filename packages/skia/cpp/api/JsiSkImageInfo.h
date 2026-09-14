#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImageInfo.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImageInfo
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkImageInfo, SkImageInfo> {
public:
  static constexpr const char *CLASS_NAME = "ImageInfo";

  JsiSkImageInfo(std::shared_ptr<RNSkPlatformContext> context,
                 const SkImageInfo &imageInfo)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkImageInfo, SkImageInfo>(
            std::move(context), std::make_shared<SkImageInfo>(imageInfo)) {}

  /**
  Returns the underlying object from a host object of this type
 */
  static std::shared_ptr<SkImageInfo> fromValue(jsi::Runtime &runtime,
                                                const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    auto imageInfo = tryGetJsiObject<JsiSkImageInfo>(runtime, object);
    if (imageInfo) {
      return imageInfo->getObject();
    } else {
      auto width = object.getProperty(runtime, "width").asNumber();
      auto height = object.getProperty(runtime, "height").asNumber();
      auto colorType = static_cast<SkColorType>(
          object.getProperty(runtime, "colorType").asNumber());
      auto alphaType = static_cast<SkAlphaType>(
          object.getProperty(runtime, "alphaType").asNumber());
      // TODO: color space not supported yet
      return std::make_shared<SkImageInfo>(
          SkImageInfo::Make(width, height, colorType, alphaType));
    }
  }

  /**
  Returns the jsi object from a host object of this type
 */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkImageInfo &imageInfo) {
    return makeJsiObject(runtime, std::make_shared<JsiSkImageInfo>(
                                      std::move(context), imageInfo));
  }

  double getWidth() { return static_cast<double>(getObject()->width()); }
  double getHeight() { return static_cast<double>(getObject()->height()); }
  double getColorType() {
    return static_cast<double>(getObject()->colorType());
  }
  double getAlphaType() {
    return static_cast<double>(getObject()->alphaType());
  }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkImageInfo), kMinMemoryPressure);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installGetter(runtime, prototype, "width", &JsiSkImageInfo::getWidth);
    installGetter(runtime, prototype, "height", &JsiSkImageInfo::getHeight);
    installGetter(runtime, prototype, "colorType",
                  &JsiSkImageInfo::getColorType);
    installGetter(runtime, prototype, "alphaType",
                  &JsiSkImageInfo::getAlphaType);
  }
};
} // namespace RNSkia
