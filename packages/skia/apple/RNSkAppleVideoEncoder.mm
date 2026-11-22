#import "RNSkAppleVideoEncoder.h"

#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <IOSurface/IOSurfaceRef.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>

#include "RNDawnContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace {

std::string describe(NSError *error) {
  if (error == nil) {
    return "unknown error";
  }
  return std::string(error.localizedDescription.UTF8String ?: "") + " (" +
         std::string(error.domain.UTF8String ?: "") + " " +
         std::to_string(error.code) + ")";
}

/** How long a frame or the file may take before the export gives up. */
constexpr auto kTimeout = std::chrono::seconds(20);

class AppleVideoEncoder : public RNSkVideoEncoder {
public:
  explicit AppleVideoEncoder(RNSkVideoEncoderOptions options)
      : _options(std::move(options)) {}

  ~AppleVideoEncoder() override { releaseFrame(); }

  void start() override {
    @autoreleasepool {
      NSString *path = [NSString stringWithUTF8String:_options.path.c_str()];
      NSURL *url = [NSURL fileURLWithPath:path];
      NSFileManager *files = [NSFileManager defaultManager];
      BOOL isDirectory = NO;
      if (![files fileExistsAtPath:path.stringByDeletingLastPathComponent
                       isDirectory:&isDirectory] ||
          !isDirectory) {
        throw RNSkVideoExportError("write-failed",
                                   "exportVideo: the directory of " +
                                       _options.path + " does not exist.");
      }
      NSError *error = nil;
      _writer = [AVAssetWriter assetWriterWithURL:url
                                         fileType:AVFileTypeMPEG4
                                            error:&error];
      if (_writer == nil) {
        throw RNSkVideoExportError("write-failed",
                                   "exportVideo: cannot write " +
                                       _options.path + ": " + describe(error));
      }
      _writer.shouldOptimizeForNetworkUse = YES;

      NSDictionary *compression = @{
        AVVideoAverageBitRateKey : @(_options.bitrate),
        AVVideoExpectedSourceFrameRateKey : @(_options.fps),
        AVVideoMaxKeyFrameIntervalKey :
            @(std::max(1L, std::lround(_options.fps * 2))),
        AVVideoProfileLevelKey : AVVideoProfileLevelH264HighAutoLevel,
      };
      NSDictionary *videoSettings = @{
        AVVideoCodecKey : AVVideoCodecTypeH264,
        AVVideoWidthKey : @(_options.width),
        AVVideoHeightKey : @(_options.height),
        AVVideoCompressionPropertiesKey : compression,
        // What Skia draws is sRGB: tag it as BT.709, which players read
        // as such, rather than leave the matrix for each to guess.
        AVVideoColorPropertiesKey : @{
          AVVideoColorPrimariesKey : AVVideoColorPrimaries_ITU_R_709_2,
          AVVideoTransferFunctionKey : AVVideoTransferFunction_ITU_R_709_2,
          AVVideoYCbCrMatrixKey : AVVideoYCbCrMatrix_ITU_R_709_2,
        },
      };
      if (![_writer canApplyOutputSettings:videoSettings
                              forMediaType:AVMediaTypeVideo]) {
        throw RNSkVideoExportError(
            "unsupported", "exportVideo: the H.264 encoder does not take " +
                               std::to_string(_options.width) + "x" +
                               std::to_string(_options.height) + " at " +
                               std::to_string(_options.bitrate) + " bps.");
      }
      _videoInput =
          [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo
                                             outputSettings:videoSettings];
      _videoInput.expectsMediaDataInRealTime = NO;
      NSDictionary *bufferAttributes = @{
        (id)kCVPixelBufferPixelFormatTypeKey : @(kCVPixelFormatType_32BGRA),
        (id)kCVPixelBufferWidthKey : @(_options.width),
        (id)kCVPixelBufferHeightKey : @(_options.height),
        // IOSurface-backed, so that Dawn can import it.
        (id)kCVPixelBufferIOSurfacePropertiesKey : @{},
        (id)kCVPixelBufferMetalCompatibilityKey : @YES,
      };
      _adaptor = [AVAssetWriterInputPixelBufferAdaptor
          assetWriterInputPixelBufferAdaptorWithAssetWriterInput:_videoInput
                                     sourcePixelBufferAttributes:
                                         bufferAttributes];
      if (![_writer canAddInput:_videoInput]) {
        throw RNSkVideoExportError("unsupported",
                                   "exportVideo: cannot add the video track.");
      }
      [_writer addInput:_videoInput];

      if (_options.audioPath.has_value()) {
        prepareAudio();
      }

      // AVAssetWriter refuses a file that exists: the export replaces it,
      // once nothing else can fail before it writes.
      [files removeItemAtURL:url error:nil];
      _startedWriting = true;
      if (![_writer startWriting]) {
        throw RNSkVideoExportError(
            "write-failed", "exportVideo: cannot write " + _options.path +
                                ": " + describe(_writer.error));
      }
      [_writer startSessionAtSourceTime:kCMTimeZero];
      if (_audioInput != nil) {
        startAudio();
      }
    }
  }

