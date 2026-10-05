#pragma once

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "RNSkCanvasProvider.h"
#include "RNSkGraphiteProducer.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkPlatformContext.h"
#include "jsi/ViewProperty.h"
#include "utils/RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkImage.h"
#include "include/core/SkRect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * The native side of a Skia view. Frames come from one of two producers: JS
 * records them itself through the view's target
 * (SkiaViewApi.makeGraphiteContext), or <Canvas> hands over a recorder (or a
 * picture) that the render thread pool records for the view. Either way the
 * recordings are queued on the target; the view presents them onto its canvas
 * provider on the main thread, aligned with the platform's display link.
 *
 * Threading: the registry side (RNSkJsiViewApi) runs on the JS thread, except
 * applyUpdates() which a Reanimated mapper calls on the UI runtime; snapshots
 * replay on the calling thread. Presenting runs on the main thread.
 */
class RNSkView : public std::enable_shared_from_this<RNSkView> {
public:
  RNSkView(std::shared_ptr<RNSkPlatformContext> context,
           std::shared_ptr<RNSkCanvasProvider> canvasProvider)
      : _platformContext(std::move(context)),
        _canvasProvider(std::move(canvasProvider)),
        _producer(std::make_shared<RNSkGraphiteProducer>()) {
    // A new surface or a new size: present again. The platform view owns
    // the provider together with this view, and the destructor clears the
    // callback, so a raw capture is safe.
    _canvasProvider->setRequestRedraw([this]() { requestRedraw(); });
  }

