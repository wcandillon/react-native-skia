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
#include "RNSkGraphiteTargetInfo.h"
#include "RNSkPlatformContext.h"
#include "RNSkWindowSurface.h"

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
 * The Graphite recorder of a target JS records into (see
 * RNSkGraphiteTarget::beginRecording()). Shared by the target and by every
 * recording snapped from it, so that the recorder outlives its recordings
 * whichever of them is released last. Made for one GPU device (see
 * DawnContext::generation()): once that device is lost the target makes a
 * new one, and the recordings of this one are dropped. Declarative content
 * is recorded on the recorders of the render thread pool instead, which
 * outlive everything (see DawnContext::getThreadRecorder).
 */
struct RNSkGraphiteRecorder {
  std::unique_ptr<skgpu::graphite::Recorder> recorder;
  uint64_t generation = 0;
};

/**
 * A frame snapped from a recorder, with the generation of the GPU device it
 * was recorded for and the description of the target. Immutable once
 * snapped: it can be replayed any number of times, from any thread, onto the
 * device it was recorded for (see isCurrent).
 */
class RNSkGraphiteRecording {
public:
  /**
   `recorder` is the target's own recorder when the frame was recorded on
   one, kept alive by the recording; nullptr for a thread's recorder.
   */
  RNSkGraphiteRecording(
      std::unique_ptr<skgpu::graphite::Recording> recording,
      uint64_t generation, const RNSkGraphiteTargetInfo &target,
      std::shared_ptr<RNSkGraphiteRecorder> recorder = nullptr)
      : _generation(generation), _recorder(std::move(recorder)),
        _recording(std::move(recording)), _target(target) {}

  skgpu::graphite::Recording *get() const { return _recording.get(); }

  /**
   Whether the recording can be replayed right now: it was recorded for the
   GPU device in use, and that device is not lost. A recording made for a
   lost device can never be replayed, and the device replacing it would
   refuse its resources (see DawnContext).
   */
  bool isCurrent() const { return DawnContext::isCurrent(_generation); }

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
  uint64_t _generation;
  // The target's own recorder when the frame was recorded on one, so that
  // it outlives the recording; declared before the recording so that the
  // recording is released first.
  std::shared_ptr<RNSkGraphiteRecorder> _recorder;
  std::unique_ptr<skgpu::graphite::Recording> _recording;
  RNSkGraphiteTargetInfo _target;
};

/**
 * What a view and the producers recording for it share: the queue of
 * recordings waiting to be presented and the description of the target
 * texture. Created by whichever side comes first (see
 * RNSkGraphiteTargetRegistry) and kept alive by both.
 *
 * Recording happens on the producer's thread (the JS thread, a worklet
 * runtime or the render thread pool), presenting on the main thread; the
 * queue is the hand-off. A frame is recorded on the recorder of the thread
 * recording it (the render thread pool) or on a recorder of the target's own
 * (JS); either way a single recording is open at a time, and it is snapped
 * on the thread that opened it.
 */
class RNSkGraphiteTarget {
public:
  explicit RNSkGraphiteTarget(std::shared_ptr<RNSkPlatformContext> context)
      : _context(std::move(context)) {}

  // Producer side ------------------------------------------------------------

  /**
   The layout size (points) and the props the format follows from, as known
   to JS. Used until the platform view knows better: the pixel size it was
   laid out with, and the bit depth of its surface (see resolveTargetInfo).
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
   Returns a canvas that records the next frame, in points, on the recorder
   of the calling thread (see DawnContext::getThreadRecorder): the render
   thread pool records the declarative content of every view this way, each
   job on whichever thread is free, so a view holds no recorder of its own
   and the recorders of a few threads serve every view, with their caches
   and atlases. finishRecording() snaps it, on the same thread, before the
   thread records anything else (a recorder takes one deferred canvas at a
   time). The canvas is deleted by finishRecording(). Throws while a
   recording is already open, or while the view has no size.
   */
  SkCanvas *beginRecording(const DawnContext::RecorderRef &recorder) {
    auto target = resolveTargetInfo();
    std::lock_guard<std::mutex> lock(_stateMutex);
    return openRecordingLocked(recorder.recorder, recorder.generation, nullptr,
                               target);
  }

