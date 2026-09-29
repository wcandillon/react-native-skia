
#pragma once

#include <array>
#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "RNSkFrameScheduler.h"
#include "RNSkPlatformContext.h"
#include "jsi/ViewProperty.h"

#include "api/JsiSkImage.h"
#include "api/JsiSkPoint.h"
#include "api/JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

#if defined(SK_GRAPHITE)
#include "RNSkDeferredTarget.h"
#endif

namespace RNSkia {

namespace jsi = facebook::jsi;

class RNSkCanvasProvider {
public:
  explicit RNSkCanvasProvider(std::function<void()> requestRedraw)
      : _requestRedraw(requestRedraw) {}

  /**
   Returns the scaled width of the view
   */
  virtual int getWidth() = 0;

  /**
   Returns the scaled height of the view
   */
  virtual int getHeight() = 0;

  /**
   Render to a canvas
   */
  virtual bool renderToCanvas(const std::function<void(SkCanvas *)> &) = 0;

#if defined(SK_GRAPHITE)
  /**
   Thread-safe description of the swapchain texture a Recording must target
   to be presentable by this provider. Empty while there is no surface.
   */
  virtual std::optional<RNSkDeferredTarget> getDeferredTarget() {
    return std::nullopt;
  }

  /**
   Presents a Recording made against getDeferredTarget(): binds the current
   swapchain texture, inserts, submits once and presents. Main thread only.
   */
  virtual bool presentRecording(skgpu::graphite::Recording *recording) {
    return false;
  }

  /**
   presentRecording in steps, so several views can share one submit: bind
   and insert, then DawnContext::submit(), then present. Providers that do
   not support it return false and callers fall back to presentRecording.
   */
  virtual bool insertRecording(skgpu::graphite::Recording *recording) {
    return false;
  }
  virtual bool presentInserted() { return false; }
#endif

protected:
  std::function<void()> _requestRedraw;
};

/**
 Presentation statistics of a view, for benchmarks: how many frames reached
 the screen and when (milliseconds on the same steady clock as
 RNSkRenderer::nowMs, most recent last).
 */
struct RNSkPresentStats {
  uint64_t presented = 0;
  std::vector<double> timestampsMs;
};

class RNSkRenderer {
public:
  static constexpr size_t kPresentHistory = 240;

  explicit RNSkRenderer(std::function<void()> requestRedraw)
      : _requestRedraw(std::move(requestRedraw)), _showDebugOverlays(false) {}

  virtual void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) = 0;

  void setShowDebugOverlays(bool showDebugOverlays) {
    _showDebugOverlays = showDebugOverlays;
  }
  bool getShowDebugOverlays() const { return _showDebugOverlays; }

  /**
   True while a frame handed to the view has not been presented yet. A
   producer can use this as backpressure: recording a new frame now would
   only replace the pending one.
   */
  virtual bool hasPendingFrame() { return false; }

  static double nowMs() {
    return std::chrono::duration<double, std::milli>(
               std::chrono::steady_clock::now().time_since_epoch())
        .count();
  }

  RNSkPresentStats getPresentStats() {
    std::lock_guard<std::mutex> lock(_statsMutex);
    RNSkPresentStats stats;
    stats.presented = _presented;
    size_t count = std::min(_presented, static_cast<uint64_t>(kPresentHistory));
    stats.timestampsMs.reserve(count);
    for (size_t i = 0; i < count; i++) {
      stats.timestampsMs.push_back(
          _timestamps[(_head + kPresentHistory - count + i) % kPresentHistory]);
    }
    return stats;
  }

protected:
  // Called right after a frame was handed to the swapchain.
  void notePresented() {
    std::lock_guard<std::mutex> lock(_statsMutex);
    _timestamps[_head] = nowMs();
    _head = (_head + 1) % kPresentHistory;
    _presented++;
  }

  std::function<void()> _requestRedraw;
  bool _showDebugOverlays;

private:
  std::mutex _statsMutex;
  std::array<double, kPresentHistory> _timestamps{};
  size_t _head = 0;
  uint64_t _presented = 0;
};

class RNSkOffscreenCanvasProvider : public RNSkCanvasProvider {
public:
  RNSkOffscreenCanvasProvider(
      const std::shared_ptr<RNSkPlatformContext> &context,
      std::function<void()> requestRedraw, float width, float height)
      : RNSkCanvasProvider(std::move(requestRedraw)), _width(width),
        _height(height), _context(context) {
    _surface = context->makeOffscreenSurface(_width, _height);
    _pd = context->getPixelDensity();
  }

  virtual ~RNSkOffscreenCanvasProvider() = default;

