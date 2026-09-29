#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

#include <jsi/jsi.h>

#include "RNSkPlatformContext.h"
#include "RNSkView.h"
#include "jsi/ViewProperty.h"
#include "utils/RNSkLog.h"

#if defined(SK_GRAPHITE)

#include "RNDawnContext.h"
#include "RNSkDeferredTarget.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorSpace.h"
#include "include/core/SkImage.h"
#include "include/core/SkSurface.h"
#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * Renderer of a view that never draws: it holds the Recording to present next
 * (at most one, later ones replace earlier ones within a vsync) and the last
 * Recording that was presented, so the frame can be shown again when the
 * platform needs it (drawRect, foregrounding, a surface recreated with the
 * same target).
 */
class RNSkRecordingRenderer : public RNSkRenderer {
public:
  RNSkRecordingRenderer(std::function<void()> requestRedraw,
                        std::function<void()> onTargetMismatch)
      : RNSkRenderer(std::move(requestRedraw)),
        _onTargetMismatch(std::move(onTargetMismatch)) {}

  virtual ~RNSkRecordingRenderer() = default;

  void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) override {
    std::shared_ptr<RNSkDeferredRecording> recording;
    bool isPending = false;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_pending) {
        recording = std::move(_pending);
        isPending = true;
      } else {
        recording = _last;
      }
    }
    if (!recording) {
      return;
    }
    auto target = canvasProvider->getDeferredTarget();
    if (!target) {
      // No surface yet (Android before surfaceAvailable): keep the frame for
      // when the surface appears.
      if (isPending) {
        std::lock_guard<std::mutex> lock(_mutex);
        if (!_pending) {
          _pending = std::move(recording);
        }
      }
      return;
    }
    if (!recording->target) {
      RNSkLogger::logToConsole(
          "SkiaRecordingView: the recording has no deferred target (snap() "
          "was called without makeDeferredCanvas()); dropping it");
      forget(recording);
      return;
    }
    if (*recording->target != *target) {
      logMismatchOnce(*recording->target, *target);
      // Neither a stale pending frame nor a stale last frame can be shown on
      // this target: forget them and make sure the producer learns the new
      // target.
      forget(recording);
      _onTargetMismatch();
      return;
    }
    if (canvasProvider->presentRecording(recording->recording.get())) {
      notePresented();
      std::lock_guard<std::mutex> lock(_mutex);
      _last = std::move(recording);
    }
  }

  /**
   * Presents `recording` right away on the calling thread (any thread with a
   * Recorder; the swapchain and the Graphite context are thread-safe), so
   * the main thread is not involved. Used by the benchmark producer; the
   * regular path is setRecording() + requestRedraw().
   */
  bool presentNow(const std::shared_ptr<RNSkCanvasProvider> &canvasProvider,
                  std::shared_ptr<RNSkDeferredRecording> recording) {
    auto target = canvasProvider->getDeferredTarget();
    if (!target || !recording->target || *recording->target != *target) {
      return false;
    }
    if (!canvasProvider->presentRecording(recording->recording.get())) {
      return false;
    }
    notePresented();
    std::lock_guard<std::mutex> lock(_mutex);
    _last = std::move(recording);
    return true;
  }

  /**
   * presentNow in steps, so several views share one DawnContext::submit():
   * insertNow() for each, submit, presentInsertedNow() for each. insertNow
   * returns false when the provider cannot split the present (use
   * presentNow) or the recording does not match the target.
   */
  bool insertNow(const std::shared_ptr<RNSkCanvasProvider> &canvasProvider,
                 std::shared_ptr<RNSkDeferredRecording> recording) {
    auto target = canvasProvider->getDeferredTarget();
    if (!target || !recording->target || *recording->target != *target) {
      return false;
    }
    if (!canvasProvider->insertRecording(recording->recording.get())) {
      return false;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    _inserted = std::move(recording);
    return true;
  }

  bool presentInsertedNow(
      const std::shared_ptr<RNSkCanvasProvider> &canvasProvider) {
    if (!canvasProvider->presentInserted()) {
      return false;
    }
    notePresented();
    std::lock_guard<std::mutex> lock(_mutex);
    _last = std::move(_inserted);
    return true;
  }

  // Coalesces: a recording that is replaced before the next vsync is
  // released here (and by JS whenever it drops its handle).
  void setRecording(std::shared_ptr<RNSkDeferredRecording> recording) {
    std::lock_guard<std::mutex> lock(_mutex);
    _pending = std::move(recording);
  }

  void clear() {
    std::lock_guard<std::mutex> lock(_mutex);
    _pending.reset();
    _last.reset();
  }

  bool hasPendingFrame() override {
    std::lock_guard<std::mutex> lock(_mutex);
    return _pending != nullptr;
  }

  // The most recent recording: pending if any, otherwise the last presented.
  std::shared_ptr<RNSkDeferredRecording> getLatestRecording() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _pending ? _pending : _last;
  }

