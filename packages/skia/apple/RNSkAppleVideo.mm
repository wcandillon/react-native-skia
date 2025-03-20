#include <memory>
#include <string>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"

#pragma clang diagnostic pop

#include "RNSkAppleVideo.h"
#include <AVFoundation/AVFoundation.h>
#include <CoreVideo/CoreVideo.h>

namespace RNSkia {

RNSkAppleVideo::RNSkAppleVideo(std::string url, RNSkPlatformContext *context)
    : _url(std::move(url)), _context(context) {
  setupPlayer();
}

RNSkAppleVideo::~RNSkAppleVideo() {
  if (_player) {
    [_player pause];
  }
}

void RNSkAppleVideo::setupPlayer() {
  NSURL *videoURL = [NSURL URLWithString:@(_url.c_str())];
  AVPlayerItem *playerItem = [AVPlayerItem playerItemWithURL:videoURL];
  _player = [AVPlayer playerWithPlayerItem:playerItem];
  _playerItem = playerItem;

  NSDictionary *outputSettings = getOutputSettings();
  _videoOutput =
      [[AVPlayerItemVideoOutput alloc] initWithOutputSettings:outputSettings];
  [playerItem addOutput:_videoOutput];

  CMTime time = playerItem.asset.duration;
  if (time.timescale != 0) {
    _duration = CMTimeGetSeconds(time) * 1000; // Store duration in milliseconds
  }

  AVAssetTrack *videoTrack =
      [[playerItem.asset tracksWithMediaType:AVMediaTypeVideo] firstObject];
  if (videoTrack) {
    _framerate = videoTrack.nominalFrameRate;
    _preferredTransform = videoTrack.preferredTransform;
    CGSize videoSize = videoTrack.naturalSize;
    _videoWidth = videoSize.width;
    _videoHeight = videoSize.height;
  }
  play();
}

sk_sp<SkImage> RNSkAppleVideo::nextImage(double *timeStamp) {
  CMTime currentTime = [_player currentTime];
  CVPixelBufferRef pixelBuffer =
      [_videoOutput copyPixelBufferForItemTime:currentTime
                            itemTimeForDisplay:nullptr];
  if (!pixelBuffer) {
    NSLog(@"No pixel buffer.");
    return nullptr;
  }

  auto skImage = _context->makeImageFromNativeBuffer((void *)pixelBuffer);

  if (timeStamp) {
    *timeStamp = CMTimeGetSeconds(currentTime);
  }

  CVPixelBufferRelease(pixelBuffer);
  return skImage;
}

NSDictionary *RNSkAppleVideo::getOutputSettings() {
  return @{
    (id)kCVPixelBufferPixelFormatTypeKey : @(kCVPixelFormatType_32BGRA),
    (id)kCVPixelBufferMetalCompatibilityKey : @YES
  };
}

float RNSkAppleVideo::getRotationInDegrees() {
  CGFloat rotationAngle = 0.0;
  auto transform = _preferredTransform;
  // Determine the rotation angle in radians
  if (transform.a == 0 && transform.b == 1 && transform.c == -1 &&
      transform.d == 0) {
    rotationAngle = 90;
  } else if (transform.a == 0 && transform.b == -1 && transform.c == 1 &&
             transform.d == 0) {
    rotationAngle = 270;
  } else if (transform.a == -1 && transform.b == 0 && transform.c == 0 &&
             transform.d == -1) {
    rotationAngle = 180;
  }
  return rotationAngle;
}

void RNSkAppleVideo::seek(double timeInMilliseconds) {
  CMTime seekTime =
      CMTimeMakeWithSeconds(timeInMilliseconds / 1000.0, NSEC_PER_SEC);
  [_player seekToTime:seekTime
        toleranceBefore:kCMTimeZero
         toleranceAfter:kCMTimeZero
      completionHandler:^(BOOL finished) {
        if (!finished) {
          NSLog(@"Seek failed or was interrupted.");
        }
      }];
}

void RNSkAppleVideo::play() {
  if (_player) {
    [_player play];
    _isPlaying = true;
  }
}

void RNSkAppleVideo::pause() {
  if (_player) {
    [_player pause];
    _isPlaying = false;
  }
}

double RNSkAppleVideo::duration() { return _duration; }

double RNSkAppleVideo::framerate() { return _framerate; }

SkISize RNSkAppleVideo::getSize() {
  return SkISize::Make(_videoWidth, _videoHeight);
}

void RNSkAppleVideo::setVolume(float volume) { _player.volume = volume; }

} // namespace RNSkia
