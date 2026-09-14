#pragma once

#include <memory>
#include <utility>
#include <variant>

#include "JsiSkNativeObjects.h"
#include <jsi/jsi.h>

#include "JsiSkConverters.h"
#include "JsiSkImage.h"

#include "rnskia/RNSkVideo.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiVideo
    : public JsiSkWrappingSharedPtrNativeObject<JsiVideo, RNSkVideo> {
public:
  static constexpr const char *CLASS_NAME = "Video";

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkImage>> nextImage() {
    double timestamp = 0;
    auto image = getObject()->nextImage(&timestamp);
    if (!image) {
      return nullptr;
    }
    return std::make_shared<JsiSkImage>(getContext(), std::move(image));
  }

  double duration() { return getObject()->duration(); }

  double framerate() { return getObject()->framerate(); }

  double currentTime() { return getObject()->currentTime(); }

  bool isPlaying() { return getObject()->isPlaying(); }

  void seek(double timestamp) { getObject()->seek(timestamp); }

  double rotation() {
    return static_cast<double>(getObject()->getRotationInDegrees());
  }

  SkISize size() { return getObject()->getSize(); }

  void play() { getObject()->play(); }

  void pause() { getObject()->pause(); }

  void setVolume(double volume) {
    getObject()->setVolume(static_cast<float>(volume));
  }

  void setLooping(bool looping) { getObject()->setLooping(looping); }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "nextImage", &JsiVideo::nextImage);
    installMethod(runtime, prototype, "duration", &JsiVideo::duration);
    installMethod(runtime, prototype, "framerate", &JsiVideo::framerate);
    installMethod(runtime, prototype, "currentTime", &JsiVideo::currentTime);
    installMethod(runtime, prototype, "isPlaying", &JsiVideo::isPlaying);
    installMethod(runtime, prototype, "seek", &JsiVideo::seek);
    installMethod(runtime, prototype, "rotation", &JsiVideo::rotation);
    installMethod(runtime, prototype, "size", &JsiVideo::size);
    installMethod(runtime, prototype, "play", &JsiVideo::play);
    installMethod(runtime, prototype, "pause", &JsiVideo::pause);
    installMethod(runtime, prototype, "setVolume", &JsiVideo::setVolume);
    installMethod(runtime, prototype, "setLooping", &JsiVideo::setLooping);
  }

  JsiVideo(std::shared_ptr<RNSkPlatformContext> context,
           std::shared_ptr<RNSkVideo> video)
      : JsiSkWrappingSharedPtrNativeObject<JsiVideo, RNSkVideo>(
            std::move(context), std::move(video)) {}

  size_t getMemoryPressure() override { return 32768; }

  /**
   * Creates the function for construction a new instance of the SkFont
   * wrapper
   * @param context Platform context
   * @return A function for creating a new host object wrapper for the SkFont
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto url = arguments[0].asString(runtime).utf8(runtime);
      auto video = context->createVideo(url);
      // Return the newly constructed object
      return makeJsiObject(runtime, std::make_shared<JsiVideo>(
                                        std::move(context), std::move(video)));
    };
  }
};

} // namespace RNSkia