  sk_sp<SkSurface> beginFrame(int64_t index) override {
    @autoreleasepool {
      waitUntil([this]() { return _videoInput.readyForMoreMediaData; },
                [index]() {
                  return "the encoder to take frame " + std::to_string(index);
                });
      CVPixelBufferRef pixelBuffer = nullptr;
      auto status = CVPixelBufferPoolCreatePixelBuffer(
          nullptr, _adaptor.pixelBufferPool, &pixelBuffer);
      if (status != kCVReturnSuccess || pixelBuffer == nullptr) {
        throw RNSkVideoExportError(
            "encoder-failed",
            "exportVideo: no pixel buffer from the encoder's pool (CVReturn " +
                std::to_string(status) + ").");
      }
      _pixelBuffer = pixelBuffer;
      IOSurfaceRef ioSurface = CVPixelBufferGetIOSurface(pixelBuffer);
      if (ioSurface == nullptr) {
        throw RNSkVideoExportError(
            "unsupported",
            "exportVideo: the encoder's pixel buffers have no IOSurface.");
      }
      auto &context = DawnContext::getInstance();
      // The pool hands the same few buffers out again and again: each one's
      // IOSurface is imported once.
      auto surfaceID = IOSurfaceGetID(ioSurface);
      auto found = _memories.find(surfaceID);
      if (found == _memories.end()) {
        wgpu::SharedTextureMemoryIOSurfaceDescriptor ioSurfaceDesc;
        ioSurfaceDesc.ioSurface = ioSurface;
        ioSurfaceDesc.allowStorageBinding = false;
        wgpu::SharedTextureMemoryDescriptor desc;
        desc.nextInChain = &ioSurfaceDesc;
        desc.label = "RNSkia video export frame";
        auto memory = context.getWGPUDevice().ImportSharedTextureMemory(&desc);
        if (memory == nullptr) {
          throw RNSkVideoExportError(
              "unsupported",
              "exportVideo: the GPU cannot draw into the encoder's buffers.");
        }
        found = _memories.emplace(surfaceID, std::move(memory)).first;
      }
      wgpu::TextureDescriptor textureDesc;
      textureDesc.label = "RNSkia video export frame";
      textureDesc.size = {static_cast<uint32_t>(_options.width),
                          static_cast<uint32_t>(_options.height), 1};
      textureDesc.format = wgpu::TextureFormat::BGRA8Unorm;
      textureDesc.usage = DawnUtils::DefaultTargetUsage;
      _texture = found->second.CreateTexture(&textureDesc);
      wgpu::SharedTextureMemoryBeginAccessDescriptor access;
      // The frame is drawn whole: what the buffer held before is not read.
      access.initialized = false;
      if (_texture == nullptr || found->second.BeginAccess(_texture, &access) !=
                                     wgpu::Status::Success) {
        throw RNSkVideoExportError(
            "encoder-failed",
            "exportVideo: cannot draw into the encoder's pixel buffer.");
      }
      _memory = found->second;
      return context.MakeSurfaceFromTexture(_texture);
    }
  }