private:
  void forget(const std::shared_ptr<RNSkDeferredRecording> &recording) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_last == recording) {
      _last.reset();
    }
  }

  void logMismatchOnce(const RNSkDeferredTarget &recorded,
                       const RNSkDeferredTarget &current) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_loggedMismatchFor && *_loggedMismatchFor == current) {
      return;
    }
    _loggedMismatchFor = current;
    // Once per target change, so cheap enough to keep in release builds.
    RNSkLogger::logToConsole(
        "SkiaRecordingView: dropped a recording made for %dx%d (highBitDepth "
        "%d), the view's target is now %dx%d (highBitDepth %d)",
        recorded.width(), recorded.height(), recorded.highBitDepth ? 1 : 0,
        current.width(), current.height(), current.highBitDepth ? 1 : 0);
  }

  std::function<void()> _onTargetMismatch;
  std::mutex _mutex;
  std::shared_ptr<RNSkDeferredRecording> _pending;
  std::shared_ptr<RNSkDeferredRecording> _last;
  std::shared_ptr<RNSkDeferredRecording> _inserted;
  std::optional<RNSkDeferredTarget> _loggedMismatchFor;
};

class RNSkRecordingView : public RNSkView {
public:
  RNSkRecordingView(std::shared_ptr<RNSkPlatformContext> context,
                    std::shared_ptr<RNSkCanvasProvider> canvasProvider)
      : RNSkView(context, canvasProvider,
                 std::make_shared<RNSkRecordingRenderer>(
                     std::bind(&RNSkRecordingView::requestRedraw, this),
                     std::bind(&RNSkRecordingView::notifyTarget, this))) {}

  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) override {
    for (auto &prop : props) {
      if (prop.first != "recording") {
        continue;
      }
      auto renderer = getRecordingRenderer();
      if (prop.second.isNull()) {
        // The last frame stays on screen: the view has nothing to draw a
        // clear with. The producer sends a cleared recording if it wants one.
        renderer->clear();
        continue;
      }
      if (!prop.second.isRecording()) {
        RNSkLogger::logToConsole("SkiaRecordingView: the \"recording\" "
                                 "property must be a Skia.Context.snap() "
                                 "result");
        continue;
      }
      // No drawing and no submit here: mark a frame pending and let the
      // vsync driver present it.
      renderer->setRecording(prop.second.getRecording());
      requestRedraw();
    }
  }

  /** Presents on the calling thread; see RNSkRecordingRenderer::presentNow. */
  bool presentNow(std::shared_ptr<RNSkDeferredRecording> recording) {
    return getRecordingRenderer()->presentNow(getCanvasProvider(),
                                              std::move(recording));
  }
  bool insertNow(std::shared_ptr<RNSkDeferredRecording> recording) {
    return getRecordingRenderer()->insertNow(getCanvasProvider(),
                                             std::move(recording));
  }
  bool presentInsertedNow() {
    return getRecordingRenderer()->presentInsertedNow(getCanvasProvider());
  }

  void onSurfaceChanged() override { notifyTarget(); }

  /**
   * Registers the platform callback that delivers onTarget to JS. Fires right
   * away if a target is already known so the first event precedes any frame.
   */
  void setOnTargetChanged(
      std::function<void(const RNSkDeferredTarget &)> onTargetChanged) {
    {
      std::lock_guard<std::mutex> lock(_targetMutex);
      _onTargetChanged = std::move(onTargetChanged);
      _reportedTarget.reset();
    }
    notifyTarget();
  }

  std::optional<RNSkDeferredTarget> getTarget() {
    return getCanvasProvider()->getDeferredTarget();
  }

  /**
   * A deferred canvas cannot be read back and there is no picture to replay,
   * so the snapshot re-inserts the latest recording into a private texture
   * that matches the recording's target and reads that back. Works from any
   * thread with a Recorder (the JS thread for SkiaViewApi.makeImageSnapshot).
   */
  sk_sp<SkImage> makeImageSnapshot(SkRect *bounds) override {
    auto recording = getRecordingRenderer()->getLatestRecording();
    if (!recording || !recording->target) {
      // Nothing presented yet: an empty frame of the view's size, like the
      // picture view returns before its first picture.
      auto target = getCanvasProvider()->getDeferredTarget();
      if (!target) {
        return nullptr;
      }
      auto surface = SkSurfaces::Raster(target->imageInfo);
      if (!surface) {
        return nullptr;
      }
      surface->getCanvas()->clear(SK_ColorTRANSPARENT);
      return surface->makeImageSnapshot();
    }
    const auto &target = *recording->target;
    skgpu::graphite::DawnTextureInfo dawnInfo;
    if (!skgpu::graphite::TextureInfos::GetDawnTextureInfo(target.textureInfo,
                                                           &dawnInfo)) {
      return nullptr;
    }
    auto &dawnContext = DawnContext::getInstance();
    wgpu::TextureDescriptor textureDesc;
    textureDesc.label = "SkiaRecordingView snapshot";
    textureDesc.size = {static_cast<uint32_t>(target.width()),
                        static_cast<uint32_t>(target.height()), 1};
    textureDesc.format = dawnInfo.fFormat;
    textureDesc.usage = dawnInfo.fUsage;
    textureDesc.dimension = wgpu::TextureDimension::e2D;
    wgpu::Texture texture =
        dawnContext.getWGPUDevice().CreateTexture(&textureDesc);
    if (!texture) {
      return nullptr;
    }
    auto backendTexture =
        skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
    auto *recorder = dawnContext.getRecorder();
    SkSurfaceProps surfaceProps;
    auto surface = SkSurfaces::WrapBackendTexture(
        recorder, backendTexture, target.imageInfo.colorType(),
        target.imageInfo.refColorSpace(), &surfaceProps);
    if (!surface) {
      return nullptr;
    }
    skgpu::graphite::InsertRecordingInfo info;
    info.fRecording = recording->recording.get();
    info.fTargetSurface = surface.get();
    if (!dawnContext.insertAndSubmit(info)) {
      return nullptr;
    }
    sk_sp<SkImage> image;
    if (bounds != nullptr) {
      auto pd = getPlatformContext()->getPixelDensity();
      SkIRect b =
          SkIRect::MakeXYWH(bounds->x() * pd, bounds->y() * pd,
                            bounds->width() * pd, bounds->height() * pd);
      image = surface->makeImageSnapshot(b);
    } else {
      image = surface->makeImageSnapshot();
    }
    if (!image) {
      return nullptr;
    }
    // The snapshot may have queued a copy on this thread's recorder.
    dawnContext.submitRecording(recorder->snap().get());
    // Synchronous readback: `texture` stays alive until this returns.
    return dawnContext.MakeRasterImage(image);
  }

