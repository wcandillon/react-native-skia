#pragma once

#include <memory>
#include <string>
#include <thread>
#include <vector>

#include "RNSkOpenGLCanvasProvider.h"
#include "WebGPUTriangle.h"
#include <android/native_window.h>

namespace RNSkia {

class RNSkBaseAndroidView {
public:
  void *_window;
  virtual void surfaceAvailable(jobject surface, int width, int height) = 0;

  virtual void surfaceDestroyed() = 0;

  virtual void surfaceSizeChanged(int width, int height) = 0;

  virtual float getPixelDensity() = 0;

  virtual void updateTouchPoints(jni::JArrayDouble touches) = 0;

  virtual void setMode(std::string mode) = 0;

  virtual void setShowDebugInfo(bool show) = 0;

  virtual void viewDidUnmount() = 0;

  virtual std::shared_ptr<RNSkView> getSkiaView() = 0;
};

template <typename T>
class RNSkAndroidView : public T, public RNSkBaseAndroidView {
public:
  explicit RNSkAndroidView(std::shared_ptr<RNSkia::RNSkPlatformContext> context)
      : T(context,
          std::make_shared<RNSkOpenGLCanvasProvider>(
              std::bind(&RNSkia::RNSkView::requestRedraw, this), context)) {}

  void surfaceAvailable(jobject surface, int width, int height) override {
    JNIEnv *env = facebook::jni::Environment::current();
    _window = ANativeWindow_fromSurface(env, surface);
  }

  void surfaceDestroyed() override {
    std::static_pointer_cast<RNSkOpenGLCanvasProvider>(T::getCanvasProvider())
        ->surfaceDestroyed();
  }

  void surfaceSizeChanged(int width, int height) override {
    // std::static_pointer_cast<RNSkOpenGLCanvasProvider>(T::getCanvasProvider())
    //     ->surfaceSizeChanged(width, height);
    // // This is only need for the first time to frame, this renderImmediate
    // call
    // // will invoke updateTexImage for the previous frame
    // RNSkView::renderImmediate();
    // T::getPlatformContext()->setOnNotifyDrawLoop([this]() {
    //   // On Android we delegate all rendering to a separate thread
    //   runOnRenderThread([&]() { this->notifyDrawLoop(false); });
    // });
    // runTriangleDemo(_window, width, height);
    auto nativeId = getSkiaView()->getNativeId();
    T::getPlatformContext()->registerSurfaceDescriptor(nativeId, _window, width,
                                                       height);
    // RNSkLogger::logToConsole("Surface size changed: %d, %d",
    // isVulkanSupported());
    //  runTriangleDemo(_window, width, height);
  }

  float getPixelDensity() override {
    return T::getPlatformContext()->getPixelDensity();
  }

  void setMode(std::string mode) override {
    if (mode.compare("continuous") == 0) {
      T::setDrawingMode(RNSkDrawingMode::Continuous);
    } else {
      T::setDrawingMode(RNSkDrawingMode::Default);
    }
  }

  void setShowDebugInfo(bool show) override { T::setShowDebugOverlays(show); }

  void viewDidUnmount() override { T::endDrawingLoop(); }

  void updateTouchPoints(jni::JArrayDouble touches) override {
    // Create touch points
    std::vector<RNSkia::RNSkTouchInfo> points;
    auto pin = touches.pin();
    auto scale = getPixelDensity();
    points.reserve(pin.size() / 5);
    for (size_t i = 0; i < pin.size(); i += 5) {
      RNSkTouchInfo point;
      point.x = pin[i] / scale;
      point.y = pin[i + 1] / scale;
      point.force = pin[i + 2];
      point.type = (RNSkia::RNSkTouchInfo::TouchType)pin[i + 3];
      point.id = pin[i + 4];
      points.push_back(point);
    }
    T::updateTouchState(points);
  }

  std::shared_ptr<RNSkView> getSkiaView() override {
    return T::shared_from_this();
  }
};
} // namespace RNSkia
