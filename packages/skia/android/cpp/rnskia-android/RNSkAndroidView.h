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
                                bool opaque) = 0;

  virtual void surfaceDestroyed() = 0;

  virtual void surfaceSizeChanged(jobject surface, int width, int height,
                                  bool opaque) = 0;

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

  void surfaceAvailable(jobject surface, int width, int height,
                        bool opaque) override {
    std::static_pointer_cast<RNSkOpenGLCanvasProvider>(T::getCanvasProvider())
        ->surfaceAvailable(surface, width, height, opaque);
    RNSkView::redraw();
  }

  void surfaceDestroyed() override {
    std::static_pointer_cast<RNSkOpenGLCanvasProvider>(T::getCanvasProvider())
        ->surfaceDestroyed();
  }

  void surfaceSizeChanged(jobject surface, int width, int height,
                          bool opaque) override {
    std::static_pointer_cast<RNSkOpenGLCanvasProvider>(T::getCanvasProvider())
        ->surfaceSizeChanged(surface, width, height, opaque);
    // This is only need for the first time to frame, this renderImmediate call
    // will invoke updateTexImage for the previous frame
    RNSkView::redraw();
  }

  float getPixelDensity() override {
    return T::getPlatformContext()->getPixelDensity();
  }

  void setShowDebugInfo(bool show) override { T::setShowDebugOverlays(show); }

  std::shared_ptr<RNSkView> getSkiaView() override {
    return T::shared_from_this();
  }
};
} // namespace RNSkia
