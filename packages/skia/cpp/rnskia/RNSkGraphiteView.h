#pragma once

#if defined(SK_GRAPHITE)

#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "RNSkPlatformContext.h"
#include "RNSkView.h"
#include "jsi/ViewProperty.h"
#include "utils/RNSkLog.h"

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
 * The Graphite recorder of one SkiaGraphiteView. Shared by the view's target
 * and by every recording snapped from it, so that the recorder outlives its
 * recordings whichever of them is released last.
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
   Whether the recording can be replayed onto the given target: same format,
   and the target supports every usage the recording relies on.
   */
  bool isCompatibleWith(const RNSkGraphiteTargetInfo &target) const {
    return _target.colorType == target.colorType &&
           _target.textureInfo.canBeFulfilledBy(target.textureInfo);
  }

private:
  // Declared before the recording so that the recording is released first.
  std::shared_ptr<RNSkGraphiteRecorder> _recorder;
  std::unique_ptr<skgpu::graphite::Recording> _recording;
  RNSkGraphiteTargetInfo _target;
};

/**
 * What a SkiaGraphiteView and the JS objects recording for it share: the
 * view's recorder, the queue of recordings waiting to be presented and the
 * description of the target texture. Created by whichever side comes first
 * (see RNSkGraphiteTargetRegistry) and kept alive by both.
 *
 * Recording happens on the producer's thread (the JS thread or a worklet
 * runtime), presenting on the main thread; the queue is the hand-off. A
 * recorder serves one thread at a time, which is enforced by allowing a
 * single open recording.
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
    auto imageInfo =
        SkImageInfo::Make(target.width, target.height, target.colorType,
                          kPremul_SkAlphaType, SkColorSpace::MakeSRGB());
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

  void detach() {
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
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
   The target to record against: the view's surface when it has one, else a
   description derived from the layout size and the props, following the
   rules the surface will be created with (see DawnWindowContext and
   SkiaBaseView.java).
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
    if (provider && provider->getGraphiteTargetInfo(&info)) {
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
    auto pd = _context->getPixelDensity();
    info.width = static_cast<int>(width * pd);
    info.height = static_cast<int>(height * pd);
    info.colorType = highBitDepth ? DawnUtils::HighBitDepthColorType
                                  : DawnUtils::PreferedColorType;
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

/**
 * Presents the recordings queued on a target. Runs on the main thread, except
 * renderLastFrame() which serves snapshots from any thread.
 */
class RNSkGraphiteRenderer : public RNSkRenderer {
public:
  explicit RNSkGraphiteRenderer(std::function<void()> requestRedraw)
      : RNSkRenderer(std::move(requestRedraw)) {}

  virtual ~RNSkGraphiteRenderer() = default;

  void setTarget(std::shared_ptr<RNSkGraphiteTarget> target) {
    std::lock_guard<std::mutex> lock(_mutex);
    _target = std::move(target);
  }

  /**
   Presents everything submitted since the last frame. With nothing queued,
   presents the last frame again: a redraw after a resize or on a new
   surface. Without a surface the queue is left alone: the surface presents
   it when it appears.
   */
  void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) override {
    RNSkGraphiteTargetInfo targetInfo;
    if (!canvasProvider->getGraphiteTargetInfo(&targetInfo)) {
      return;
    }
    std::shared_ptr<RNSkGraphiteTarget> target;
    std::shared_ptr<RNSkGraphiteRecording> lastPresented;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = _target;
      lastPresented = _lastPresented;
    }
    std::vector<std::shared_ptr<RNSkGraphiteRecording>> recordings;
    if (target) {
      recordings = target->takeQueued();
    }
    if (recordings.empty()) {
      if (lastPresented == nullptr) {
        return;
      }
      present(canvasProvider, targetInfo, {lastPresented},
              /* remember= */ true);
      return;
    }
    if (!present(canvasProvider, targetInfo, recordings,
                 /* remember= */ true) &&
        target) {
      target->requeue(recordings);
    }
  }

  /**
   Presents the queued recordings, if any. Returns whether more are waiting,
   so that the caller keeps its frame callback armed. Without a surface the
   queue is left alone: the surface presents it when it appears.
   */
  bool presentQueued(const std::shared_ptr<RNSkCanvasProvider> &provider) {
    std::shared_ptr<RNSkGraphiteTarget> target;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = _target;
    }
    if (target == nullptr) {
      return false;
    }
    RNSkGraphiteTargetInfo targetInfo;
    if (!provider->getGraphiteTargetInfo(&targetInfo)) {
      return false;
    }
    auto recordings = target->takeQueued();
    if (recordings.empty()) {
      return false;
    }
    if (!present(provider, targetInfo, recordings, /* remember= */ true)) {
      target->requeue(recordings);
      return false;
    }
    return target->hasQueued();
  }

  /**
   Replays the frame on screen, or the one about to be, onto another
   provider (a snapshot surface).
   */
  bool renderLastFrame(const std::shared_ptr<RNSkCanvasProvider> &provider) {
    std::shared_ptr<RNSkGraphiteTarget> target;
    std::shared_ptr<RNSkGraphiteRecording> recording;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = _target;
      recording = _lastPresented;
    }
    if (target) {
      if (auto latest = target->peekLatest()) {
        recording = latest;
      }
    }
    if (recording == nullptr) {
      return false;
    }
    RNSkGraphiteTargetInfo targetInfo;
    if (!provider->getGraphiteTargetInfo(&targetInfo)) {
      return false;
    }
    return present(provider, targetInfo, {recording}, /* remember= */ false);
  }