  void endFrame(int64_t index) override {
    @autoreleasepool {
      auto &context = DawnContext::getInstance();
      wgpu::SharedTextureMemoryEndAccessState state;
      _memory.EndAccess(_texture, &state);
      // The encoder reads the buffer as soon as it has it: the GPU must be
      // done drawing into it first. The queue is asked, not waited on, so
      // that no submit of another thread waits behind this one.
      uint64_t generation = 0;
      auto work = context.onSubmittedWorkDone(&generation);
      waitUntil(
          [&]() {
            if (!DawnContext::isCurrent(generation)) {
              throw RNSkVideoExportError(
                  "gpu-lost", "The GPU device was lost during the export.");
            }
            return context.isDone(work, generation);
          },
          [index]() {
            return "the GPU to draw frame " + std::to_string(index);
          },
          std::chrono::microseconds(250));
      // Appending while the input is not ready, or once the writer stopped
      // (the app went to the background), raises: checked right before.
      waitUntil([this]() { return _videoInput.readyForMoreMediaData; },
                [index]() {
                  return "the encoder to take frame " + std::to_string(index);
                });
      if (![_adaptor appendPixelBuffer:_pixelBuffer
                  withPresentationTime:frameTime(index)]) {
        throw RNSkVideoExportError("write-failed",
                                   "exportVideo: writing frame " +
                                       std::to_string(index) +
                                       " failed: " + describe(_writer.error));
      }
      releaseFrame();
    }
  }

  void finish() override {
    @autoreleasepool {
      checkWriting();
      [_videoInput markAsFinished];
      if (_audioInput != nil) {
        waitUntil([this]() { return _audioFinished->load(); },
                  []() { return std::string("the sound to be written"); });
        if (_audioError->load()) {
          throw RNSkVideoExportError("audio-failed",
                                     "exportVideo: reading the sound failed: " +
                                         describe(_audioReader.error));
        }
      }
      // The sound is cut where the video ends.
      checkWriting();
      [_writer endSessionAtSourceTime:frameTime(_options.frameCount)];
      dispatch_semaphore_t done = dispatch_semaphore_create(0);
      [_writer finishWritingWithCompletionHandler:^{
        dispatch_semaphore_signal(done);
      }];
      dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
      if (_writer.status != AVAssetWriterStatusCompleted) {
        throw RNSkVideoExportError("write-failed",
                                   "exportVideo: finishing " + _options.path +
                                       " failed: " + describe(_writer.error));
      }
      _memories.clear();
    }
  }

  void abort() noexcept override {
    @autoreleasepool {
      releaseFrame();
      _memories.clear();
      // The sound's queue may be appending: the writer cannot be cancelled
      // while it does. Stopped, and its current run waited out.
      _audioFinished->store(true);
      if (_audioQueue != nil) {
        dispatch_sync(_audioQueue, ^{
                      });
      }
      if (_audioReader != nil &&
          _audioReader.status == AVAssetReaderStatusReading) {
        [_audioReader cancelReading];
      }
      if (_writer != nil && _writer.status == AVAssetWriterStatusWriting) {
        [_writer cancelWriting];
      }
      // Only what this export wrote: a file it never got to replace (the
      // sound or the settings failed first) is left as it was.
      if (_startedWriting) {
        [[NSFileManager defaultManager]
            removeItemAtPath:[NSString
                                 stringWithUTF8String:_options.path.c_str()]
                       error:nil];
      }
    }
  }

private:
  CMTime frameTime(int64_t index) const {
    // Exact for a whole frame rate; a fractional one (29.97) is rounded to
    // the 90 kHz clock of MPEG.
    if (_options.fps == std::floor(_options.fps)) {
      return CMTimeMake(index, static_cast<int32_t>(_options.fps));
    }
    return CMTimeMake(std::llround(index * 90000.0 / _options.fps), 90000);
  }

  /** AVAssetWriter raises when told to finish once it stopped writing. */
  void checkWriting() {
    if (_writer.status != AVAssetWriterStatusWriting) {
      throw RNSkVideoExportError("write-failed",
                                 "exportVideo: writing " + _options.path +
                                     " stopped: " + describe(_writer.error));
    }
  }

