
#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "RNSkPlatformContext.h"
#include "jsi/ViewProperty.h"

#include "api/JsiSkImage.h"
#include "api/JsiSkPoint.h"
#include "api/JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkSurface.h"

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#include "RNDawnUtils.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/TextureInfo.h"
#include "include/gpu/graphite/dawn/DawnGraphiteTypes.h"
#endif

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

#if defined(SK_GRAPHITE)
/**
 * Describes the texture a Graphite recording is replayed onto: the pixel size
 * and the format of a window (or offscreen) surface. A deferred canvas is
 * recorded against this description, so it can be created before the surface
 * itself exists.
 */
struct RNSkGraphiteTargetInfo {
  int width = 0;
  int height = 0;
  SkColorType colorType = kUnknown_SkColorType;
  skgpu::graphite::TextureInfo textureInfo;
};
#endif

class RNSkCanvasProvider {
public:
  explicit RNSkCanvasProvider(std::function<void()> requestRedraw)
      : _requestRedraw(requestRedraw) {}

  virtual ~RNSkCanvasProvider() = default;

#if defined(SK_GRAPHITE)
  /**
   Describes the current target texture. Safe to call from any thread;
   returns false while there is no surface to describe.
   */
  virtual bool getGraphiteTargetInfo(RNSkGraphiteTargetInfo *info) {
    return false;
  }

  /**
   Replays the recordings, in order, onto the target texture and presents
   it. Called on the thread that owns the surface.
   */
  virtual bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) {
    return false;
  }
#endif

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

protected:
  std::function<void()> _requestRedraw;
};

class RNSkRenderer {
public:
  explicit RNSkRenderer(std::function<void()> requestRedraw)
      : _requestRedraw(std::move(requestRedraw)), _showDebugOverlays(false) {}

  virtual void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) = 0;

  void setShowDebugOverlays(bool showDebugOverlays) {
    _showDebugOverlays = showDebugOverlays;
  }
  bool getShowDebugOverlays() const { return _showDebugOverlays; }

protected:
  std::function<void()> _requestRedraw;
  bool _showDebugOverlays;
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

#if defined(SK_GRAPHITE)
  bool getGraphiteTargetInfo(RNSkGraphiteTargetInfo *info) override {
    if (_surface == nullptr || _surface->recorder() == nullptr) {
      return false;
    }
    // Graphite gives its render targets the sampled+renderable usage, a
    // superset of what a deferred canvas asks for.
    auto colorType = _surface->imageInfo().colorType();
    info->width = _width;
    info->height = _height;
    info->colorType = colorType;
    info->textureInfo = skgpu::graphite::TextureInfos::MakeDawn(
        skgpu::graphite::DawnTextureInfo(
            skgpu::graphite::SampleCount::k1, skgpu::Mipmapped::kNo,
            DawnUtils::textureFormatForColorType(colorType),
            DawnUtils::DefaultTargetUsage, wgpu::TextureAspect::All));
    return true;
  }

  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) override {
    if (_surface == nullptr || _surface->recorder() == nullptr) {
      return false;
    }
    return DawnContext::getInstance().insertRecordings(recordings,
                                                       _surface.get());
  }
#endif

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
      std::unordered_map<std::string, RNJsi::ViewProperty> &props,
      bool requestRecorderRedraw = true) = 0;

  void requestRedraw() {
    if (!_redrawRequested) {
      _redrawRequested = true;
      // Capture a weak pointer to this
      auto weakThis = std::weak_ptr<RNSkView>(shared_from_this());

      _platformContext->runOnMainThread([weakThis]() {
        // Try to lock the weak pointer
        if (auto strongThis = weakThis.lock()) {
          // Only proceed if the object still exists
          if (strongThis->_renderer && strongThis->_redrawRequested) {
            strongThis->_renderer->renderImmediate(strongThis->_canvasProvider);
            strongThis->_redrawRequested = false;
          }
        }
      });
    }
  }

  void redraw() {
    _renderer->renderImmediate(_canvasProvider);
    _redrawRequested = false;
  }

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
  std::shared_ptr<RNSkPlatformContext> _platformContext;
  std::shared_ptr<RNSkCanvasProvider> _canvasProvider;
  std::shared_ptr<RNSkRenderer> _renderer;

  size_t _nativeId;

  std::atomic<bool> _redrawRequested = {false};
};

} // namespace RNSkia
