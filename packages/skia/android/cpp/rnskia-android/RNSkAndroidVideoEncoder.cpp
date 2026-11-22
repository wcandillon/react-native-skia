#include "RNSkAndroidVideoEncoder.h"

#include <android/native_window.h>
#include <fcntl.h>
#include <media/NdkMediaCodec.h>
#include <media/NdkMediaExtractor.h>
#include <media/NdkMediaFormat.h>
#include <media/NdkMediaMuxer.h>
#include <sys/stat.h>
#include <unistd.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstring>
#include <deque>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include "RNDawnContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace {

constexpr const char *kVideoMime = "video/avc";
constexpr const char *kAacMime = "audio/mp4a-latm";
// MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface
constexpr int32_t kColorFormatSurface = 0x7F000789;
// MediaCodec.BUFFER_FLAG_KEY_FRAME (AMEDIACODEC_BUFFER_FLAG_KEY_FRAME is
// only declared from API level 34).
constexpr uint32_t kKeyFrameFlag = 1;
constexpr int64_t kDequeueTimeoutUs = 10'000;
/** How long the encoder may go without output before the export gives up. */
constexpr auto kTimeout = std::chrono::seconds(20);

/** An encoded sample of the sound, muxed alongside the video. */
struct AudioSample {
  std::vector<uint8_t> data;
  int64_t timeUs = 0;
  uint32_t flags = 0;
};

struct MediaFormatDeleter {
  void operator()(AMediaFormat *format) const { AMediaFormat_delete(format); }
};
using MediaFormat = std::unique_ptr<AMediaFormat, MediaFormatDeleter>;

struct MediaCodecDeleter {
  void operator()(AMediaCodec *codec) const {
    AMediaCodec_stop(codec);
    AMediaCodec_delete(codec);
  }
};
using MediaCodec = std::unique_ptr<AMediaCodec, MediaCodecDeleter>;

struct MediaExtractorDeleter {
  void operator()(AMediaExtractor *extractor) const {
    AMediaExtractor_delete(extractor);
  }
};
using MediaExtractor = std::unique_ptr<AMediaExtractor, MediaExtractorDeleter>;

std::string mimeOf(AMediaFormat *format) {
  const char *mime = nullptr;
  AMediaFormat_getString(format, AMEDIAFORMAT_KEY_MIME, &mime);
  return mime != nullptr ? mime : "";
}

/**
 Reads the sound of `path`, up to `durationUs`, as AAC samples: copied when
 the file holds AAC already, decoded and encoded otherwise (MP3, say).
 Returns the format of the track to mux them as. Throws
 RNSkVideoExportError("audio-failed").
 */
class AudioReader {
public:
  AudioReader(const std::string &path, int64_t durationUs)
      : _path(path), _durationUs(durationUs) {}

  MediaFormat read(std::vector<AudioSample> &samples) {
    int fd = open(_path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) {
      fail("cannot open " + _path + ": " + std::strerror(errno));
    }
    struct stat info;
    fstat(fd, &info);
    MediaExtractor extractor(AMediaExtractor_new());
    auto status =
        AMediaExtractor_setDataSourceFd(extractor.get(), fd, 0, info.st_size);
    close(fd);
    if (status != AMEDIA_OK) {
      fail(_path + " is not a sound file Android reads (" +
           std::to_string(status) + ").");
    }
    MediaFormat trackFormat;
    for (size_t i = 0; i < AMediaExtractor_getTrackCount(extractor.get());
         i++) {
      MediaFormat format(AMediaExtractor_getTrackFormat(extractor.get(), i));
      if (mimeOf(format.get()).rfind("audio/", 0) == 0) {
        AMediaExtractor_selectTrack(extractor.get(), i);
        trackFormat = std::move(format);
        break;
      }
    }
    if (trackFormat == nullptr) {
      fail(_path + " has no sound track.");
    }
    if (mimeOf(trackFormat.get()) == kAacMime) {
      copy(extractor.get(), samples);
      return trackFormat;
    }
    return transcode(extractor.get(), trackFormat.get(), samples);
  }

private:
  [[noreturn]] void fail(const std::string &message) {
    throw RNSkVideoExportError("audio-failed", "exportVideo: " + message);
  }