  void releaseFrame() {
    _texture = nullptr;
    _memory = nullptr;
    if (_pixelBuffer != nullptr) {
      CVPixelBufferRelease(_pixelBuffer);
      _pixelBuffer = nullptr;
    }
  }

  /**
   Waits until `ready` holds, polling: AVAssetWriter, without real-time
   input, makes the caller wait for the encoder this way. `what` says what
   was waited for, and is only called on a time-out.
   */
  template <typename Ready, typename What>
  void
  waitUntil(Ready ready, What what,
            std::chrono::microseconds interval = std::chrono::milliseconds(1)) {
    auto deadline = std::chrono::steady_clock::now() + kTimeout;
    while (!ready()) {
      if (_writer.status != AVAssetWriterStatusWriting) {
        throw RNSkVideoExportError("encoder-failed",
                                   "exportVideo: the encoder stopped: " +
                                       describe(_writer.error));
      }
      if (std::chrono::steady_clock::now() > deadline) {
        throw RNSkVideoExportError("encoder-failed",
                                   "exportVideo: timed out waiting for " +
                                       what() + ".");
      }
      std::this_thread::sleep_for(interval);
    }
  }

  void prepareAudio() {
    NSURL *url = [NSURL
        fileURLWithPath:[NSString
                            stringWithUTF8String:_options.audioPath->c_str()]];
    if (![[NSFileManager defaultManager] fileExistsAtPath:url.path]) {
      throw RNSkVideoExportError("audio-failed",
                                 "exportVideo: no sound file at " +
                                     *_options.audioPath + ".");
    }
    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:url options:nil];
    __block NSArray<AVAssetTrack *> *tracks = nil;
    __block NSError *loadError = nil;
    dispatch_semaphore_t loaded = dispatch_semaphore_create(0);
    [asset loadTracksWithMediaType:AVMediaTypeAudio
                 completionHandler:^(NSArray<AVAssetTrack *> *result,
                                     NSError *error) {
                   tracks = result;
                   loadError = error;
                   dispatch_semaphore_signal(loaded);
                 }];
    dispatch_semaphore_wait(loaded, DISPATCH_TIME_FOREVER);
    if (tracks.count == 0) {
      throw RNSkVideoExportError(
          "audio-failed", "exportVideo: " + *_options.audioPath +
                              " has no sound track: " + describe(loadError));
    }
    AVAssetTrack *track = tracks.firstObject;
    NSError *error = nil;
    _audioReader = [AVAssetReader assetReaderWithAsset:asset error:&error];
    if (_audioReader == nil) {
      throw RNSkVideoExportError("audio-failed", "exportVideo: cannot read " +
                                                     *_options.audioPath +
                                                     ": " + describe(error));
    }
    _audioReader.timeRange =
        CMTimeRangeMake(kCMTimeZero, frameTime(_options.frameCount));

