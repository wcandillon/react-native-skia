#pragma once

#include <fbjni/fbjni.h>

#include <memory>
#include <mutex>

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

#if defined(SK_GRAPHITE)
  std::optional<RNSkDeferredTarget> getDeferredTarget() override;

  bool presentRecording(skgpu::graphite::Recording *recording) override;
  bool insertRecording(skgpu::graphite::Recording *recording) override;
  bool presentInserted() override;
#endif

  void surfaceAvailable(jobject surface, int width, int height, bool opaque,
                        bool highBitDepth);

  void surfaceDestroyed();

private:
  void consumePreviousFrame();

public:

  void surfaceSizeChanged(jobject jSurface, int width, int height, bool opaque,
                          bool highBitDepth);

private:
  // Presents may run on a producer thread while the platform destroys or
  // recreates the surface on the main thread: every use of the holder, and
  // its replacement, is under this lock (a present in flight finishes first).
  std::recursive_mutex _surfaceMutex;
  std::unique_ptr<WindowContext> _surfaceHolder = nullptr;
  std::shared_ptr<RNSkPlatformContext> _platformContext;
  jobject _jSurfaceTexture = nullptr;
  jmethodID _updateTexImageMethod = nullptr;
};
} // namespace RNSkia