private:
  std::shared_ptr<RNSkRecordingRenderer> getRecordingRenderer() {
    return std::static_pointer_cast<RNSkRecordingRenderer>(getRenderer());
  }

  // Fires onTarget when the provider's target differs from the last one
  // reported (including the first time one is known).
  void notifyTarget() {
    auto target = getCanvasProvider()->getDeferredTarget();
    if (!target) {
      return;
    }
    std::function<void(const RNSkDeferredTarget &)> callback;
    {
      std::lock_guard<std::mutex> lock(_targetMutex);
      if (_reportedTarget && *_reportedTarget == *target) {
        return;
      }
      _reportedTarget = target;
      callback = _onTargetChanged;
    }
    if (callback) {
      callback(*target);
    }
  }

  std::mutex _targetMutex;
  std::optional<RNSkDeferredTarget> _reportedTarget;
  std::function<void(const RNSkDeferredTarget &)> _onTargetChanged;
};

} // namespace RNSkia

#else // !SK_GRAPHITE

namespace RNSkia {

/**
 * Ganesh build: the view cannot exist. Constructing it (which the platform
 * views do when the component is attached) fails with a clear message.
 */
class RNSkRecordingView : public RNSkView {
public:
  static constexpr const char *kUnavailableMessage =
      "SkiaRecordingView requires the Graphite backend (SK_GRAPHITE); it is "
      "not available in the Ganesh build";

  RNSkRecordingView(std::shared_ptr<RNSkPlatformContext> context,
                    std::shared_ptr<RNSkCanvasProvider> canvasProvider)
      : RNSkView(context, canvasProvider, nullptr) {
    throw std::runtime_error(kUnavailableMessage);
  }

  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) override {}
};

} // namespace RNSkia

#endif // SK_GRAPHITE