  /**
   Same, on a recorder of the target's own, made on the first call and again
   once the GPU device it was made for is lost: for JS, which records across
   calls (SkiaViewApi.makeGraphiteContext) and may open a recording on
   another target before finishing this one. Throws while a recording is
   already open, while the view has no size, or when no recorder can be made.
   */
  SkCanvas *beginRecording() {
    auto target = resolveTargetInfo();
    std::lock_guard<std::mutex> lock(_stateMutex);
    // A recorder made for a GPU device that was lost since is replaced: the
    // recordings still holding it keep it alive until they are dropped.
    const auto generation = DawnContext::generation();
    if (_ownRecorder == nullptr || _ownRecorder->generation != generation) {
      auto recorder = std::make_shared<RNSkGraphiteRecorder>();
      recorder->recorder = DawnContext::getInstance().makeRecorder();
      recorder->generation = generation;
      if (recorder->recorder == nullptr) {
        throw std::runtime_error(
            "SkiaGraphiteView: could not create a Graphite recorder.");
      }
      _ownRecorder = std::move(recorder);
    }
    return openRecordingLocked(_ownRecorder->recorder.get(),
                               _ownRecorder->generation, _ownRecorder, target);
  }

  /**
   Snaps the open recording, on the thread that opened it. Throws when no
   recording is open.
   */
  std::shared_ptr<RNSkGraphiteRecording> finishRecording() {
    std::lock_guard<std::mutex> lock(_stateMutex);
    if (!_recording) {
      throw std::runtime_error("SkiaGraphiteView: no recording is open, call "
                               "beginRecording() first.");
    }
    _recording = false;
    auto *recorder = std::exchange(_openRecorder, nullptr);
    auto owner = std::move(_openOwner);
    auto recording = recorder->snap();
    if (recording == nullptr) {
      throw std::runtime_error(
          "SkiaGraphiteView: snapping the recording failed.");
    }
    return std::make_shared<RNSkGraphiteRecording>(
        std::move(recording), _openGeneration, _recordingTarget,
        std::move(owner));
  }

  /**
   Queues a recording for the next frame. Recordings are never dropped: a
   later frame may depend on resources an earlier one uploaded. This holds
   before the view exists too, as the registry owns the target until the
   view is gone (see RNSkGraphiteTargetRegistry). The one exception is a
   recording made for a lost GPU device (see RNSkGraphiteRecording::isCurrent):
   it can never be presented, and a client recording on every frame
   regardless would grow the queue without bound, so it is dropped, along
   with whatever waits in the queue, which was made for that device too.
   */
  void submit(std::shared_ptr<RNSkGraphiteRecording> recording) {
    std::function<void()> requestFrame;
    {
      std::lock_guard<std::mutex> lock(_queueMutex);
      if (!recording->isCurrent()) {
        _queue.clear();
        return;
      }
      _queue.push_back(std::move(recording));
      requestFrame = _requestFrame;
    }
    if (requestFrame) {
      requestFrame();
    }
  }

  // View side ----------------------------------------------------------------

