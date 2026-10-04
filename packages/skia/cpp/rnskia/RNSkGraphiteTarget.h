#pragma once

#include <cmath>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <unordered_map>
#include <utility>
#include <vector>

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNSkCanvasProvider.h"
#include "RNSkPlatformContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkImageInfo.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/TextureInfo.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * The Graphite recorder of one view. Shared by the view's target and by every
 * recording snapped from it, so that the recorder outlives its recordings
 * whichever of them is released last.
 */
struct RNSkGraphiteRecorder {
  std::unique_ptr<skgpu::graphite::Recorder> recorder;
};

/**
 * A frame snapped from a view's recorder, with the description of the target
 * it was recorded for. Immutable once snapped: it can be replayed any number
 * of times, from any thread.
 */
class RNSkGraphiteRecording {
public:
  RNSkGraphiteRecording(std::shared_ptr<RNSkGraphiteRecorder> recorder,
                        std::unique_ptr<skgpu::graphite::Recording> recording,
                        const RNSkGraphiteTargetInfo &target)
      : _recorder(std::move(recorder)), _recording(std::move(recording)),
        _target(target) {}

  skgpu::graphite::Recording *get() const { return _recording.get(); }

  /**
   Whether the recording was made for a texture of the given size. A deferred
   canvas records against fixed dimensions: Graphite sizes the passes (and
   their depth and stencil attachments) from them, so replaying it onto a
   texture of another size is rejected by Dawn and draws nothing. A recording
   of another size is replayed through a texture of its own size instead (see
   RNSkView::present).
   */
  bool hasSizeOf(const RNSkGraphiteTargetInfo &target) const {
    return _target.width == target.width && _target.height == target.height;
  }

  /** The target the recording was made for. */
  const RNSkGraphiteTargetInfo &getTarget() const { return _target; }

  /**
   Whether the recording has the format of the given target, and the target
   supports every usage the recording relies on.
   */
  bool hasFormatOf(const RNSkGraphiteTargetInfo &target) const {
    return _target.colorType == target.colorType &&
           _target.textureInfo.canBeFulfilledBy(target.textureInfo);
  }

  /**
   Whether the recording was made in the color space of the given target. The
   colors of a recording are converted when it is recorded: replayed onto a
   target in another color space, they would be read in the wrong gamut. Such
   a recording is replayed through a texture in its own color space instead,
   which is then drawn, and converted, onto the target (see
   RNSkView::present).
   */
  bool hasColorSpaceOf(const RNSkGraphiteTargetInfo &target) const {
    return _target.useP3ColorSpace == target.useP3ColorSpace;
  }

  /** Whether the recording can be replayed straight onto the given target. */
  bool isCompatibleWith(const RNSkGraphiteTargetInfo &target) const {
    return hasSizeOf(target) && hasFormatOf(target) && hasColorSpaceOf(target);
  }

private:
  // Declared before the recording so that the recording is released first.
  std::shared_ptr<RNSkGraphiteRecorder> _recorder;
  std::unique_ptr<skgpu::graphite::Recording> _recording;
  RNSkGraphiteTargetInfo _target;
};

/**
 * What a view and the producers recording for it share: the view's recorder,
 * the queue of recordings waiting to be presented and the description of the
 * target texture. Created by whichever side comes first (see
 * RNSkGraphiteTargetRegistry) and kept alive by both.
 *
 * Recording happens on the producer's thread (the JS thread, a worklet
 * runtime or the render thread pool), presenting on the main thread; the
 * queue is the hand-off. A recorder serves one thread at a time, which is
 * enforced by allowing a single open recording.
 */
class RNSkGraphiteTarget {
public:
  explicit RNSkGraphiteTarget(std::shared_ptr<RNSkPlatformContext> context)
      : _context(std::move(context)) {}

  // Producer side ------------------------------------------------------------

  /**
   The layout size (points) and the props the format follows from, as known
   to JS. Used until the view has a surface of its own.
   */
  void setLayout(float width, float height, bool opaque, bool highBitDepth) {
    std::lock_guard<std::mutex> lock(_stateMutex);
    _layoutWidth = width;
    _layoutHeight = height;
    _opaque = opaque;
    _highBitDepth = highBitDepth;
  }

  /** Current width of the target, in points. */
  float getWidth() {
    return resolveTargetInfo().width / _context->getPixelDensity();
  }

  /** Current height of the target, in points. */
  float getHeight() {
    return resolveTargetInfo().height / _context->getPixelDensity();
  }