private:
  /**
   Replays the recordings onto the provider's target. Returns false when the
   provider could not present (no surface, app in the background), in which
   case nothing was consumed and the caller keeps the recordings.
   */
  bool
  present(const std::shared_ptr<RNSkCanvasProvider> &provider,
          const RNSkGraphiteTargetInfo &targetInfo,
          const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings,
          bool remember) {
    std::vector<skgpu::graphite::Recording *> raw;
    std::shared_ptr<RNSkGraphiteRecording> last;
    for (const auto &recording : recordings) {
      // A recording made for another format (recorded before the surface
      // existed, with a bit depth the surface did not get) cannot be
      // replayed onto this one.
      if (!recording->isCompatibleWith(targetInfo)) {
        RNSkLogger::logToConsole("SkiaGraphiteView: skipping a recording made "
                                 "for a different surface format");
        continue;
      }
      raw.push_back(recording->get());
      last = recording;
    }
    if (raw.empty()) {
      // Nothing presentable: the recordings are consumed, not kept.
      return true;
    }
    bool success = provider->presentRecordings(raw);
    if (success && remember) {
      std::lock_guard<std::mutex> lock(_mutex);
      _lastPresented = last;
    }
    return success;
  }

  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  std::shared_ptr<RNSkGraphiteRecording> _lastPresented;
};

/**
 * A view that presents Graphite recordings. JS records frames through the
 * target (SkiaViewApi.makeGraphiteContext); the platform view presents them
 * on its display link. Only available with the Graphite backend.
 */
class RNSkGraphiteView : public RNSkView {
public:
  RNSkGraphiteView(std::shared_ptr<RNSkPlatformContext> context,
                   std::shared_ptr<RNSkCanvasProvider> canvasProvider)
      : RNSkView(context, canvasProvider,
                 std::make_shared<RNSkGraphiteRenderer>(
                     std::bind(&RNSkGraphiteView::requestRedraw, this))) {}

  ~RNSkGraphiteView() override {
    if (_target) {
      _target->detach();
    }
  }

  // No JSI properties: frames arrive through the target.
  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props,
      bool = true) override {}

  void setNativeId(size_t nativeId) override {
    RNSkView::setNativeId(nativeId);
    if (_target && _targetId == nativeId) {
      return;
    }
    if (_target) {
      _target->detach();
    }
    _targetId = nativeId;
    _target = RNSkGraphiteTargetRegistry::getInstance().getOrCreate(
        nativeId, getPlatformContext());
    getGraphiteRenderer()->setTarget(_target);
    std::weak_ptr<RNSkGraphiteView> weakThis =
        std::static_pointer_cast<RNSkGraphiteView>(shared_from_this());
    auto context = getPlatformContext();
    auto scheduleOnMainThread = [weakThis, context]() {
      context->runOnMainThread([weakThis]() {
        if (auto view = weakThis.lock()) {
          view->scheduleFrame();
        }
      });
    };
    _target->attach(getCanvasProvider(), scheduleOnMainThread);
    // Frames recorded before the view existed are presented now.
    if (_target->hasQueued()) {
      scheduleOnMainThread();
    }
  }

  /**
   Installed by the platform view: arms its display link. Main thread. Without
   one, frames are presented as soon as the main thread gets to them.
   */
  void setFrameScheduler(std::function<void()> scheduler) {
    _frameScheduler = std::move(scheduler);
  }

  /** Main thread: a recording is waiting. */
  void scheduleFrame() {
    if (_frameScheduler) {
      _frameScheduler();
    } else {
      redraw();
    }
  }

  /**
   Display link tick: presents the queued recordings. Returns whether more
   are already waiting.
   */
  bool presentFrame() {
    return getGraphiteRenderer()->presentQueued(getCanvasProvider());
  }

  bool hasQueuedRecordings() { return _target && _target->hasQueued(); }

  /** Replays the current frame into an offscreen surface. */
  sk_sp<SkImage> makeImageSnapshot(SkRect *bounds) override {
    auto provider = std::make_shared<RNSkOffscreenCanvasProvider>(
        getPlatformContext(), std::bind(&RNSkView::requestRedraw, this),
        getScaledWidth(), getScaledHeight());
    getGraphiteRenderer()->renderLastFrame(provider);
    return provider->makeSnapshot(bounds);
  }

private:
  std::shared_ptr<RNSkGraphiteRenderer> getGraphiteRenderer() {
    return std::static_pointer_cast<RNSkGraphiteRenderer>(getRenderer());
  }

  std::shared_ptr<RNSkGraphiteTarget> _target;
  size_t _targetId = 0;
  std::function<void()> _frameScheduler;
};

} // namespace RNSkia

#endif // SK_GRAPHITE
