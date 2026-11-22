#pragma once

#include <algorithm>
#include <atomic>
#include <cctype>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <string>
#include <string_view>
#include <thread>
#include <utility>

#if defined(__APPLE__) || defined(__ANDROID__)
#include <pthread.h>
#endif

#include <jsi/jsi.h>

#include "JsiSkData.h"
#include "JsiSkSkottie.h"
#include "RNDawnContext.h"
#include "RNSkAsync.h"
#include "RNSkPlatformContext.h"
#include "RNSkRuntimeScheduler.h"
#include "RNSkVideoEncoder.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 Skia.Skottie.exportVideo(animation, options): renders every frame of a
 Skottie animation offscreen, on the GPU, straight into the platform's
 hardware H.264 encoder (see RNSkVideoEncoder), and writes an .mp4 file.

 The export renders an instance of its own, made from the animation's JSON
 and assets with the changes made to it from JS (see
 ManagedAnimation::source), on a thread of its own: the instance on screen
 is never sought or drawn, and neither the JS thread nor the UI thread
 waits for the export. Frames are rendered as fast as the encoder takes
 them, without pacing.
 */
class JsiSkottieExport {
public:
  static jsi::Value exportVideo(jsi::Runtime &runtime,
                                std::shared_ptr<RNSkPlatformContext> context,
                                const jsi::Value *arguments, size_t count) {
    if (count < 2 || !arguments[1].isObject()) {
      throw jsi::JSError(runtime, "exportVideo(animation, options): expected "
                                  "an animation and an options object.");
    }
    auto animation = tryGetJsiObject<JsiSkSkottie>(runtime, arguments[0]);
    if (animation == nullptr) {
      throw jsi::JSError(runtime, "exportVideo: the first argument must be a "
                                  "SkSkottieAnimation.");
    }
    auto options = arguments[1].asObject(runtime);
    auto *managed = animation->getObject().get();

    auto job = std::make_shared<Job>();
    // Options are read and checked here, on the JS thread; a bad one rejects.
    try {
      job->options = readOptions(runtime, options, *managed, job->audioData);
    } catch (const RNSkVideoExportError &error) {
      return RNSkAsync::settled(runtime, reject(job, error));
    }
    job->source = managed->source();

    auto signal = options.getProperty(runtime, "signal");
    if (signal.isObject()) {
      auto signalObject = signal.asObject(runtime);
      auto aborted = signalObject.getProperty(runtime, "aborted");
      if (aborted.isBool() && aborted.getBool()) {
        return RNSkAsync::settled(
            runtime,
            reject(job, RNSkVideoExportError("cancelled",
                                             "The export was cancelled.")));
      } else {
        auto addEventListener =
            signalObject.getProperty(runtime, "addEventListener");
        if (addEventListener.isObject() &&
            addEventListener.asObject(runtime).isFunction(runtime)) {
          auto cancelled = job->cancelled;
          auto onAbort = jsi::Function::createFromHostFunction(
              runtime, jsi::PropNameID::forAscii(runtime, "onAbort"), 0,
              [cancelled](jsi::Runtime &, const jsi::Value &,
                          const jsi::Value *, size_t) {
                cancelled->store(true);
                return jsi::Value::undefined();
              });
          // Without options: AbortSignal implementations differ in what
          // they make of them. The listener holds only the flag.
          addEventListener.asObject(runtime).asFunction(runtime).callWithThis(
              runtime, signalObject,
              jsi::String::createFromAscii(runtime, "abort"), onAbort);
        }
      }
    }

    auto onProgress = options.getProperty(runtime, "onProgress");
    if (onProgress.isObject() &&
        onProgress.asObject(runtime).isFunction(runtime)) {
      job->onProgress = std::make_unique<jsi::Function>(
          onProgress.asObject(runtime).asFunction(runtime));
    }
    auto scheduler = RNSkRuntimeScheduler::get(runtime, context);

    return RNSkAsync::run(
        runtime, context,
        [job, context, scheduler](RNSkAsync::Complete complete) {
          std::thread([job, context, scheduler,
                       complete = std::move(complete)]() {
#if defined(__APPLE__)
            pthread_setname_np("RNSkia Video Export");
#elif defined(__ANDROID__)
            pthread_setname_np(pthread_self(), "RNSkia Export");
#endif
            complete(run(job, context, scheduler));
          }).detach();
        });
  }

private:
  struct Job {
    ManagedAnimation::Source source;
    RNSkVideoEncoderOptions options;
    /** The sound as bytes (audio: { data }), written to a file to be read. */
    sk_sp<SkData> audioData;
    /** Shared with the signal's listener, which needs nothing else. */
    std::shared_ptr<std::atomic<bool>> cancelled =
        std::make_shared<std::atomic<bool>>(false);
    /**
     Belongs to the JS runtime: called there, and let go of there when the
     promise settles (see reject/resolve), never on the export's thread.
     */
    std::unique_ptr<jsi::Function> onProgress;
    /** The frames encoded so far, as the next progress event reports. */
    std::atomic<int64_t> framesDone{0};
    /** Whether a progress event is posted and has not run yet. */
    std::atomic<bool> progressPending{false};

