
#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "RNSkPlatformContext.h"
#include "ViewProperty.h"

#include "JsiSkImage.h"
#include "JsiSkPoint.h"
#include "JsiSkRect.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class RNSkCanvasProvider {
public:
  explicit RNSkCanvasProvider(std::function<void()> requestRedraw)
      : _requestRedraw(requestRedraw) {}

  /**
   Returns the scaled width of the view
   */
  virtual float getScaledWidth() = 0;

  /**
   Returns the scaled height of the view
   */
  virtual float getScaledHeight() = 0;

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
  RNSkOffscreenCanvasProvider(std::shared_ptr<RNSkPlatformContext> context,
                              std::function<void()> requestRedraw, float width,
                              float height)
      : RNSkCanvasProvider(requestRedraw), _context(context), _width(width),
        _height(height) {
    _surface = context->makeOffscreenSurface(_width, _height);
    _pd = context->getPixelDensity();
  }

  /**
   Returns a snapshot of the current surface/canvas
   */
  sk_sp<SkImage> makeSnapshot(SkRect *bounds) {
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
    DawnContext::getInstance().submitRecording(
        _surface->recorder()->snap().get());
    return DawnContext::getInstance().MakeRasterImage(image);
#else
    auto grContext = _context->getDirectContext();
    return image->makeRasterImage(grContext);
#endif
  }

  /**
   Returns the scaled width of the view
   */
  float getScaledWidth() override { return _width; };

  /**
   Returns the scaled height of the view
   */
  float getScaledHeight() override { return _height; };

  /**
   Render to a canvas
   */
  bool renderToCanvas(const std::function<void(SkCanvas *)> &cb) override {
    cb(_surface->getCanvas());
    return true;
  };

private:
  float _width;
  float _height;
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
  sk_sp<SkImage> makeImageSnapshot(SkRect *bounds) {

    auto provider = std::make_shared<RNSkOffscreenCanvasProvider>(
        getPlatformContext(), std::bind(&RNSkView::requestRedraw, this),
        _canvasProvider->getScaledWidth(), _canvasProvider->getScaledHeight());

    _renderer->renderImmediate(provider);
    return provider->makeSnapshot(bounds);
  }

  std::shared_ptr<RNSkRenderer> getRenderer() { return _renderer; }

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