  /**
   Returns a snapshot of the current surface/canvas
   */
  sk_sp<SkImage> makeSnapshot(SkRect *bounds) {
    if (_surface == nullptr) {
      return nullptr;
    }
    sk_sp<SkImage> image;
    if (bounds != nullptr) {
      SkIRect b =
          SkIRect::MakeXYWH(bounds->x() * _pd, bounds->y() * _pd,
                            bounds->width() * _pd, bounds->height() * _pd);
      image = _surface->makeImageSnapshot(b);
    } else {
      image = _surface->makeImageSnapshot();
    }
#if defined(SK_GRAPHITE)
    // Only Graphite-backed surfaces have a recorder to snap/submit; a raster
    // surface's snapshot is already a valid CPU image.
    if (auto *recorder = _surface->recorder()) {
      DawnContext::getInstance().submitRecording(recorder->snap().get());
    }
    return DawnContext::getInstance().MakeRasterImage(image);
#else
    auto grContext = _context->getDirectContext();
    return image->makeRasterImage(grContext);
#endif
  }

  /**
   Returns the scaled width of the view
   */
  int getWidth() override { return _width; };

  /**
   Returns the scaled height of the view
   */
  int getHeight() override { return _height; };

  /**
   Render to a canvas
   */
  bool renderToCanvas(const std::function<void(SkCanvas *)> &cb) override {
    if (_surface == nullptr) {
      return false;
    }
    cb(_surface->getCanvas());
    return true;
  };

private:
  int _width;
  int _height;
  float _pd = 1.0f;
  sk_sp<SkSurface> _surface;
  std::shared_ptr<RNSkPlatformContext> _context;
};

class RNSkView : public std::enable_shared_from_this<RNSkView> {
public:
  /**
   * Constructor
   */
  RNSkView(std::shared_ptr<RNSkPlatformContext> context,
           std::shared_ptr<RNSkCanvasProvider> canvasProvider,
           std::shared_ptr<RNSkRenderer> renderer)
      : _platformContext(context), _canvasProvider(canvasProvider),
        _renderer(renderer) {}

  /**
   Destructor
   */
  virtual ~RNSkView() {}

  virtual void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) = 0;

  /**
   Asks for the view to be rendered (or, for a recording view, presented) on
   the main thread at the next vsync. Requests within one vsync are coalesced
   so that the swapchain (configured with Fifo) is presented at most once per
   vsync. May be called from any thread.
   */
  void requestRedraw() {
    if (!_redrawRequested.exchange(true)) {
      getFrameScheduler()->requestFrame();
    }
  }

  /**
   Renders synchronously on the calling (main) thread, used when the platform
   needs content right now (drawRect, surface creation).
   */
  void redraw() {
    _redrawRequested = false;
    _renderer->renderImmediate(_canvasProvider);
  }

  /**
   Called by the platform view after the canvas provider's surface was
   created, resized or recreated.
   */
  virtual void onSurfaceChanged() {}

  /**
   Sets the native id of the view
   */
  virtual void setNativeId(size_t nativeId) { _nativeId = nativeId; }

  /**
   Returns the native id
   */
  size_t getNativeId() { return _nativeId; }

  /**
   * Set to true to show the debug overlays on render
   */
  void setShowDebugOverlays(bool show) {
    _renderer->setShowDebugOverlays(show);
    requestRedraw();
  }

  /**
   Renders the view into an SkImage instead of the screen.
   */
  virtual sk_sp<SkImage> makeImageSnapshot(SkRect *bounds) {

    auto provider = std::make_shared<RNSkOffscreenCanvasProvider>(
        getPlatformContext(), std::bind(&RNSkView::requestRedraw, this),
        _canvasProvider->getWidth(), _canvasProvider->getHeight());

    _renderer->renderImmediate(provider);
    return provider->makeSnapshot(bounds);
  }

  std::shared_ptr<RNSkRenderer> getRenderer() { return _renderer; }

  /**
   Returns the scaled width of the view
   */
  int getScaledWidth() { return _canvasProvider->getWidth(); }

  /**
   Returns the scaled height of the view
   */
  int getScaledHeight() { return _canvasProvider->getHeight(); }

protected:
  std::shared_ptr<RNSkPlatformContext> getPlatformContext() {
    return _platformContext;
  }
  std::shared_ptr<RNSkCanvasProvider> getCanvasProvider() {
    return _canvasProvider;
  }

private:
  std::shared_ptr<RNSkFrameScheduler> getFrameScheduler() {
    std::lock_guard<std::mutex> lock(_schedulerMutex);
    if (!_frameScheduler) {
      // The scheduler only holds a weak reference: a view can be released on
      // any thread while a frame is pending.
      auto weakThis = std::weak_ptr<RNSkView>(shared_from_this());
      _frameScheduler = _platformContext->makeFrameScheduler([weakThis]() {
        if (auto strongThis = weakThis.lock()) {
          if (strongThis->_redrawRequested.exchange(false)) {
            strongThis->_renderer->renderImmediate(strongThis->_canvasProvider);
          }
        }
      });
    }
    return _frameScheduler;
  }

  std::shared_ptr<RNSkPlatformContext> _platformContext;
  std::shared_ptr<RNSkCanvasProvider> _canvasProvider;
  std::shared_ptr<RNSkRenderer> _renderer;
  std::shared_ptr<RNSkFrameScheduler> _frameScheduler;
  std::mutex _schedulerMutex;

  size_t _nativeId;

  std::atomic<bool> _redrawRequested = {false};
};

} // namespace RNSkia
