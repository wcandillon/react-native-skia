#pragma once

#include <memory>
#include <string>
#include <vector>

#include "RNSkOpenGLCanvasProvider.h"
#include <android/native_window.h>

namespace RNSkia {

class RNSkBaseAndroidView {
public:
  virtual void surfaceAvailable(jobject surface, int width, int height,
                                float pixelDensity, bool isSurface,
                                bool highBitDepth) = 0;

  virtual void surfaceDestroyed() = 0;

  virtual void surfaceSizeChanged(jobject surface, int width, int height,
                                  float pixelDensity, bool isSurface,
                                  bool highBitDepth) = 0;

  // The density changed while the surface kept its size.
  virtual void setPixelDensity(float pixelDensity) = 0;

  virtual float getPixelDensity() = 0;

  virtual void setShowDebugInfo(bool show) = 0;

  virtual std::shared_ptr<RNSkView> getSkiaView() = 0;
};

template <typename T>
class RNSkAndroidView : public T, public RNSkBaseAndroidView {
public:
  explicit RNSkAndroidView(std::shared_ptr<RNSkia::RNSkPlatformContext> context)
      : T(context,
          std::make_shared<RNSkOpenGLCanvasProvider>(
              std::bind(&RNSkia::RNSkView::requestRedraw, this), context)) {}

  // The density is the one of the layout the surface has the size of: frames
  // drawn into it are scaled by it (see RNSkCanvasProvider::setPixelDensity).
  void surfaceAvailable(jobject surface, int width, int height,
                        float pixelDensity, bool isSurface,
                        bool highBitDepth) override {
    auto provider = std::static_pointer_cast<RNSkOpenGLCanvasProvider>(
        T::getCanvasProvider());
    // Before the surface: it draws as soon as it has one.
    provider->setPixelDensity(pixelDensity);
    provider->surfaceAvailable(surface, width, height, isSurface, highBitDepth);
    RNSkView::redraw();
  }

  void surfaceDestroyed() override {
    std::static_pointer_cast<RNSkOpenGLCanvasProvider>(T::getCanvasProvider())
        ->surfaceDestroyed();
  }

  void surfaceSizeChanged(jobject surface, int width, int height,
                          float pixelDensity, bool isSurface,
                          bool highBitDepth) override {
    auto provider = std::static_pointer_cast<RNSkOpenGLCanvasProvider>(
        T::getCanvasProvider());
    // Before the new size: the surface redraws as soon as it has it.
    provider->setPixelDensity(pixelDensity);
    provider->surfaceSizeChanged(surface, width, height, isSurface,
                                 highBitDepth);
    // Paint the new size right away rather than on the next scheduled redraw.
    RNSkView::redraw();
  }

  void setPixelDensity(float pixelDensity) override {
    T::getCanvasProvider()->setPixelDensity(pixelDensity);
    RNSkView::requestRedraw();
  }

  float getPixelDensity() override { return RNSkView::getPixelDensity(); }

  void setShowDebugInfo(bool show) override { T::setShowDebugOverlays(show); }

  std::shared_ptr<RNSkView> getSkiaView() override {
    return T::shared_from_this();
  }
};
} // namespace RNSkia
