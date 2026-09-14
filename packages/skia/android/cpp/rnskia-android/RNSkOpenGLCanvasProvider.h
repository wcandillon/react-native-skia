#pragma once

#include <fbjni/fbjni.h>

#include <memory>

#include "RNSkView.h"
#include "RNWindowContext.h"

#include <android/native_window.h>

namespace RNSkia {

class RNSkOpenGLCanvasProvider
    : public RNSkia::RNSkCanvasProvider,
      public std::enable_shared_from_this<RNSkOpenGLCanvasProvider> {
public:
  RNSkOpenGLCanvasProvider(
      std::function<void()> requestRedraw,
      std::shared_ptr<RNSkia::RNSkPlatformContext> platformContext);

  virtual ~RNSkOpenGLCanvasProvider();

  int getWidth() override;

  int getHeight() override;

  bool renderToCanvas(const std::function<void(SkCanvas *)> &cb) override;

  void surfaceAvailable(jobject surface, int width, int height, bool opaque,
                        bool highBitDepth);

  void surfaceDestroyed();

  void surfaceSizeChanged(jobject jSurface, int width, int height, bool opaque,
                          bool highBitDepth);

private:
  std::unique_ptr<WindowContext> _surfaceHolder = nullptr;
  std::shared_ptr<RNSkPlatformContext> _platformContext;
  jobject _jSurfaceTexture = nullptr;
  jmethodID _updateTexImageMethod = nullptr;
};
} // namespace RNSkia
