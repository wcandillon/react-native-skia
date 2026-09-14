#pragma once

#include <algorithm>
#include <cmath>
#include <limits>
#include <memory>
#include <string>
#include <utility>

#include "JsiSkNativeObjects.h"
#include "api/third_party/base64.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "JsiSkImage.h"
#include "include/codec/SkEncodedImageFormat.h"
#include "include/core/SkStream.h"

#include "include/android/SkAnimatedImage.h"
#include "include/codec/SkAndroidCodec.h"

#pragma clang diagnostic pop

#include <jsi/jsi.h>

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkAnimatedImage
    : public JsiSkWrappingSkPtrNativeObject<JsiSkAnimatedImage,
                                            SkAnimatedImage> {
public:
  static constexpr const char *CLASS_NAME = "AnimatedImage";

  // TODO-API: Properties?
  std::shared_ptr<JsiSkImage> getCurrentFrame() {
    auto image = getObject()->getCurrentFrame();
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
  }

  int getFrameCount() { return static_cast<int>(getObject()->getFrameCount()); }

  int currentFrameDuration() {
    return static_cast<int>(getObject()->currentFrameDuration());
  }

  int decodeNextFrame() {
    return static_cast<int>(getObject()->decodeNextFrame());
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "getFrameCount",
                  &JsiSkAnimatedImage::getFrameCount);
    installMethod(runtime, prototype, "getCurrentFrame",
                  &JsiSkAnimatedImage::getCurrentFrame);
    installMethod(runtime, prototype, "currentFrameDuration",
                  &JsiSkAnimatedImage::currentFrameDuration);
    installMethod(runtime, prototype, "decodeNextFrame",
                  &JsiSkAnimatedImage::decodeNextFrame);
  }

  JsiSkAnimatedImage(std::shared_ptr<RNSkPlatformContext> context,
                     const sk_sp<SkAnimatedImage> image)
      : JsiSkWrappingSkPtrNativeObject<JsiSkAnimatedImage, SkAnimatedImage>(
            std::move(context), std::move(image)) {}

  size_t getMemoryPressure() override {
    auto animation = getObject();
    if (!animation) {
      return 0;
    }

    const auto safeMul = [](size_t a, size_t b) {
      if (a == 0 || b == 0) {
        return static_cast<size_t>(0);
      }
      if (std::numeric_limits<size_t>::max() / a < b) {
        return std::numeric_limits<size_t>::max();
      }
      return a * b;
    };

    const auto safeAdd = [](size_t a, size_t b) {
      if (std::numeric_limits<size_t>::max() - a < b) {
        return std::numeric_limits<size_t>::max();
      }
      return a + b;
    };

    SkRect bounds = animation->getBounds();
    auto width = std::max<SkScalar>(0, bounds.width());
    auto height = std::max<SkScalar>(0, bounds.height());
    size_t frameWidth =
        static_cast<size_t>(std::ceil(static_cast<double>(width)));
    size_t frameHeight =
        static_cast<size_t>(std::ceil(static_cast<double>(height)));

    size_t frameBytes = safeMul(safeMul(frameWidth, frameHeight),
                                static_cast<size_t>(4)); // RGBA bytes
    if (frameBytes == 0) {
      if (auto frame = animation->getCurrentFrame()) {
        auto frameInfo = frame->imageInfo();
        size_t bytesPerPixel = static_cast<size_t>(frameInfo.bytesPerPixel());
        if (bytesPerPixel == 0) {
          bytesPerPixel = 4;
        }
        frameBytes = safeMul(safeMul(static_cast<size_t>(frame->width()),
                                     static_cast<size_t>(frame->height())),
                             bytesPerPixel);
      }
    }

    if (frameBytes == 0) {
      return 0;
    }

    int frameCount = animation->getFrameCount();
    if (frameCount <= 0) {
      frameCount = 1;
    }

    // Animated images keep display, decoding, and restore frames resident.
    size_t cachedFrames =
        static_cast<size_t>(std::min(frameCount, 3)); // triple buffering
    size_t estimated = safeMul(frameBytes, cachedFrames);

    // Include codec/metadata overhead.
    estimated = safeAdd(estimated, 256 * 1024);

    return estimated;
  }
};

} // namespace RNSkia