    ~Job() {
      // Not let go of on the JS thread: the promise never settled (the
      // runtime went away first). Leaked, rather than freed on another
      // thread or after its runtime.
      (void)onProgress.release();
    }
  };

  /**
   A file:// URL as a path (its host dropped, its escapes decoded, as file
   pickers return them: file:///…/My%20Song.mp3); anything else as it is.
   */
  static std::string stripFileScheme(std::string path) {
    constexpr std::string_view kFileScheme = "file://";
    if (path.rfind(kFileScheme, 0) != 0) {
      return path;
    }
    path.erase(0, kFileScheme.size());
    // file://localhost/…
    path.erase(0, std::min(path.find('/'), path.size()));
    std::string decoded;
    decoded.reserve(path.size());
    for (size_t i = 0; i < path.size(); i++) {
      if (path[i] == '%' && i + 2 < path.size() &&
          std::isxdigit(static_cast<unsigned char>(path[i + 1])) &&
          std::isxdigit(static_cast<unsigned char>(path[i + 2]))) {
        decoded.push_back(
            static_cast<char>(std::stoi(path.substr(i + 1, 2), nullptr, 16)));
        i += 2;
      } else {
        decoded.push_back(path[i]);
      }
    }
    return decoded;
  }

  static RNSkVideoEncoderOptions readOptions(jsi::Runtime &runtime,
                                             const jsi::Object &options,
                                             const ManagedAnimation &animation,
                                             sk_sp<SkData> &audioData) {
    RNSkVideoEncoderOptions result;
    auto path = options.getProperty(runtime, "path");
    if (path.isString()) {
      result.path = stripFileScheme(path.asString(runtime).utf8(runtime));
    }
    if (result.path.empty()) {
      throw RNSkVideoExportError("invalid-argument",
                                 "exportVideo: `path` must be a file path.");
    }
    if (result.path.front() != '/') {
      auto directory = RNSkVideoExportDirectory::get();
      if (directory.empty()) {
        throw RNSkVideoExportError(
            "invalid-argument",
            "exportVideo: `path` must be absolute on this platform.");
      }
      result.path = directory + "/" + result.path;
    }

    auto width = options.getProperty(runtime, "width");
    auto height = options.getProperty(runtime, "height");
    if (!width.isNumber() || !height.isNumber()) {
      throw RNSkVideoExportError(
          "invalid-argument",
          "exportVideo: `width` and `height` are required.");
    }
    double w = width.getNumber();
    double h = height.getNumber();
    if (!std::isfinite(w) || !std::isfinite(h) || w != std::floor(w) ||
        h != std::floor(h) || w < 2 || h < 2) {
      throw RNSkVideoExportError("unsupported",
                                 "exportVideo: `width` and `height` must be "
                                 "whole numbers of at least 2 pixels.");
    }
    if (w > 8192 || h > 8192) {
      throw RNSkVideoExportError(
          "unsupported", "exportVideo: the size is larger than any H.264 "
                         "encoder takes.");
    }
    // H.264 stores chroma at half resolution: odd sizes are refused by the
    // encoders, or padded with a row or column nobody asked for.
    if (static_cast<int64_t>(w) % 2 != 0 || static_cast<int64_t>(h) % 2 != 0) {
      throw RNSkVideoExportError(
          "unsupported", "exportVideo: H.264 needs an even width and height, "
                         "got " +
                             std::to_string(static_cast<int64_t>(w)) + "x" +
                             std::to_string(static_cast<int64_t>(h)) + ".");
    }
    result.width = static_cast<int>(w);
    result.height = static_cast<int>(h);

    auto skottie = animation._animation;
    auto fps = options.getProperty(runtime, "fps");
    result.fps = fps.isNumber() ? fps.getNumber() : skottie->fps();
    if (!(result.fps > 0) || result.fps > 240) {
      throw RNSkVideoExportError(
          "unsupported", "exportVideo: `fps` must be between 0 and 240.");
    }
    auto bitrate = options.getProperty(runtime, "bitrate");
    if (bitrate.isNumber()) {
      if (!(bitrate.getNumber() >= 1) || !std::isfinite(bitrate.getNumber())) {
        throw RNSkVideoExportError("invalid-argument",
                                   "exportVideo: `bitrate` must be positive.");
      }
      result.bitrate = static_cast<int64_t>(bitrate.getNumber());
    }
    result.frameCount =
        std::max<int64_t>(1, std::llround(skottie->duration() * result.fps));

    auto audio = options.getProperty(runtime, "audio");
    if (audio.isObject()) {
      auto audioObject = audio.asObject(runtime);
      auto data = tryGetJsiObject<JsiSkData>(
          runtime, audioObject.getProperty(runtime, "data"));
      if (data != nullptr) {
        audioData = data->getObject();
        return result;
      }
      auto audioPath = audioObject.getProperty(runtime, "path");
      if (!audioPath.isString()) {
        throw RNSkVideoExportError("invalid-argument",
                                   "exportVideo: `audio` must be { path } or "
                                   "{ data }.");
      }
      result.audioPath =
          stripFileScheme(audioPath.asString(runtime).utf8(runtime));
    } else if (!audio.isUndefined() && !audio.isNull()) {
      throw RNSkVideoExportError(
          "invalid-argument",
          "exportVideo: `audio` must be { path } or { data }.");
    }
    return result;
  }