  void copy(AMediaExtractor *extractor, std::vector<AudioSample> &samples) {
    std::vector<uint8_t> buffer(1 << 20);
    for (;;) {
      auto size = AMediaExtractor_readSampleData(extractor, buffer.data(),
                                                 buffer.size());
      if (size < 0) {
        break;
      }
      auto timeUs = AMediaExtractor_getSampleTime(extractor);
      if (timeUs >= _durationUs) {
        break;
      }
      AudioSample sample;
      sample.data.assign(buffer.begin(), buffer.begin() + size);
      sample.timeUs = timeUs;
      samples.push_back(std::move(sample));
      AMediaExtractor_advance(extractor);
    }
  }

  MediaFormat transcode(AMediaExtractor *extractor, AMediaFormat *inputFormat,
                        std::vector<AudioSample> &samples) {
    auto mime = mimeOf(inputFormat);
    MediaCodec decoder(AMediaCodec_createDecoderByType(mime.c_str()));
    if (decoder == nullptr) {
      fail("no decoder for " + mime + ".");
    }
    if (AMediaCodec_configure(decoder.get(), inputFormat, nullptr, nullptr,
                              0) != AMEDIA_OK ||
        AMediaCodec_start(decoder.get()) != AMEDIA_OK) {
      fail("cannot decode " + mime + ".");
    }
    int32_t sampleRate = 44100;
    int32_t channels = 2;
    AMediaFormat_getInt32(inputFormat, AMEDIAFORMAT_KEY_SAMPLE_RATE,
                          &sampleRate);
    AMediaFormat_getInt32(inputFormat, AMEDIAFORMAT_KEY_CHANNEL_COUNT,
                          &channels);
    // The sound would start late by the samples the codecs add ahead of it,
    // which a player is only told to skip through an edit list MediaMuxer
    // does not write: the source's encoder delay (an MP3's LAME header,
    // which MediaExtractor reports) and the AAC encoder's priming frame.
    // That much decoded sound is dropped, and the AAC is muxed from t = 0.
    constexpr int32_t kAacPrimingSamples = 1024;
    int32_t encoderDelay = 0;
    AMediaFormat_getInt32(inputFormat, "encoder-delay", &encoderDelay);
    // An MP3 decoder adds 529 samples of its own (the MDCT and the
    // polyphase filterbank), which the encoder delay does not count.
    constexpr int32_t kMp3DecoderDelaySamples = 529;
    int64_t skipSamples = encoderDelay + kAacPrimingSamples +
                          (mime == "audio/mpeg" ? kMp3DecoderDelaySamples : 0);
    // The sound is read that much past the video's end, so that it still
    // lasts as long as the video once that much is dropped.
    const int64_t readUntilUs =
        _durationUs + skipSamples * 1'000'000 / std::max(sampleRate, 1);
    int64_t firstOutputTimeUs = -1;
    MediaCodec encoder;
    MediaFormat outputFormat;
    bool inputDone = false;
    bool decoderDone = false;
    bool encoderDone = false;
    // Decoded PCM waiting for the encoder, with its time.
    std::deque<uint8_t> pcm;
    int64_t pcmTimeUs = 0;
    bool pcmEnded = false;
    auto deadline = std::chrono::steady_clock::now() + kTimeout;
    while (!encoderDone) {
      if (std::chrono::steady_clock::now() > deadline) {
        fail("timed out encoding the sound.");
      }
      if (!inputDone) {
        auto index = AMediaCodec_dequeueInputBuffer(decoder.get(), 0);
        if (index >= 0) {
          size_t capacity = 0;
          auto *buffer =
              AMediaCodec_getInputBuffer(decoder.get(), index, &capacity);
          auto size =
              AMediaExtractor_readSampleData(extractor, buffer, capacity);
          auto timeUs = AMediaExtractor_getSampleTime(extractor);
          if (size < 0 || timeUs >= readUntilUs) {
            AMediaCodec_queueInputBuffer(decoder.get(), index, 0, 0, 0,
                                         AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM);
            inputDone = true;
          } else {
            AMediaCodec_queueInputBuffer(decoder.get(), index, 0, size, timeUs,
                                         0);
            AMediaExtractor_advance(extractor);
          }
        }
      }
      if (!decoderDone) {
        AMediaCodecBufferInfo info;
        auto index =
            AMediaCodec_dequeueOutputBuffer(decoder.get(), &info, 1000);
        if (index == AMEDIACODEC_INFO_OUTPUT_FORMAT_CHANGED) {
          MediaFormat format(AMediaCodec_getOutputFormat(decoder.get()));
          AMediaFormat_getInt32(format.get(), AMEDIAFORMAT_KEY_SAMPLE_RATE,
                                &sampleRate);
          AMediaFormat_getInt32(format.get(), AMEDIAFORMAT_KEY_CHANNEL_COUNT,
                                &channels);
        } else if (index >= 0) {
          size_t capacity = 0;
          auto *buffer =
              AMediaCodec_getOutputBuffer(decoder.get(), index, &capacity);
          const int64_t frameBytes = 2 * channels;
          const int64_t skipBytes =
              std::min<int64_t>(skipSamples * frameBytes, info.size);
          skipSamples -= skipBytes / frameBytes;
          if (pcm.empty()) {
            pcmTimeUs = info.presentationTimeUs +
                        skipBytes / frameBytes * 1'000'000 / sampleRate;
          }
          pcm.insert(pcm.end(), buffer + info.offset + skipBytes,
                     buffer + info.offset + info.size);
          AMediaCodec_releaseOutputBuffer(decoder.get(), index, false);
          if (info.flags & AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM) {
            decoderDone = true;
            pcmEnded = true;
          }
          deadline = std::chrono::steady_clock::now() + kTimeout;
        }
      }
      // The encoder is made once the decoder told the PCM's format, which
      // the first output buffer comes after.
      if (encoder == nullptr && (!pcm.empty() || pcmEnded)) {
        encoder.reset(AMediaCodec_createEncoderByType(kAacMime));
        MediaFormat format(AMediaFormat_new());
        AMediaFormat_setString(format.get(), AMEDIAFORMAT_KEY_MIME, kAacMime);
        AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_SAMPLE_RATE,
                              sampleRate);
        AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_CHANNEL_COUNT,
                              channels);
        AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_BIT_RATE,
                              64000 * channels);
        // AACObjectLC
        AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_AAC_PROFILE, 2);
        AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_MAX_INPUT_SIZE,
                              1 << 16);
        if (encoder == nullptr ||
            AMediaCodec_configure(encoder.get(), format.get(), nullptr, nullptr,
                                  AMEDIACODEC_CONFIGURE_FLAG_ENCODE) !=
                AMEDIA_OK ||
            AMediaCodec_start(encoder.get()) != AMEDIA_OK) {
          fail("cannot encode the sound to AAC.");
        }
      }
      if (encoder == nullptr) {
        continue;
      }
      // PCM into the encoder, as much as its buffers take.
      while (!pcm.empty() || pcmEnded) {
        auto index = AMediaCodec_dequeueInputBuffer(encoder.get(), 0);
        if (index < 0) {
          break;
        }
        size_t capacity = 0;
        auto *buffer =
            AMediaCodec_getInputBuffer(encoder.get(), index, &capacity);
        auto size = std::min(capacity, pcm.size());
        std::copy(pcm.begin(), pcm.begin() + size, buffer);
        pcm.erase(pcm.begin(), pcm.begin() + size);
        bool last = pcmEnded && pcm.empty();
        AMediaCodec_queueInputBuffer(
            encoder.get(), index, 0, size, pcmTimeUs,
            last ? AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM : 0);
        pcmTimeUs += static_cast<int64_t>(size) * 1'000'000 /
                     (2 * channels * sampleRate);
        if (last) {
          pcmEnded = false;
          break;
        }
      }
      AMediaCodecBufferInfo info;
      // Once the decoder is done, only the encoder has work left: wait for
      // it rather than spin.
      auto index = AMediaCodec_dequeueOutputBuffer(encoder.get(), &info,
                                                   decoderDone ? 5000 : 0);
      if (index == AMEDIACODEC_INFO_OUTPUT_FORMAT_CHANGED) {
        outputFormat.reset(AMediaCodec_getOutputFormat(encoder.get()));
      } else if (index >= 0) {
        size_t capacity = 0;
        auto *buffer =
            AMediaCodec_getOutputBuffer(encoder.get(), index, &capacity);
        if (info.size > 0 &&
            !(info.flags & AMEDIACODEC_BUFFER_FLAG_CODEC_CONFIG) &&
            (firstOutputTimeUs < 0 ||
             info.presentationTimeUs - firstOutputTimeUs < _durationUs)) {
          if (firstOutputTimeUs < 0) {
            firstOutputTimeUs = info.presentationTimeUs;
          }
          AudioSample sample;
          sample.data.assign(buffer + info.offset,
                             buffer + info.offset + info.size);
          sample.timeUs = info.presentationTimeUs - firstOutputTimeUs;
          samples.push_back(std::move(sample));
        }
        AMediaCodec_releaseOutputBuffer(encoder.get(), index, false);
        if (info.flags & AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM) {
          encoderDone = true;
        }
      }
    }
    if (outputFormat == nullptr) {
      fail("the AAC encoder gave no format.");
    }
    return outputFormat;
  }

  std::string _path;
  int64_t _durationUs;
};