  ~RNSkView() {
    _canvasProvider->setRequestRedraw(nullptr);
    std::shared_ptr<RNSkGraphiteTarget> target;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = std::move(_target);
    }
    if (target) {
      target->detach(_canvasProvider);
    }
  }

  // Registry side ------------------------------------------------------------

  /**
   Binds the view to its id. The target recording for this id (created by
   whichever side came first, see RNSkGraphiteTargetRegistry) is attached to
   the view's surface, and frames recorded before the view existed are
   presented now.
   */
  void setNativeId(size_t nativeId) {
    _nativeId = nativeId;
    std::shared_ptr<RNSkGraphiteTarget> previous;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_target && _targetId == nativeId) {
        return;
      }
      previous = std::move(_target);
      _targetId = nativeId;
      _target = RNSkGraphiteTargetRegistry::getInstance().getOrCreate(
          nativeId, _platformContext);
    }
    if (previous) {
      previous->detach(_canvasProvider);
    }
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    auto context = _platformContext;
    auto scheduleOnMainThread = [weakThis, context]() {
      context->runOnMainThread([weakThis]() {
        if (auto view = weakThis.lock()) {
          view->scheduleFrame();
        }
      });
    };
    auto target = getTarget();
    target->attach(_canvasProvider, scheduleOnMainThread);
    _producer->setTarget(target);
    if (target->hasQueued()) {
      scheduleOnMainThread();
    }
  }

  size_t getNativeId() { return _nativeId; }

  /** Declarative content: the recorder of <Canvas>, or a picture. */
  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) {
    for (auto &prop : props) {
      if (prop.first == "recorder") {
        _producer->setRecorder(
            prop.second.isRecorder() ? prop.second.getRecorder() : nullptr);
      } else if (prop.first == "picture") {
        _producer->setPicture(prop.second.isPicture() ? prop.second.getPicture()
                                                      : nullptr);
      }
    }
  }

  /**
   Reads the shared values on the calling runtime into the recording the
   view owns and schedules a frame. Returns false when there is nothing to
   update: no recording, or one other than recorderId (a stale mapper).
   */
  bool applyUpdates(jsi::Runtime &runtime, double recorderId,
                    const jsi::Array &values) {
    return _producer->applyUpdates(runtime, recorderId, values);
  }

  /**
   Releases the content the view draws without scheduling a frame: the host
   view is torn down. On Android the native view outlives the Java view
   until it is finalized, so the resources go away here rather than with the
   garbage collector.
   */
  void releaseContent() { _producer->clear(); }

  /** Schedules redraw() on the main thread, once. */
  void requestRedraw() {
    if (_redrawRequested.exchange(true)) {
      return;
    }
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    _platformContext->runOnMainThread([weakThis]() {
      if (auto view = weakThis.lock()) {
        if (view->_redrawRequested) {
          view->redraw();
        }
      }
    });
  }

  /**
   Main thread. Presents everything submitted since the last frame; with
   nothing queued, presents the last frame again (a redraw after a resize or
   on a new surface). Without a surface the queue is left alone: the surface
   presents it when it appears.
   */
  void redraw() {
    _redrawRequested = false;
    RNSkGraphiteTargetInfo targetInfo;
    if (!_canvasProvider->getTargetInfo(&targetInfo)) {
      return;
    }
    // Declarative content is recorded again for the surface as it is now.
    const bool frameComing = _producer->requestFrame();
    auto target = getTarget();
    std::shared_ptr<RNSkGraphiteRecording> lastPresented;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      lastPresented = _lastPresented;
    }
    std::vector<std::shared_ptr<RNSkGraphiteRecording>> recordings;
    if (target) {
      recordings = target->takeQueued();
    }
    if (recordings.empty()) {
      // With a frame on its way, the layer keeps showing the last one until
      // it lands: presenting it again would only cost a second present.
      // Otherwise the last frame is presented again, also onto a surface of
      // another size (the view was resized and nothing records for it): the
      // frame then shows at its own size rather than nothing at all.
      if (frameComing || lastPresented == nullptr) {
        return;
      }
      if (present(_canvasProvider, targetInfo, {lastPresented},
                  /* remember= */ true)) {
        _producer->onFramePresented();
      }
      return;
    }
    if (present(_canvasProvider, targetInfo, recordings,
                /* remember= */ true)) {
      _producer->onFramePresented();
    } else if (target) {
      target->requeue(recordings);
    }
  }

  /**
   Renders the view into an offscreen surface: declarative content is
   replayed on the calling thread with the latest values, so the snapshot
   does not wait for a frame; otherwise the current frame is replayed. A
   snapshot is in sRGB whichever color space the view renders in: a frame
   recorded in Display P3 is replayed into a surface in that color space and
   the image is converted.
   */
  sk_sp<SkImage> makeImageSnapshot(SkRect *bounds) {
    if (_producer->hasContent()) {
      auto provider = std::make_shared<RNSkOffscreenCanvasProvider>(
          _platformContext, getScaledWidth(), getScaledHeight());
      if (auto *canvas = provider->getCanvas()) {
        _producer->renderInto(canvas, _platformContext->getPixelDensity());
      }
      return provider->makeSnapshot(bounds);
    }
    auto frame = getLastFrame();
    const bool useP3ColorSpace =
        frame != nullptr && frame->getTarget().useP3ColorSpace;
    auto provider = std::make_shared<RNSkOffscreenCanvasProvider>(
        _platformContext, getScaledWidth(), getScaledHeight(), useP3ColorSpace);
    if (frame != nullptr) {
      renderFrame(provider, frame);
    }
    auto image = provider->makeSnapshot(bounds);
    if (image != nullptr && useP3ColorSpace) {
      // A raster image: converted on the CPU, no recorder involved.
      image = image->makeColorSpace(nullptr, SkColorSpace::MakeSRGB(), {});
    }
    return image;
  }

  /** Width of the surface, in pixels. */
  int getScaledWidth() { return _canvasProvider->getWidth(); }

  /** Height of the surface, in pixels. */
  int getScaledHeight() { return _canvasProvider->getHeight(); }

  // Platform view side -------------------------------------------------------

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
   are waiting, so that the caller keeps its display link armed: also when the
   present failed (the app is in the background), so that the recordings are
   tried again on the next frame rather than left waiting for a redraw.
   Without a surface the queue is left alone: the surface presents it when
   it appears.
   */
  bool presentFrame() {
    auto target = getTarget();
    if (target == nullptr) {
      return false;
    }
    RNSkGraphiteTargetInfo targetInfo;
    if (!_canvasProvider->getTargetInfo(&targetInfo)) {
      return false;
    }
    auto recordings = target->takeQueued();
    if (recordings.empty()) {
      return false;
    }
    if (!present(_canvasProvider, targetInfo, recordings,
                 /* remember= */ true)) {
      target->requeue(recordings);
      return true;
    }
    _producer->onFramePresented();
    return target->hasQueued();
  }

  bool hasQueuedRecordings() {
    auto target = getTarget();
    return target && target->hasQueued();
  }

  std::shared_ptr<RNSkCanvasProvider> getCanvasProvider() {
    return _canvasProvider;
  }

  std::shared_ptr<RNSkPlatformContext> getPlatformContext() {
    return _platformContext;
  }