  /** Renders and encodes every frame, on the export's thread. */
  static RNSkAsync::Settle
  run(std::shared_ptr<Job> job, std::shared_ptr<RNSkPlatformContext> context,
      std::shared_ptr<RNSkRuntimeScheduler> scheduler) {
    auto options = job->options;
    std::unique_ptr<RNSkVideoEncoder> encoder;
    // The sound given as bytes, in a file for the platform to read; deleted
    // with the export, whatever its outcome.
    TemporaryFile audioFile;
    try {
      if (job->audioData != nullptr) {
        audioFile.write(job->audioData);
        options.audioPath = audioFile.path;
      }
      auto *dawn = DawnContext::tryGetInstance();
      if (dawn == nullptr) {
        throw RNSkVideoExportError(
            "unsupported", "exportVideo: no GPU Skia can render with: " +
                               DawnContext::getGpuInfo().error);
      }
      const auto generation = DawnContext::generation();
      ManagedAnimation animation(job->source);
      if (animation._animation == nullptr) {
        throw RNSkVideoExportError("invalid-argument",
                                   "exportVideo: the animation could not be "
                                   "made again from its JSON.");
      }
      encoder = context->makeVideoEncoder(options);
      encoder->start();
      auto *recorder = dawn->getRecorder();
      const auto destination = SkRect::MakeIWH(options.width, options.height);
      auto lastProgress = std::chrono::steady_clock::time_point();
      for (int64_t frame = 0; frame < options.frameCount; frame++) {
        if (job->cancelled->load(std::memory_order_acquire)) {
          throw RNSkVideoExportError("cancelled", "The export was cancelled.");
        }
        if (!DawnContext::isCurrent(generation)) {
          throw RNSkVideoExportError(
              "gpu-lost", "The GPU device was lost during the export.");
        }
        auto surface = encoder->beginFrame(frame);
        if (surface == nullptr) {
          throw RNSkVideoExportError("encoder-failed",
                                     "exportVideo: no surface for frame " +
                                         std::to_string(frame));
        }
        auto *canvas = surface->getCanvas();
        // A video has no alpha: what the animation leaves transparent shows
        // black, as it would over a black background.
        canvas->clear(SK_ColorBLACK);
        animation._animation->seekFrameTime(static_cast<double>(frame) /
                                            options.fps);
        animation._animation->render(canvas, &destination);
        if (!dawn->submitRecording(recorder)) {
          throw RNSkVideoExportError(DawnContext::isCurrent(generation)
                                         ? "encoder-failed"
                                         : "gpu-lost",
                                     "exportVideo: rendering frame " +
                                         std::to_string(frame) + " failed.");
        }
        surface = nullptr;
        encoder->endFrame(frame);
        auto now = std::chrono::steady_clock::now();
        if (frame + 1 == options.frameCount ||
            now - lastProgress > std::chrono::milliseconds(50)) {
          lastProgress = now;
          progress(job, scheduler, frame + 1, options.frameCount);
        }
      }
      encoder->finish();
      encoder = nullptr;
      DawnContext::trimThreadRecorders(std::chrono::milliseconds(0), true);
      return resolve(job);
    } catch (const std::exception &error) {
      if (encoder != nullptr) {
        encoder->abort();
      }
      const auto *exportError =
          dynamic_cast<const RNSkVideoExportError *>(&error);
      return reject(job,
                    exportError != nullptr
                        ? *exportError
                        : RNSkVideoExportError("encoder-failed", error.what()));
    } catch (...) {
      // Not a C++ exception: one the platform raised (an NSException), on a
      // thread nothing else would catch it on.
      if (encoder != nullptr) {
        encoder->abort();
      }
      return reject(job, RNSkVideoExportError(
                             "encoder-failed",
                             "exportVideo: the platform encoder failed."));
    }
  }

  struct TemporaryFile {
    std::string path;

