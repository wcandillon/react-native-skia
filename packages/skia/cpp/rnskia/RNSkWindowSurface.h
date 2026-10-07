#pragma once

#include <chrono>
#include <functional>
#include <mutex>
#include <utility>
#include <vector>

#include "RNSkGraphiteTargetInfo.h"
#include "RNSkSurface.h"

#include "webgpu/webgpu_cpp.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorType.h"
#include "include/core/SkImage.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * The window a platform view presents into: a CAMetalLayer on Apple
 * platforms, an ANativeWindow on Android, configured as a Dawn surface. The
 * platform view only acquires the native handle and forwards its lifecycle
 * (attach, resize, detach); everything else lives here.
 *
 * Threading: the window is attached, resized, detached and presented on the
 * main thread. The description of its target texture is kept in a copy of
 * its own, so that whoever records for the view (the JS thread, a worklet
 * runtime, the render thread pool) can read it from any thread, also before
 * the window exists (see getLayoutSize).
 */
class RNSkWindowSurface final : public RNSkSurface {
public:
  /**
   Gives back the native handle attach() was given, once the Dawn surface
   over it is gone. Called from detach() or the destructor, so on any thread.
   */
  using Releaser = std::function<void(void *nativeHandle)>;

  RNSkWindowSurface() = default;

  ~RNSkWindowSurface() override;

  RNSkWindowSurface(const RNSkWindowSurface &) = delete;
  RNSkWindowSurface &operator=(const RNSkWindowSurface &) = delete;

  /**
   Configures the native window (a CAMetalLayer or an ANativeWindow) as the
   Dawn surface of this view, at the given size in pixels. A window already
   attached is detached first. highBitDepth asks for the 16-bit float (Apple)
   or 10-bit (Android) format, granted when the surface supports it;
   useP3ColorSpace renders in Display P3 rather than sRGB. The releaser, if
   any, gives the handle back when the window is detached. Requests a redraw.
   */
  void attach(void *nativeHandle, int width, int height, bool highBitDepth,
              bool useP3ColorSpace, Releaser releaser);

  /** Reconfigures the surface for a new size, in pixels. Requests a redraw. */
  void resize(int width, int height);

  /**
   Destroys the Dawn surface and gives the native handle back to its
   releaser. The target description goes away with it; the layout size stays.
   */
  void detach();

  /** Whether a window is attached. Main thread. */
  bool isAttached() const { return _surface != nullptr; }

  /**
   The pixel size the platform laid the view out with, which the window gets
   when it appears. Any thread.
   */
  void setLayoutSize(int width, int height);

  /**
   The size in pixels the surface will have, known from the platform layout
   before the surface itself exists (on Android the surface only appears a
   frame after the view is laid out). Safe to call from any thread; returns
   false until the view is laid out. A frame recorded against this size is
   presented as is once the surface appears, where one recorded against a
   size derived from the layout in points could be off by a pixel and would
   not cover the surface.
   */
  bool getLayoutSize(int *width, int *height);

  /**
   Installed by the view owning the surface: asks it for a frame when the
   window appears or changes size, and when a present was declined so that
   it is tried again (the app coming back to the foreground).
   */
  void setRequestRedraw(std::function<void()> requestRedraw) {
    _requestRedraw = std::move(requestRedraw);
  }

  /**
   Installed by the platform view: whether the window can show a frame right
   now. Presenting is declined while it returns false, and a redraw is
   requested instead. Without one, an attached window always can.
   */
  void setCanPresent(std::function<bool()> canPresent) {
    _canPresent = std::move(canPresent);
  }

  // RNSkSurface -------------------------------------------------------------

  /** Width of the window, in pixels; 0 without a window. Any thread. */
  int getWidth() override;

  /** Height of the window, in pixels; 0 without a window. Any thread. */
  int getHeight() override;

  bool getTargetInfo(RNSkGraphiteTargetInfo *info) override;

  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) override;

  bool presentImage(const sk_sp<SkImage> &image) override;

private:
  // Configures the swapchain for the current size, format and usage.
  void configureSurface();
  // Copies the window's target description where any thread can read it.
  void updateTargetInfo();
  // Graphite needs more than RenderAttachment on the swapchain texture:
  // TextureBinding so a render pass can reload the existing contents through
  // LoadOp::ExpandResolveTexture (any backdrop filter or mid-frame readback
  // splits the pass), and CopySrc for copy tasks. Only request what the
  // surface reports as supported.
  wgpu::TextureUsage supportedSurfaceUsage();
  bool surfaceSupportsFormat(wgpu::TextureFormat format);
  // The texture description a deferred canvas must be recorded with to be
  // replayed onto this window.
  skgpu::graphite::TextureInfo getTextureInfo() const;
  bool canPresent();
  void requestRedraw() {
    if (_requestRedraw) {
      _requestRedraw();
    }
  }

  wgpu::Device _device;
  wgpu::Surface _surface;
  // The recorder of the thread the window is attached on (the main thread):
  // presentImage() draws on it, presentRecordings() only wraps the swapchain
  // texture for it.
  skgpu::graphite::Recorder *_recorder = nullptr;
  std::chrono::steady_clock::time_point _lastRecorderCleanup;
  void *_nativeHandle = nullptr;
  Releaser _releaser;
  int _width = 0;
  int _height = 0;
  wgpu::TextureFormat _format = wgpu::TextureFormat::Undefined;
  wgpu::TextureUsage _usage = wgpu::TextureUsage::RenderAttachment;
  SkColorType _colorType = kUnknown_SkColorType;
  bool _useP3ColorSpace = false;

  // A copy of the window's target description, readable from any thread
  // while the window itself belongs to the main thread.
  std::mutex _targetInfoMutex;
  RNSkGraphiteTargetInfo _targetInfo;
  bool _hasTargetInfo = false;
  int _layoutWidth = 0;
  int _layoutHeight = 0;

  std::function<void()> _requestRedraw;
  std::function<bool()> _canPresent;
};

} // namespace RNSkia
