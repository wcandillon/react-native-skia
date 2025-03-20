#pragma once

#include <string>

#include <AVFoundation/AVFoundation.h>
#include <CoreVideo/CoreVideo.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"
#include "include/core/SkSize.h"

#pragma clang diagnostic pop

#include "RNSkPlatformContext.h"
#include "RNSkVideo.h"

namespace RNSkia {

class RNSkAppleVideo : public RNSkVideo {
private:
  std::string _url;
  AVPlayer *_player = nullptr;
  AVPlayerItem *_playerItem = nullptr;
  AVPlayerItemVideoOutput *_videoOutput = nullptr;
  RNSkPlatformContext *_context;
  double _duration = 0;
  double _framerate = 0;
  float _videoWidth = 0;
  float _videoHeight = 0;
  CGAffineTransform _preferredTransform;
  bool _isPlaying = false;
  void setupPlayer();
  NSDictionary *getOutputSettings();

public:
  RNSkAppleVideo(std::string url, RNSkPlatformContext *context);
  ~RNSkAppleVideo();
  sk_sp<SkImage> nextImage(double *timeStamp = nullptr) override;
  double duration() override;
  double framerate() override;
  void seek(double timestamp) override;
  void play();
  void pause();
  float getRotationInDegrees() override;
  SkISize getSize() override;
  void setVolume(float volume);
};

} // namespace RNSkia