class AndroidVideoEncoder : public RNSkVideoEncoder {
public:
  explicit AndroidVideoEncoder(RNSkVideoEncoderOptions options)
      : _options(std::move(options)) {}

  ~AndroidVideoEncoder() override { release(); }

  void start() override {
    const int64_t durationUs = std::llround(_options.duration() * 1'000'000.0);
    if (_options.audioPath.has_value()) {
      // Read first, whole (it is cut to the video's length): its format must
      // be known before the muxer starts, as soon as the video's is.
      _audioFormat =
          AudioReader(*_options.audioPath, durationUs).read(_audioSamples);
    }

    _codec.reset(AMediaCodec_createEncoderByType(kVideoMime));
    if (_codec == nullptr) {
      throw RNSkVideoExportError("unsupported",
                                 "exportVideo: this device has no H.264 "
                                 "encoder.");
    }
    MediaFormat format(AMediaFormat_new());
    AMediaFormat_setString(format.get(), AMEDIAFORMAT_KEY_MIME, kVideoMime);
    AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_WIDTH, _options.width);
    AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_HEIGHT,
                          _options.height);
    AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_COLOR_FORMAT,
                          kColorFormatSurface);
    AMediaFormat_setInt32(
        format.get(), AMEDIAFORMAT_KEY_BIT_RATE,
        static_cast<int32_t>(std::min<int64_t>(_options.bitrate, INT32_MAX)));
    if (_options.fps == std::floor(_options.fps)) {
      AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_FRAME_RATE,
                            static_cast<int32_t>(_options.fps));
    } else {
      AMediaFormat_setFloat(format.get(), AMEDIAFORMAT_KEY_FRAME_RATE,
                            static_cast<float>(_options.fps));
    }
    AMediaFormat_setInt32(format.get(), AMEDIAFORMAT_KEY_I_FRAME_INTERVAL, 2);
    // The frames reach the encoder as fast as they are drawn, and the
    // window stamps each with the time it was queued: no frame rate the
    // encoder could budget its bitrate with. A negative gap makes it
    // stamp the frames 1 / fps apart instead (MediaFormat
    // KEY_MAX_PTS_GAP_TO_ENCODER, API level 29); the muxer then writes
    // them at index / fps (see drain).
    AMediaFormat_setInt64(format.get(), "max-pts-gap-to-encoder",
                          -std::llround(1'000'000.0 / _options.fps));
    // No B-frames (KEY_MAX_B_FRAMES): the frames come out in the order they
    // went in, which drain relies on to time them.
    AMediaFormat_setInt32(format.get(), "max-bframes", 0);
    // Not real time (KEY_PRIORITY): as fast as the encoder goes.
    AMediaFormat_setInt32(format.get(), "priority", 1);
    // What Skia draws is sRGB: BT.709, limited range (KEY_COLOR_STANDARD,
    // KEY_COLOR_TRANSFER, KEY_COLOR_RANGE).
    AMediaFormat_setInt32(format.get(), "color-standard", 1);
    AMediaFormat_setInt32(format.get(), "color-transfer", 3);
    AMediaFormat_setInt32(format.get(), "color-range", 2);
    auto status =
        AMediaCodec_configure(_codec.get(), format.get(), nullptr, nullptr,
                              AMEDIACODEC_CONFIGURE_FLAG_ENCODE);
    if (status != AMEDIA_OK) {
      throw RNSkVideoExportError(
          "unsupported", "exportVideo: the H.264 encoder does not take " +
                             std::to_string(_options.width) + "x" +
                             std::to_string(_options.height) + " at " +
                             std::to_string(_options.bitrate) + " bps (" +
                             std::to_string(status) + ").");
    }
    if (AMediaCodec_createInputSurface(_codec.get(), &_window) != AMEDIA_OK ||
        _window == nullptr) {
      throw RNSkVideoExportError(
          "unsupported", "exportVideo: the encoder has no input surface.");
    }
    if (AMediaCodec_start(_codec.get()) != AMEDIA_OK) {
      throw RNSkVideoExportError("encoder-failed",
                                 "exportVideo: the encoder did not start.");
    }

    auto &context = DawnContext::getInstance();
    auto device = context.getWGPUDevice();
    _surface = context.MakeWGPUSurface(_window);
    wgpu::SurfaceCapabilities capabilities;
    if (_surface == nullptr ||
        _surface.GetCapabilities(device.GetAdapter(), &capabilities) !=
            wgpu::Status::Success ||
        capabilities.formatCount == 0) {
      throw RNSkVideoExportError("unsupported",
                                 "exportVideo: the GPU cannot draw into the "
                                 "encoder's input surface.");
    }
    auto textureFormat = capabilities.formats[0];
    for (size_t i = 0; i < capabilities.formatCount; i++) {
      if (capabilities.formats[i] == DawnUtils::PreferredTextureFormat) {
        textureFormat = DawnUtils::PreferredTextureFormat;
      }
    }
    wgpu::SurfaceConfiguration config;
    config.device = device;
    config.format = textureFormat;
    config.width = _options.width;
    config.height = _options.height;
    // Every frame is kept: the encoder's queue holds the next one back
    // until it took the last.
    config.presentMode = wgpu::PresentMode::Fifo;
    config.usage = wgpu::TextureUsage::RenderAttachment;
    _surface.Configure(&config);
    _configured = true;

    _fd = open(_options.path.c_str(), O_CREAT | O_TRUNC | O_RDWR | O_CLOEXEC,
               0644);
    if (_fd < 0) {
      throw RNSkVideoExportError("write-failed", "exportVideo: cannot write " +
                                                     _options.path + ": " +
                                                     std::strerror(errno));
    }
    _wroteFile = true;
    _muxer = AMediaMuxer_new(_fd, AMEDIAMUXER_OUTPUT_FORMAT_MPEG_4);
    if (_muxer == nullptr) {
      throw RNSkVideoExportError("write-failed",
                                 "exportVideo: cannot write " + _options.path);
    }
    _drainer = std::thread([this]() { drain(); });
  }

  sk_sp<SkSurface> beginFrame(int64_t index) override {
    checkDrain();
    wgpu::SurfaceTexture surfaceTexture;
    _surface.GetCurrentTexture(&surfaceTexture);
    if (surfaceTexture.texture == nullptr ||
        (surfaceTexture.status !=
             wgpu::SurfaceGetCurrentTextureStatus::SuccessOptimal &&
         surfaceTexture.status !=
             wgpu::SurfaceGetCurrentTextureStatus::SuccessSuboptimal)) {
      throw RNSkVideoExportError(
          "encoder-failed",
          "exportVideo: no input buffer from the encoder "
          "for frame " +
              std::to_string(index) + " (status " +
              std::to_string(static_cast<int>(surfaceTexture.status)) + ").");
    }
    return DawnContext::getInstance().MakeSurfaceFromTexture(
        surfaceTexture.texture);
  }

  void endFrame(int64_t /* index */) override {
    // Queued with the fence of the drawing: the encoder waits for the GPU,
    // the export goes on to the next frame.
    _surface.Present();
  }

  void finish() override {
    checkDrain();
    unconfigure();
    AMediaCodec_signalEndOfInputStream(_codec.get());
    _drainer.join();
    checkDrain();
    if (!_muxerStarted) {
      throw RNSkVideoExportError("encoder-failed",
                                 "exportVideo: the encoder wrote nothing.");
    }
    // The sound left after the last video frame.
    writeAudio(INT64_MAX);
    auto status = AMediaMuxer_stop(_muxer);
    _muxerStarted = false;
    AMediaMuxer_delete(_muxer);
    _muxer = nullptr;
    const int closed = close(_fd);
    _fd = -1;
    if (closed != 0 || status != AMEDIA_OK) {
      throw RNSkVideoExportError(
          "write-failed", "exportVideo: finishing " + _options.path +
                              " failed (" + std::to_string(status) + ").");
    }
    if (_videoFrames != _options.frameCount) {
      throw RNSkVideoExportError(
          "encoder-failed", "exportVideo: the encoder wrote " +
                                std::to_string(_videoFrames) + " frames of " +
                                std::to_string(_options.frameCount) + ".");
    }
  }

  void abort() noexcept override {
    release();
    // Only what this export wrote: a file at the path it never got to open
    // (the sound or the encoder failed first) is left as it was.
    if (_wroteFile) {
      unlink(_options.path.c_str());
    }
  }