  /**
   Binds the target to the view's surface, which describes the target
   texture; requestFrame asks the view to present the queue.
   */
  void attach(std::weak_ptr<RNSkWindowSurface> surface,
              std::function<void()> requestFrame) {
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
      _surface = std::move(surface);
    }
    std::lock_guard<std::mutex> lock(_queueMutex);
    _requestFrame = std::move(requestFrame);
  }

  /**
   Undoes attach(), for the view owning the given surface only. Native view
   ids are reused across reloads, and a view only lets go of its target when
   it is destroyed, so a view going away may find its target already bound
   to its successor; that binding is left alone.
   */
  void detach(const std::shared_ptr<RNSkWindowSurface> &surface) {
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
      if (_surface.lock() != surface) {
        return;
      }
      _surface.reset();
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
   Opens a recording on `recorder`, made for `generation`; `owner` keeps the
   recorder alive when it is the target's own. Called with the state lock
   held.
   */
  SkCanvas *openRecordingLocked(skgpu::graphite::Recorder *recorder,
                                uint64_t generation,
                                std::shared_ptr<RNSkGraphiteRecorder> owner,
                                const RNSkGraphiteTargetInfo &target) {
    if (_recording) {
      throw std::runtime_error("SkiaGraphiteView: a recording is already open, "
                               "call finishRecording() first.");
    }
    if (target.width <= 0 || target.height <= 0) {
      throw std::runtime_error("SkiaGraphiteView: the view has no size yet.");
    }
    auto imageInfo = SkImageInfo::Make(
        target.width, target.height, target.colorType, kPremul_SkAlphaType,
        DawnUtils::viewColorSpace(target.useP3ColorSpace));
    auto *canvas = recorder->makeDeferredCanvas(imageInfo, target.textureInfo);
    if (canvas == nullptr) {
      throw std::runtime_error(
          "SkiaGraphiteView: could not create a deferred canvas.");
    }
    // The canvas loads whatever the target holds: the producer clears.
    auto pd = _context->getPixelDensity();
    canvas->scale(pd, pd);
    _recording = true;
    _openRecorder = recorder;
    _openGeneration = generation;
    _openOwner = std::move(owner);
    _recordingTarget = target;
    return canvas;
  }

  /**
   The target to record against: the view's surface when it has one, else
   the pixel size the platform laid the view out with, else the layout size
   JS measured; in the last two cases with the format and the color space
   the surface has, or will have: the bit depth the platform view knows
   (the one of its backing view, which keeps it, see SkiaView.java), else
   the one the props call for, following the same rules.
   */
  RNSkGraphiteTargetInfo resolveTargetInfo() {
    std::shared_ptr<RNSkWindowSurface> surface;
    float width;
    float height;
    bool opaque;
    bool highBitDepth;
    {
      std::lock_guard<std::mutex> lock(_stateMutex);
      surface = _surface.lock();
      width = _layoutWidth;
      height = _layoutHeight;
      opaque = _opaque;
      highBitDepth = _highBitDepth;
    }
    RNSkGraphiteTargetInfo info;
    if (surface && surface->getTargetInfo(&info)) {
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
    if (surface) {
      // The window keeps the bit depth it was attached with, whatever the
      // props say later (on Android they are read at mount): a frame
      // recorded while it is away is recorded for the one it comes back
      // with.
      surface->getHighBitDepth(&highBitDepth);
    }
    if (!surface || !surface->getLayoutSize(&info.width, &info.height)) {
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

  // The target's own recorder (JS, see beginRecording()), the open recording
  // (its recorder, the generation it was made for, the owner keeping the
  // recorder alive when it is the target's own, and the target it was opened
  // against) and the target description.
  std::mutex _stateMutex;
  std::shared_ptr<RNSkGraphiteRecorder> _ownRecorder;
  bool _recording = false;
  skgpu::graphite::Recorder *_openRecorder = nullptr;
  uint64_t _openGeneration = 0;
  std::shared_ptr<RNSkGraphiteRecorder> _openOwner;
  RNSkGraphiteTargetInfo _recordingTarget;
  std::weak_ptr<RNSkWindowSurface> _surface;
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
 * Targets by native view id. The registry owns every target. An entry is
 * made by whichever side comes first, the context JS makes for the id or the
 * view binding to it, and kept until the platform view of the id is
 * unregistered or, for an id no view ever bound to, until JS retires it. A
 * retired entry lets go of its target without forgetting it: for as long as
 * a context JS made holds the target, whoever comes for the id next, the view
 * binding to it or another context, takes it over (see removeIfUnbound). A
 * reload clears the registry, as native ids start over with the next bundle
 * (see ~RNSkManager). The same ownership as the SurfaceRegistry of
 * react-native-webgpu.
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

  /** The target of the id, for the context JS makes; made when missing. */
  std::shared_ptr<RNSkGraphiteTarget>
  getOrCreate(size_t nativeId,
              const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto &entry = getOrCreateLocked(nativeId, context);
    return entry.target;
  }

  /**
   The target of the id, for the view binding to it; made when missing. From
   here on the entry is the view's: its unregistration retires it, not JS
   (see removeIfUnbound). Made and marked under one lock, so that a removal
   racing with the bind either finds the entry bound or runs before it is
   made again.
   */
  std::shared_ptr<RNSkGraphiteTarget>
  bind(size_t nativeId, const std::shared_ptr<RNSkPlatformContext> &context) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto &entry = getOrCreateLocked(nativeId, context);
    entry.bound = true;
    return entry.target;
  }

  /** Retires the entry of a platform view that is gone. */
  void remove(size_t nativeId) {
    std::shared_ptr<RNSkGraphiteTarget> target;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      auto it = _entries.find(nativeId);
      if (it == _entries.end()) {
        return;
      }
      target = std::move(it->second.target);
      _entries.erase(it);
    }
    // The target, and the GPU resources of its queue, may be destroyed here,
    // outside of the lock.
  }

  /**
   Retires the entry from the JS side, when the view component unmounts,
   unless a view bound to it: that entry is the view's, and its teardown
   retires it. React's StrictMode simulates an unmount without unmounting
   the native views, which would otherwise orphan a bound view. It runs that
   cleanup right after mount, before the native view registered when the UI
   thread lags, and the context the first effect run made stays in use. So
   the target is let go of, not forgotten: for as long as a context holds
   it, the view binding to the id takes it over (see getOrCreateLocked).
   */
  void removeIfUnbound(size_t nativeId) {
    std::shared_ptr<RNSkGraphiteTarget> target;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      auto it = _entries.find(nativeId);
      if (it != _entries.end() && !it->second.bound && it->second.target) {
        target = std::move(it->second.target);
        if (target.use_count() == 1) {
          // No context holds it: nothing is left to take over.
          _entries.erase(it);
        } else {
          it->second.retired = target;
        }
      }
      // The entries retired earlier whose context is gone by now.
      for (auto entry = _entries.begin(); entry != _entries.end();) {
        entry = entry->second.isExpired() ? _entries.erase(entry) : ++entry;
      }
    }
    // The target, and the GPU resources of its queue, may be destroyed here,
    // outside of the lock, when no context holds it.
  }

  /** Drops every entry: the bundle is going away (see ~RNSkManager). */
  void clear() {
    std::unordered_map<size_t, Entry> entries;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      entries.swap(_entries);
    }
  }

private:
  struct Entry {
    /** The target, owned until JS retires the entry. */
    std::shared_ptr<RNSkGraphiteTarget> target;
    /**
     The target of a retired entry, for as long as a context JS made holds
     it, for whoever comes for the id next (see getOrCreateLocked).
     */
    std::weak_ptr<RNSkGraphiteTarget> retired;
    bool bound = false;
    /** Retired, and its context gone: nothing left to take over. */
    bool isExpired() const { return !target && retired.expired(); }
  };

  RNSkGraphiteTargetRegistry() = default;

  Entry &
  getOrCreateLocked(size_t nativeId,
                    const std::shared_ptr<RNSkPlatformContext> &context) {
    auto &entry = _entries[nativeId];
    if (!entry.target) {
      // A new id, or one JS retired: the target a context still holds, when
      // there is one, is owned again from here on.
      entry.target = entry.retired.lock();
      entry.retired.reset();
      if (!entry.target) {
        entry.target = std::make_shared<RNSkGraphiteTarget>(context);
      }
    }
    return entry;
  }

  std::mutex _mutex;
  std::unordered_map<size_t, Entry> _entries;
};

} // namespace RNSkia
