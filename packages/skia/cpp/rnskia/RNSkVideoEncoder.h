#pragma once

#include <cstdint>
#include <mutex>
#include <optional>
#include <stdexcept>
#include <string>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkRefCnt.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 Why an export failed, as the `code` of the error its promise rejects with:

 - `unsupported`: the platform cannot encode these options (a size or frame
   rate out of range, no H.264 encoder, no GPU, a platform without an
   encoder).
 - `invalid-argument`: an option is missing or of the wrong type.
 - `write-failed`: the file could not be written (a bad path, a full disk,
   the writer failed).
 - `audio-failed`: the sound file could not be read or muxed.
 - `encoder-failed`: the encoder failed while encoding.
 - `gpu-lost`: the GPU device was lost during the export.
 - `cancelled`: the export was cancelled (its signal aborted).
 */
class RNSkVideoExportError : public std::runtime_error {
public:
  RNSkVideoExportError(std::string code, const std::string &message)
      : std::runtime_error(message), _code(std::move(code)) {}

  const std::string &code() const { return _code; }

private:
  std::string _code;
};

/**
 The app's cache directory, set by the platform at startup (see
 RNSkiaModule, JniPlatformContext): a relative export path is resolved in
 it, so that an app without a file system module has somewhere to write.
 */
class RNSkVideoExportDirectory {
public:
  static void set(const std::string &directory) {
    std::lock_guard<std::mutex> lock(_mutex);
    _value = directory;
  }

  static std::string get() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _value;
  }

private:
  inline static std::mutex _mutex;
  inline static std::string _value;
};

/** What a video export writes. */
struct RNSkVideoEncoderOptions {
  /**
   The output .mp4, an absolute file path (resolved from a relative one or
   a file:// URL, see JsiSkottieExport).
   */
  std::string path;
  int width = 0;
  int height = 0;
  double fps = 30;
  int64_t bitrate = 12'000'000;
  /** The number of frames the export will write. */
  int64_t frameCount = 0;
  /** A sound file muxed from t = 0, cut to the video's length. */
  std::optional<std::string> audioPath;

  /** The video's length in seconds. */
  double duration() const { return static_cast<double>(frameCount) / fps; }
};

/**
 Encodes frames drawn by Skia into an H.264 .mp4 file, with the platform's
 hardware encoder, the frames staying on the GPU: each frame is drawn into
 a surface over the encoder's own input buffer (an IOSurface-backed
 CVPixelBuffer on Apple platforms, the encoder's input window on Android).

 Every method is called on one thread, the export's, in this order: start,
 then beginFrame and endFrame once per frame, then finish; abort instead of
 any of them after a failure or a cancel. They throw RNSkVideoExportError.
 */
class RNSkVideoEncoder {
public:
  virtual ~RNSkVideoEncoder() = default;

  /** Opens the file and the encoder. */
  virtual void start() = 0;

  /**
   The surface frame `index` is drawn into, made on the calling thread's
   recorder. The caller draws the whole frame, then submits the recording.
   */
  virtual sk_sp<SkSurface> beginFrame(int64_t index) = 0;

  /**
   Hands frame `index` to the encoder, once the drawing into the surface
   beginFrame returned has been submitted. It shows at index / fps.
   */
  virtual void endFrame(int64_t index) = 0;

  /** Writes what is left, the sound included, and closes the file. */
  virtual void finish() = 0;

  /**
   Stops the encoder and deletes the partial file. Called after any failure
   or cancel, whatever the state; never throws.
   */
  virtual void abort() noexcept = 0;
};

} // namespace RNSkia