private:
  std::shared_ptr<RNSkGraphiteTarget> getTarget() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _target;
  }

  /** The frame on screen, or the one about to be, if any. Any thread. */
  std::shared_ptr<RNSkGraphiteRecording> getLastFrame() {
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
    return recording;
  }

  /** Replays a frame onto another provider (a snapshot surface). Any thread. */
  bool renderFrame(const std::shared_ptr<RNSkCanvasProvider> &provider,
                   const std::shared_ptr<RNSkGraphiteRecording> &recording) {
    RNSkGraphiteTargetInfo targetInfo;
    if (!provider->getTargetInfo(&targetInfo)) {
      return false;
    }
    return present(provider, targetInfo, {recording}, /* remember= */ false);
  }

  /**
   Replays the recordings onto the provider's target, in order, and remembers
   the last one for the next redraw when asked to (not for a snapshot).
   Returns false when the provider could not present (no surface, app in the
   background), in which case the caller keeps the recordings.
   */
  bool
  present(const std::shared_ptr<RNSkCanvasProvider> &provider,
          const RNSkGraphiteTargetInfo &targetInfo,
          const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings,
          bool remember) {
    // Recordings of the target's size and color space are replayed straight
    // onto it, as one batch; any other goes through a texture of its own.
    std::vector<skgpu::graphite::Recording *> batch;
    std::shared_ptr<RNSkGraphiteRecording> last;
    bool success = true;
    auto flush = [&]() {
      if (!batch.empty()) {
        success = provider->presentRecordings(batch) && success;
        batch.clear();
      }
    };
    for (const auto &recording : recordings) {
      // A recording made for another format (recorded before the surface
      // existed, with a bit depth the surface did not get) cannot be
      // replayed onto this one.
      if (!recording->hasFormatOf(targetInfo)) {
        RNSkLogger::logToConsole("SkiaView: skipping a recording made for a "
                                 "different surface format");
        continue;
      }
      if (recording->hasSizeOf(targetInfo) &&
          recording->hasColorSpaceOf(targetInfo)) {
        batch.push_back(recording->get());
        last = recording;
        continue;
      }
      flush();
      if (presentThroughTexture(provider, recording)) {
        last = recording;
      } else {
        success = false;
      }
    }
    flush();
    if (last == nullptr) {
      // Nothing presentable: the recordings are consumed, not kept.
      return true;
    }
    if (success && remember) {
      std::lock_guard<std::mutex> lock(_mutex);
      _lastPresented = last;
    }
    return success;
  }

  /**
   Presents a recording made for another size than the target's: the size
   JS measured before the surface existed can be a pixel off (the platform
   rounds the layout to pixels on its own terms), and the view may have been
   resized since. The recording is replayed into a texture of its own size
   and that texture is drawn onto the target, so the frame shows rather than
   being dropped; the copy only happens while the sizes differ. The same goes
   for a recording made in another color space than the target's: the
   texture is in the color space of the recording, and drawing it converts
   the colors.
   */
  bool presentThroughTexture(
      const std::shared_ptr<RNSkCanvasProvider> &provider,
      const std::shared_ptr<RNSkGraphiteRecording> &recording) {
    const auto &size = recording->getTarget();
    auto intermediate = std::make_shared<RNSkOffscreenCanvasProvider>(
        _platformContext, size.width, size.height, size.useP3ColorSpace);
    RNSkGraphiteTargetInfo info;
    if (!intermediate->getTargetInfo(&info) ||
        !recording->isCompatibleWith(info)) {
      // No texture of that size and format: the frame is consumed.
      RNSkLogger::logToConsole("SkiaView: skipping a %dx%d recording, the "
                               "surface is %dx%d",
                               size.width, size.height, provider->getWidth(),
                               provider->getHeight());
      return true;
    }
    if (!intermediate->presentRecordings({recording->get()})) {
      return false;
    }
    auto image = intermediate->makeImage();
    if (image == nullptr) {
      return false;
    }
    return provider->presentImage(image);
  }

  std::shared_ptr<RNSkPlatformContext> _platformContext;
  std::shared_ptr<RNSkCanvasProvider> _canvasProvider;
  std::shared_ptr<RNSkGraphiteProducer> _producer;
  size_t _nativeId = 0;
  std::function<void()> _frameScheduler;
  std::atomic<bool> _redrawRequested = {false};

  // The target is bound on the JS thread and read on the main thread and by
  // snapshots; the last presented frame is written by the main thread and
  // read by snapshots.
  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  size_t _targetId = 0;
  std::shared_ptr<RNSkGraphiteRecording> _lastPresented;
};

} // namespace RNSkia
