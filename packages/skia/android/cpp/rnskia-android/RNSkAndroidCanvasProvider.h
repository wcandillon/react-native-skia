#pragma once

#include <fbjni/fbjni.h>

#include <memory>
#include <mutex>
#include <vector>

#include "RNSkCanvasProvider.h"
#include "RNSkPlatformContext.h"
#include "RNWindowContext.h"

#include <android/native_window.h>

namespace RNSkia {

/**
 * The ANativeWindow a SkiaView presents into: the Surface of a SurfaceView or
 * a Surface created over the SurfaceTexture of a TextureView, configured as a
 * Dawn surface (see DawnWindowContext).
 */
class RNSkAndroidCanvasProvider : public RNSkCanvasProvider {
public:
  explicit RNSkAndroidCanvasProvider(
      std::shared_ptr<RNSkPlatformContext> platformContext);

  virtual ~RNSkAndroidCanvasProvider();

  int getWidth() override;

  int getHeight() override;

  bool getTargetInfo(RNSkGraphiteTargetInfo *info) override;

  bool getLayoutSize(int *width, int *height) override;

  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) override;

  bool presentImage(const sk_sp<SkImage> &image) override;

  /**
   The pixel size the backing view was laid out with. The surface it gets
   (SurfaceView or TextureView) has exactly this size, so a frame recorded
   before the surface exists already matches it. Main thread.
   */
  void setLayoutSize(int width, int height);

  void surfaceAvailable(jobject surface, int width, int height, bool isSurface,
                        bool highBitDepth);

  void surfaceDestroyed();

  void surfaceSizeChanged(jobject jSurface, int width, int height,
                          bool isSurface, bool highBitDepth);

private:
  // Takes the ANativeWindow behind an android.view.Surface (SurfaceView) or a
  // SurfaceTexture (TextureView), keeping the Java references the window
  // needs. Returns nullptr if the window could not be acquired.
  ANativeWindow *acquireWindow(jobject surface, bool isSurface);
  // Gives back what acquireWindow() took. Call after the window context that
  // draws into the window is gone.
  void releaseWindow();
  // Copies the window's target description where any thread can read it.
  void updateTargetInfo();

  std::unique_ptr<WindowContext> _surfaceHolder = nullptr;
  std::shared_ptr<RNSkPlatformContext> _platformContext;
  ANativeWindow *_window = nullptr;
  // The Surface created over a TextureView's SurfaceTexture; it lives as long
  // as the window and is released with it (a SurfaceView's Surface is owned by
  // the view).
  jobject _jSurface = nullptr;
  std::mutex _targetInfoMutex;
  RNSkGraphiteTargetInfo _targetInfo;
  bool _hasTargetInfo = false;
  int _layoutWidth = 0;
  int _layoutHeight = 0;
};
} // namespace RNSkia