    TemporaryFile() = default;
    TemporaryFile(const TemporaryFile &) = delete;
    ~TemporaryFile() {
      if (!path.empty()) {
        std::remove(path.c_str());
      }
    }

    /**
     Writes the bytes to a new file, named with the extension the platform
     readers tell the format by (AVURLAsset does): what the bytes start
     with. Deleted with this, even when writing fails.
     */
    void write(const sk_sp<SkData> &data) {
      static std::atomic<int> counter{0};
      auto directory = RNSkVideoExportDirectory::get();
      if (directory.empty()) {
        throw RNSkVideoExportError(
            "audio-failed", "exportVideo: no directory to read the sound "
                            "from; pass audio: { path } instead.");
      }
      const auto *bytes = static_cast<const uint8_t *>(data->data());
      const auto size = data->size();
      const char *extension = ".mp3";
      if (size > 8 && std::memcmp(bytes + 4, "ftyp", 4) == 0) {
        extension = ".m4a";
      } else if (size > 4 && std::memcmp(bytes, "RIFF", 4) == 0) {
        extension = ".wav";
      } else if (size > 2 && bytes[0] == 0xFF && (bytes[1] & 0xF6) == 0xF0) {
        extension = ".aac";
      } else if (size > 4 && std::memcmp(bytes, "fLaC", 4) == 0) {
        extension = ".flac";
      } else if (size > 4 && std::memcmp(bytes, "FORM", 4) == 0) {
        extension = ".aiff";
      } else if (size > 4 && std::memcmp(bytes, "caff", 4) == 0) {
        extension = ".caf";
      } else if (size > 4 && std::memcmp(bytes, "OggS", 4) == 0) {
        extension = ".ogg";
      }
      path = directory + "/rnskia-export-sound-" +
             std::to_string(counter.fetch_add(1)) + extension;
      FILE *out = std::fopen(path.c_str(), "wb");
      if (out == nullptr) {
        throw RNSkVideoExportError("audio-failed",
                                   "exportVideo: cannot write " + path);
      }
      const bool written = std::fwrite(bytes, 1, size, out) == size;
      if (std::fclose(out) != 0 || !written) {
        throw RNSkVideoExportError("audio-failed",
                                   "exportVideo: cannot write " + path);
      }
    }
  };

  /**
   Reports progress to JS. At most one event is queued at a time, reporting
   the latest count when it runs: when onProgress takes longer than the
   export does between two reports (a slow re-render), the events would pile
   up on the JS thread, and everything else there (taps, timers, the cancel)
   would wait behind them.
   */
  static void progress(const std::shared_ptr<Job> &job,
                       const std::shared_ptr<RNSkRuntimeScheduler> &scheduler,
                       int64_t frames, int64_t frameCount) {
    job->framesDone.store(frames, std::memory_order_release);
    if (job->progressPending.exchange(true, std::memory_order_acq_rel)) {
      return;
    }
    scheduler->postEvent([job, frameCount](jsi::Runtime &runtime) {
      // Cleared before reading the count: a report made in between posts
      // an event of its own.
      job->progressPending.store(false, std::memory_order_release);
      const auto frames = job->framesDone.load(std::memory_order_acquire);
      if (job->onProgress != nullptr) {
        job->onProgress->call(runtime, static_cast<double>(frames),
                              static_cast<double>(frameCount));
      }
    });
  }

  static RNSkAsync::Settle resolve(const std::shared_ptr<Job> &job) {
    return [job](jsi::Runtime &runtime, RNSkAsync::Promise &promise) {
      job->onProgress.reset();
      jsi::Object result(runtime);
      result.setProperty(
          runtime, "path",
          jsi::String::createFromUtf8(runtime, job->options.path));
      result.setProperty(runtime, "width", job->options.width);
      result.setProperty(runtime, "height", job->options.height);
      result.setProperty(runtime, "fps", job->options.fps);
      result.setProperty(runtime, "frames",
                         static_cast<double>(job->options.frameCount));
      result.setProperty(runtime, "duration", job->options.duration());
      promise.resolve(jsi::Value(std::move(result)));
    };
  }

  static RNSkAsync::Settle reject(const std::shared_ptr<Job> &job,
                                  const RNSkVideoExportError &error) {
    return [job, code = error.code(), message = std::string(error.what())](
               jsi::Runtime &runtime, RNSkAsync::Promise &promise) {
      job->onProgress.reset();
      jsi::JSError jsError(runtime, message);
      auto object = jsError.value().asObject(runtime);
      object.setProperty(runtime, "code",
                         jsi::String::createFromUtf8(runtime, code));
      if (code == "cancelled") {
        // What a fetch aborted through its signal rejects with.
        object.setProperty(runtime, "name",
                           jsi::String::createFromAscii(runtime, "AbortError"));
      }
      promise.reject(jsError);
    };
  }
};

} // namespace RNSkia