  /**
   Returns a canvas that records the next frame, in points. The canvas is
   deleted by finishRecording(). Throws while a recording is already open.
   */
  SkCanvas *beginRecording() {
    auto target = resolveTargetInfo();
    std::lock_guard<std::mutex> lock(_stateMutex);
    if (_recording) {
      throw std::runtime_error("SkiaGraphiteView: a recording is already open, "
                               "call finishRecording() first.");
    }
    if (target.width <= 0 || target.height <= 0) {
      throw std::runtime_error("SkiaGraphiteView: the view has no size yet.");
    }
    if (_recorder == nullptr) {
      auto recorder = std::make_shared<RNSkGraphiteRecorder>();
      recorder->recorder = DawnContext::getInstance().makeRecorder();
      if (recorder->recorder == nullptr) {
        throw std::runtime_error(
            "SkiaGraphiteView: could not create a Graphite recorder.");
      }
      _recorder = std::move(recorder);
    }
    auto imageInfo = SkImageInfo::Make(
        target.width, target.height, target.colorType, kPremul_SkAlphaType,
        DawnUtils::viewColorSpace(target.useP3ColorSpace));
    auto *canvas =
        _recorder->recorder->makeDeferredCanvas(imageInfo, target.textureInfo);
    if (canvas == nullptr) {
      throw std::runtime_error(
          "SkiaGraphiteView: could not create a deferred canvas.");
    }
    // The canvas loads whatever the target holds: the producer clears.
    auto pd = _context->getPixelDensity();
    canvas->scale(pd, pd);
    _recording = true;
    _recordingTarget = target;
    return canvas;
  }

  /** Snaps the open recording. Throws when no recording is open. */
  std::shared_ptr<RNSkGraphiteRecording> finishRecording() {
    std::lock_guard<std::mutex> lock(_stateMutex);
    if (!_recording) {
      throw std::runtime_error("SkiaGraphiteView: no recording is open, call "
                               "beginRecording() first.");
    }
    _recording = false;
    auto recording = _recorder->recorder->snap();
    if (recording == nullptr) {
      throw std::runtime_error(
          "SkiaGraphiteView: snapping the recording failed.");
    }
    return std::make_shared<RNSkGraphiteRecording>(
        _recorder, std::move(recording), _recordingTarget);
  }

  /**
   Queues a recording for the next frame. Recordings are never dropped: a
   later frame may depend on resources an earlier one uploaded.
   */
  void submit(std::shared_ptr<RNSkGraphiteRecording> recording) {
    std::function<void()> requestFrame;
    {
      std::lock_guard<std::mutex> lock(_queueMutex);
      _queue.push_back(std::move(recording));
      requestFrame = _requestFrame;
    }
    if (requestFrame) {
      requestFrame();
    }
  }

  // View side ----------------------------------------------------------------

  /**
   Binds the target to the view's surface: the provider describes the target
   texture, requestFrame asks the view to present the queue.
   */
  void attach(std::weak_ptr<RNSkCanvasProvider> provider,
              std::function<void()> requestFrame) {
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
      _provider = std::move(provider);
    }
    std::lock_guard<std::mutex> lock(_queueMutex);
    _requestFrame = std::move(requestFrame);
  }

  /**
   Undoes attach(), for the view owning the given provider only. Native view
   ids are reused across reloads and an Android view is only destroyed when
   its Java object is finalized, so a view going away may find its target
   already bound to its successor; that binding is left alone.
   */
  void detach(const std::shared_ptr<RNSkCanvasProvider> &provider) {
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
      if (_provider.lock() != provider) {
        return;
      }
      _provider.reset();
    }
    std::lock_guard<std::mutex> lock(_queueMutex);
    _requestFrame = nullptr;
  }

  /** Takes every recording submitted since the last call, in order. */
  std::vector<std::shared_ptr<RNSkGraphiteRecording>> takeQueued() {
    std::lock_guard<std::mutex> lock(_queueMutex);
    std::vector<std::shared_ptr<RNSkGraphiteRecording>> recordings(
        _queue.begin(), _queue.end());
    _queue.clear();
    return recordings;
  }

  /**
   Puts recordings that could not be presented back at the front of the
   queue, ahead of anything submitted meanwhile, so that the order holds.
   */
  void requeue(
      const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings) {
    std::lock_guard<std::mutex> lock(_queueMutex);
    _queue.insert(_queue.begin(), recordings.begin(), recordings.end());
  }

  /** The most recently submitted recording still waiting, if any. */
  std::shared_ptr<RNSkGraphiteRecording> peekLatest() {
    std::lock_guard<std::mutex> lock(_queueMutex);
    return _queue.empty() ? nullptr : _queue.back();
  }

  bool hasQueued() {
    std::lock_guard<std::mutex> lock(_queueMutex);
    return !_queue.empty();
  }