private:
  /**
   Takes the encoded frames out of the encoder and muxes them, on a thread
   of its own: the encoder stops taking frames while its output is full,
   so the export, waiting for an input buffer, could not drain it itself.
   */
  void drain() {
    pthread_setname_np(pthread_self(), "RNSkia Export Mux");
    auto lastOutput = std::chrono::steady_clock::now();
    int64_t lastInputTimeUs = INT64_MIN;
    for (;;) {
      if (_stop.load(std::memory_order_acquire)) {
        return;
      }
      AMediaCodecBufferInfo info{};
      auto index = AMediaCodec_dequeueOutputBuffer(_codec.get(), &info,
                                                   kDequeueTimeoutUs);
      if (index == AMEDIACODEC_INFO_TRY_AGAIN_LATER) {
        if (std::chrono::steady_clock::now() - lastOutput > kTimeout) {
          setDrainError("encoder-failed",
                        "exportVideo: timed out waiting for the encoder.");
          return;
        }
        continue;
      }
      if (index == AMEDIACODEC_INFO_OUTPUT_BUFFERS_CHANGED) {
        continue;
      }
      // Anything else that is not a buffer is the codec failing (it was
      // reclaimed, or the media server died): the export fails rather than
      // waits on it. The resource errors are positive.
      if ((index < 0 && index != AMEDIACODEC_INFO_OUTPUT_FORMAT_CHANGED) ||
          index == AMEDIACODEC_ERROR_INSUFFICIENT_RESOURCE ||
          index == AMEDIACODEC_ERROR_RECLAIMED) {
        setDrainError("encoder-failed", "exportVideo: the encoder failed (" +
                                            std::to_string(index) + ").");
        return;
      }
      lastOutput = std::chrono::steady_clock::now();
      if (index == AMEDIACODEC_INFO_OUTPUT_FORMAT_CHANGED) {
        MediaFormat format(AMediaCodec_getOutputFormat(_codec.get()));
        _videoTrack = AMediaMuxer_addTrack(_muxer, format.get());
        if (_audioFormat != nullptr) {
          _audioTrack = AMediaMuxer_addTrack(_muxer, _audioFormat.get());
        }
        if (_videoTrack < 0 || (_audioFormat != nullptr && _audioTrack < 0) ||
            AMediaMuxer_start(_muxer) != AMEDIA_OK) {
          setDrainError("write-failed", "exportVideo: cannot write the "
                                        "tracks of " +
                                            _options.path);
          return;
        }
        _muxerStarted = true;
        continue;
      }
      size_t capacity = 0;
      auto *buffer =
          AMediaCodec_getOutputBuffer(_codec.get(), index, &capacity);
      if (buffer == nullptr) {
        setDrainError("encoder-failed",
                      "exportVideo: no output buffer from the encoder.");
        return;
      }
      const bool end = info.flags & AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM;
      auto fail = [&](const char *code, const std::string &message) {
        AMediaCodec_releaseOutputBuffer(_codec.get(), index, false);
        setDrainError(code, message);
      };
      if (info.size > 0 &&
          !(info.flags & AMEDIACODEC_BUFFER_FLAG_CODEC_CONFIG)) {
        if (!_muxerStarted) {
          fail("encoder-failed",
               "exportVideo: the encoder wrote a frame before its format.");
          return;
        }
        // The frames come out in the order they went in (no B-frames), each
        // timed by the window; written at index / fps instead.
        if (info.presentationTimeUs < lastInputTimeUs) {
          fail("encoder-failed",
               "exportVideo: the encoder reordered the frames.");
          return;
        }
        lastInputTimeUs = info.presentationTimeUs;
        AMediaCodecBufferInfo sample = info;
        sample.presentationTimeUs = std::llround(
            static_cast<double>(_videoFrames) * 1'000'000.0 / _options.fps);
        sample.flags &= kKeyFrameFlag;
        if (AMediaMuxer_writeSampleData(_muxer, _videoTrack, buffer, &sample) !=
            AMEDIA_OK) {
          fail("write-failed",
               "exportVideo: writing " + _options.path + " failed.");
          return;
        }
        _videoFrames++;
        // The sound up to this frame, so that the file interleaves them.
        writeAudio(sample.presentationTimeUs);
      }
      AMediaCodec_releaseOutputBuffer(_codec.get(), index, false);
      if (end) {
        return;
      }
    }
  }

  void writeAudio(int64_t untilUs) {
    while (_audioTrack >= 0 && _nextAudioSample < _audioSamples.size() &&
           _audioSamples[_nextAudioSample].timeUs <= untilUs) {
      auto &sample = _audioSamples[_nextAudioSample++];
      AMediaCodecBufferInfo info;
      info.offset = 0;
      info.size = static_cast<int32_t>(sample.data.size());
      info.presentationTimeUs = sample.timeUs;
      info.flags = kKeyFrameFlag;
      AMediaMuxer_writeSampleData(_muxer, _audioTrack, sample.data.data(),
                                  &info);
      std::vector<uint8_t>().swap(sample.data);
    }
  }

  void setDrainError(const char *code, const std::string &message) {
    std::lock_guard<std::mutex> lock(_errorMutex);
    if (!_drainError.has_value()) {
      _drainError = RNSkVideoExportError(code, message);
    }
  }

  void checkDrain() {
    std::lock_guard<std::mutex> lock(_errorMutex);
    if (_drainError.has_value()) {
      throw *_drainError;
    }
  }

  /** Lets go of the encoder's window: Dawn's swapchain first. */
  void unconfigure() {
    if (_configured) {
      _surface.Unconfigure();
      _configured = false;
    }
    _surface = nullptr;
  }

  void release() noexcept {
    _stop.store(true, std::memory_order_release);
    unconfigure();
    if (_drainer.joinable()) {
      _drainer.join();
    }
    if (_muxer != nullptr) {
      if (_muxerStarted) {
        AMediaMuxer_stop(_muxer);
        _muxerStarted = false;
      }
      AMediaMuxer_delete(_muxer);
      _muxer = nullptr;
    }
    _codec = nullptr;
    if (_window != nullptr) {
      ANativeWindow_release(_window);
      _window = nullptr;
    }
    if (_fd >= 0) {
      close(_fd);
      _fd = -1;
    }
  }

  const RNSkVideoEncoderOptions _options;
  MediaCodec _codec;
  ANativeWindow *_window = nullptr;
  wgpu::Surface _surface;
  bool _configured = false;

  int _fd = -1;
  bool _wroteFile = false;
  AMediaMuxer *_muxer = nullptr;
  std::atomic<bool> _muxerStarted{false};
  ssize_t _videoTrack = -1;
  ssize_t _audioTrack = -1;
  int64_t _videoFrames = 0;

  MediaFormat _audioFormat;
  std::vector<AudioSample> _audioSamples;
  size_t _nextAudioSample = 0;

  std::thread _drainer;
  std::atomic<bool> _stop{false};
  std::mutex _errorMutex;
  std::optional<RNSkVideoExportError> _drainError;
};

} // namespace

std::unique_ptr<RNSkVideoEncoder>
MakeAndroidVideoEncoder(const RNSkVideoEncoderOptions &options) {
  return std::make_unique<AndroidVideoEncoder>(options);
}

} // namespace RNSkia