    CMFormatDescriptionRef format = nullptr;
    NSArray *formats = track.formatDescriptions;
    if (formats.count > 0) {
      format = (__bridge CMFormatDescriptionRef)formats.firstObject;
    }
    const AudioStreamBasicDescription *asbd =
        format != nullptr
            ? CMAudioFormatDescriptionGetStreamBasicDescription(format)
            : nullptr;
    const bool isAAC = format != nullptr && CMFormatDescriptionGetMediaSubType(
                                                format) == kAudioFormatMPEG4AAC;
    AVAssetReaderTrackOutput *output = nil;
    if (isAAC) {
      // AAC already: the packets are copied as they are.
      output = [AVAssetReaderTrackOutput assetReaderTrackOutputWithTrack:track
                                                          outputSettings:nil];
      _audioInput =
          [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeAudio
                                             outputSettings:nil
                                           sourceFormatHint:format];
    } else {
      // MP3 or anything else AVFoundation reads: decoded, encoded to AAC.
      output = [AVAssetReaderTrackOutput
          assetReaderTrackOutputWithTrack:track
                           outputSettings:@{
                             AVFormatIDKey : @(kAudioFormatLinearPCM)
                           }];
      double sampleRate =
          asbd != nullptr && asbd->mSampleRate > 0 ? asbd->mSampleRate : 44100;
      int channels = asbd != nullptr && asbd->mChannelsPerFrame > 0
                         ? std::min<int>(asbd->mChannelsPerFrame, 2)
                         : 2;
      _audioInput = [AVAssetWriterInput
          assetWriterInputWithMediaType:AVMediaTypeAudio
                         outputSettings:@{
                           AVFormatIDKey : @(kAudioFormatMPEG4AAC),
                           AVSampleRateKey : @(sampleRate),
                           AVNumberOfChannelsKey : @(channels),
                           AVEncoderBitRateKey : @(128000 * channels / 2),
                         }];
    }
    output.alwaysCopiesSampleData = NO;
    if (![_audioReader canAddOutput:output] ||
        ![_writer canAddInput:_audioInput]) {
      throw RNSkVideoExportError(
          "audio-failed", "exportVideo: the sound of " + *_options.audioPath +
                              " cannot be written to an .mp4 file.");
    }
    [_audioReader addOutput:output];
    _audioInput.expectsMediaDataInRealTime = NO;
    [_writer addInput:_audioInput];
    _audioOutput = output;
  }

  /**
   Writes the sound on a queue of its own as the writer asks for it: the
   writer interleaves the two tracks, and holds the video back while the
   sound is behind.
   */
  void startAudio() {
    if (![_audioReader startReading]) {
      throw RNSkVideoExportError(
          "audio-failed", "exportVideo: cannot read " + *_options.audioPath +
                              ": " + describe(_audioReader.error));
    }
    _audioQueue = dispatch_queue_create("RNSkia video export sound",
                                        DISPATCH_QUEUE_SERIAL);
    AVAssetWriterInput *input = _audioInput;
    AVAssetReaderTrackOutput *output = _audioOutput;
    AVAssetReader *reader = _audioReader;
    auto finished = _audioFinished;
    auto failed = _audioError;
    [input requestMediaDataWhenReadyOnQueue:_audioQueue
                                 usingBlock:^{
                                   while (input.readyForMoreMediaData) {
                                     if (finished->load()) {
                                       return;
                                     }
                                     CMSampleBufferRef sample =
                                         [output copyNextSampleBuffer];
                                     if (sample == nullptr) {
                                       if (reader.status ==
                                           AVAssetReaderStatusFailed) {
                                         failed->store(true);
                                       }
                                       [input markAsFinished];
                                       finished->store(true);
                                       return;
                                     }
                                     BOOL appended =
                                         [input appendSampleBuffer:sample];
                                     CFRelease(sample);
                                     if (!appended) {
                                       [input markAsFinished];
                                       finished->store(true);
                                       return;
                                     }
                                   }
                                 }];
  }

  const RNSkVideoEncoderOptions _options;
  AVAssetWriter *_writer = nil;
  AVAssetWriterInput *_videoInput = nil;
  AVAssetWriterInputPixelBufferAdaptor *_adaptor = nil;
  AVAssetReader *_audioReader = nil;
  AVAssetReaderTrackOutput *_audioOutput = nil;
  AVAssetWriterInput *_audioInput = nil;
  dispatch_queue_t _audioQueue = nil;
  bool _startedWriting = false;
  // Shared with the sound's queue, which may outlive the encoder on abort.
  std::shared_ptr<std::atomic<bool>> _audioFinished =
      std::make_shared<std::atomic<bool>>(false);
  std::shared_ptr<std::atomic<bool>> _audioError =
      std::make_shared<std::atomic<bool>>(false);

  std::unordered_map<IOSurfaceID, wgpu::SharedTextureMemory> _memories;
  CVPixelBufferRef _pixelBuffer = nullptr;
  wgpu::SharedTextureMemory _memory;
  wgpu::Texture _texture;
};

} // namespace

std::unique_ptr<RNSkVideoEncoder>
MakeAppleVideoEncoder(const RNSkVideoEncoderOptions &options) {
  return std::make_unique<AppleVideoEncoder>(options);
}

} // namespace RNSkia