private:
  /**
   The target to record against: the view's surface when it has one, else
   the pixel size the platform laid the view out with, else the layout size
   JS measured; in the last two cases with the format and the color space
   the surface will be created with, following the same rules (see
   DawnWindowContext and SkiaView.java).
   */
  RNSkGraphiteTargetInfo resolveTargetInfo() {
    std::shared_ptr<RNSkCanvasProvider> provider;
    float width;
    float height;
    bool opaque;
    bool highBitDepth;
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
      provider = _provider.lock();
      width = _layoutWidth;
      height = _layoutHeight;
      opaque = _opaque;
      highBitDepth = _highBitDepth;
    }
    RNSkGraphiteTargetInfo info;
    if (provider && provider->getTargetInfo(&info)) {
      return info;
    }
#if defined(__ANDROID__)
    // The 10-bit buffer format only has 2 bits of alpha: translucent views
    // stay 8-bit.
    if (!opaque) {
      highBitDepth = false;
    }
#else
    (void)opaque;
#endif
    if (!provider || !provider->getLayoutSize(&info.width, &info.height)) {
      // Not laid out yet (JS gets its onLayout before the platform lays the
      // view out): the size JS measured, in points. The layout is on the
      // pixel grid, so the product is an integer up to rounding errors.
      double pd = _context->getPixelDensity();
      info.width = static_cast<int>(std::lround(width * pd));
      info.height = static_cast<int>(std::lround(height * pd));
    } else {
    }
    info.colorType = highBitDepth ? DawnUtils::HighBitDepthColorType
                                  : DawnUtils::PreferedColorType;
    info.useP3ColorSpace = _context->prefersP3ColorSpace();
    info.textureInfo = skgpu::graphite::TextureInfos::MakeDawn(
        skgpu::graphite::DawnTextureInfo(
            skgpu::graphite::SampleCount::k1, skgpu::Mipmapped::kNo,
            highBitDepth ? DawnUtils::HighBitDepthTextureFormat
                         : DawnUtils::PreferredTextureFormat,
            DawnUtils::DefaultTargetUsage, wgpu::TextureAspect::All));
    return info;
  }

  std::shared_ptr<RNSkPlatformContext> _context;

  // Recorder, open recording and target description.
  std::mutex _stateMutex;
  std::shared_ptr<RNSkGraphiteRecorder> _recorder;
  bool _recording = false;
  RNSkGraphiteTargetInfo _recordingTarget;
  std::weak_ptr<RNSkCanvasProvider> _provider;
  float _layoutWidth = 0;
  float _layoutHeight = 0;
  bool _opaque = false;
  bool _highBitDepth = false;

  // Hand-off to the main thread.
  std::mutex _queueMutex;
  std::deque<std::shared_ptr<RNSkGraphiteRecording>> _queue;
  std::function<void()> _requestFrame;
};

/**
 * Targets by native view id. Entries are weak: a target lives as long as the
 * view or a JS context object holds it.
 */
class RNSkGraphiteTargetRegistry {
public:
  static RNSkGraphiteTargetRegistry &getInstance() {
    static RNSkGraphiteTargetRegistry instance;
    return instance;
  }

  RNSkGraphiteTargetRegistry(const RNSkGraphiteTargetRegistry &) = delete;
  RNSkGraphiteTargetRegistry &
  operator=(const RNSkGraphiteTargetRegistry &) = delete;

  std::shared_ptr<RNSkGraphiteTarget>
  getOrCreate(size_t nativeId,
              const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto it = _targets.find(nativeId);
    if (it != _targets.end()) {
      if (auto target = it->second.lock()) {
        return target;
      }
    }
    for (auto entry = _targets.begin(); entry != _targets.end();) {
      entry = entry->second.expired() ? _targets.erase(entry) : ++entry;
    }
    auto target = std::make_shared<RNSkGraphiteTarget>(context);
    _targets[nativeId] = target;
    return target;
  }

private:
  RNSkGraphiteTargetRegistry() = default;
  std::mutex _mutex;
  std::unordered_map<size_t, std::weak_ptr<RNSkGraphiteTarget>> _targets;
};

} // namespace RNSkia
