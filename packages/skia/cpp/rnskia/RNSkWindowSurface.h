#pragma once

#include <atomic>
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
 * Threading: the window is attached, resized and detached on the main
 * thread, and presented on the thread the view presents on (see
 * RNSkView::setPresentThread): the main thread too, or a thread of its own.
 * A mutex keeps the two apart: the window is never reconfigured or released
 * under a present, and detaching waits for the present in flight before it
 * lets go of the window, so that the platform may destroy it right after.
 * A resize does not wait: it notes the size, which the presenting thread
 * takes by its next present (see takePendingSizeLocked), and the swapchain
 * is configured for it there (see configureIfNeededLocked), not on the main
 * thread as the window attaches or resizes: a Vulkan swapchain is made again
 * for every size (about 5 ms on a Pixel 8), which inside the layout would
 * hold up the traversal, and the presenting thread with it, by that much on
 * every frame of a view animated in size.
 * A present is made for the target the presenting thread read before it took
 * the mutex; under it, the window checks that it still is that target, and
 * declines a present made for a window resized since (see
 * presentRecordings). The description of the target texture is kept in a
 * copy of its own, so
 * that whoever records for the view (the JS thread, a worklet runtime, the
 * render thread pool) can read it from any thread, also before the window
 * exists (see getLayoutSize).
 *
 * Locks, innermost last: the list of windows (see releaseSurfacesOn), a
 * window's own mutex, the GPU context's (DawnContext). A thread never holds
 * two windows' mutexes at once: windows may present on different threads
 * (every Android canvas shares one, Apple views present on the main thread).
 */
class RNSkWindowSurface final : public RNSkSurface {
public:
  /**
   Gives back the native handle attach() was given, once the Dawn surface
   over it is gone. Called from detach() or the destructor, so on any thread.
   */
  using Releaser = std::function<void(void *nativeHandle)>;

  RNSkWindowSurface();

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
   Main thread.
   */
  void attach(void *nativeHandle, int width, int height, bool highBitDepth,
              bool useP3ColorSpace, Releaser releaser);

  /**
   Takes note of a new size, in pixels: what frames are recorded for from
   now (see getTargetInfo), and what the window is configured for by the
   first present of a frame made for it, on the presenting thread (see
   isTargetLocked); until then the window still takes frames made for its
   previous size, which the platform stretches to the view. Requests a
   redraw. Main thread; never waits for the presenting thread.
   */
  void resize(int width, int height);

  /**
   Destroys the Dawn surface and gives the native handle back to its
   releaser, once the present in flight, if any, is done: the platform may
   destroy the window right after. The target description goes away with
   it; the layout size stays. Main thread, or the destructor.
   */
  void detach();

  /**
   Whether a window is attached. Its Dawn surface may be away for a frame
   while the GPU device is replaced (see ensureDeviceLocked). Any thread.
   */
  bool isAttached();

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
   The bit depth the platform view will attach the window with, known before
   it does: on Android the one of the backing view, chosen when the canvas
   mounts (see SkiaView.updateView); on Apple platforms the prop. Any thread.
   */
  void setHighBitDepth(bool highBitDepth);

  /**
   Whether the window renders with more than 8 bits per channel: as it was
   last attached (what the surface granted, which a window keeps), else as the
   platform view said it would be (see setHighBitDepth). Returns false until
   either is known. Any thread.
   */
  bool getHighBitDepth(bool *highBitDepth);

  /**
   Installed by the view owning the surface: asks it for a frame when the
   window appears or changes size. Called from the main thread, with the
   window's mutex held when it appears, so it must not present on the spot:
   the view posts the redraw to the thread it presents on.
   */
  void setRequestRedraw(std::function<void()> requestRedraw) {
    _requestRedraw = std::move(requestRedraw);
  }

  /**
   Installed by the platform view: whether the window can show a frame right
   now (not while the app is in the background). The view presents nothing
   while it returns false, and asks again once told that it can (see
   RNSkView::onCanPresent). Without one, an attached window always can.
   */
  void setCanPresent(std::function<bool()> canPresent) {
    _canPresent = std::move(canPresent);
  }

  /**
   Whether a window is attached and can show a frame right now: not while
   the platform view says it cannot, nor once the GPU device is lost. Any
   thread.
   */
  bool canPresent();

  // RNSkSurface -------------------------------------------------------------

  /** Width of the window, in pixels; 0 without a window. Any thread. */
  int getWidth() override;

  /** Height of the window, in pixels; 0 without a window. Any thread. */
  int getHeight() override;

  bool getTargetInfo(RNSkGraphiteTargetInfo *info) override;

  /**
   Replays the recordings onto the window and presents it, on the thread the
   view presents on; the swapchain texture is wrapped for the recorder of
   that thread. Returns false, consuming nothing, when the window cannot
   present right now: there is none, the app is in the background, the GPU
   device is lost, the window had no drawable, or the window is no longer
   the target given: it was resized, or configured again on a new device,
   since the caller read it (see getTargetInfo), and the recordings chosen
   for that target would not fit it. The redraw the change asked for presents
   onto the window as it is now.
   */
  bool presentRecordings(
      const RNSkGraphiteTargetInfo &target,
      const std::vector<skgpu::graphite::Recording *> &recordings) override;

  /**
   Draws an image at the origin of the window and presents it, on the thread
   the view presents on, with the recorder of that thread. Same target and
   return value as presentRecordings().
   */
  bool presentImage(const RNSkGraphiteTargetInfo &target,
                    const sk_sp<SkImage> &image) override;

private:
  // Lets go of the Dawn surface and the window; see detach(). Called with
  // the mutex held.
  void detachLocked();
  // Whether a window is attached and can show a frame (see canPresent()).
  // Called with the mutex held.
  bool canPresentLocked();
  // Whether the window is the target the caller read (see getTargetInfo):
  // as it is, or as resize() noted it should be (the size is taken then,
  // see takePendingSizeLocked). It is neither when the main thread resized
  // it again, or a device replacement configured it again (see
  // ensureDeviceLocked), between the read and the present. Called with the
  // mutex held.
  bool isTargetLocked(const RNSkGraphiteTargetInfo &target);
  // Lets go of the surfaces made on the GPU device this window was
  // configured on when that device was lost and replaced since (see
  // DawnContext), the window's own included, and destroys the device: the
  // surface cannot follow to the new device (a Vulkan swapchain cannot move
  // to another device, Dawn refuses it), and the VkSurfaceKHR of the old
  // swapchain keeps the window connected until the lost device runs its
  // deferred deletions, which only its destruction does. Dawn does not
  // destroy swapchains with their device, and detaching one afterwards
  // crashes, so every window on that device lets go of its surface first
  // (see releaseSurfacesOn), then the device is destroyed, and the windows
  // get a surface on the new device on their next frame (see
  // ensureDeviceLocked). Called before taking the mutex: the sweep locks
  // each window in turn, this one included.
  void retireReplacedDevice();
  // Lets go of the Dawn surface of every window configured on the given
  // generation (see retireReplacedDevice), one window at a time under its
  // own mutex. Called with no window's mutex held.
  static void releaseSurfacesOn(uint64_t generation);
  // Configures the window on the GPU device in use when it has no surface:
  // when the device it was configured on was lost and replaced since (see
  // retireReplacedDevice), the surface is made again on the new device, the
  // window itself stays. Returns false without a context, without a
  // surface, or with one made for a device replaced since the sweep (the
  // next frame sweeps again). Called with the mutex held.
  bool ensureDeviceLocked();
  // Configures the swapchain for the current size, format and usage. Called
  // with the mutex held.
  void configureSurface();
  // Configures the swapchain when the window attached or resized since it
  // was last configured (see attach, takePendingSizeLocked), on the
  // presenting thread, by the present that follows. Called with the mutex
  // held.
  void configureIfNeededLocked();
  // Takes the size resize() noted, if any: the window's size from now, and
  // the swapchain's by the next present (see configureIfNeededLocked).
  // Called with the mutex held, on the presenting thread.
  void takePendingSizeLocked();
  // Copies the window's target description where any thread can read it.
  // Called with the mutex held.
  void updateTargetInfo();
  // The description of the window's texture as it is now: what getTargetInfo
  // hands out once copied. Called with the mutex held.
  RNSkGraphiteTargetInfo describeLocked() const;
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
  // The Graphite recorder of the calling thread, which presentRecordings()
  // wraps the swapchain texture for and presentImage() draws on; nullptr
  // when none can be made.
  static skgpu::graphite::Recorder *presentRecorder();
  void requestRedraw() {
    if (_requestRedraw) {
      _requestRedraw();
    }
  }

  // Keeps the main thread (attach, resize, detach) and the thread the view
  // presents on apart; see the class comment.
  std::mutex _mutex;
  // The device the window is configured on, and its generation (see
  // DawnContext::generation()): a lost device is replaced, and the window
  // configured again on the new one (see retireReplacedDevice). The surface
  // is null between the two, and while the window is detached; the
  // generation is 0 then, and readable without the mutex, as a hint that a
  // sweep is due.
  wgpu::Device _device;
  std::atomic<uint64_t> _generation{0};
  wgpu::Surface _surface;
  void *_nativeHandle = nullptr;
  Releaser _releaser;
  int _width = 0;
  int _height = 0;
  wgpu::TextureFormat _format = wgpu::TextureFormat::Undefined;
  wgpu::TextureUsage _usage = wgpu::TextureUsage::RenderAttachment;
  // The window attached or resized since the swapchain was configured (see
  // configureIfNeededLocked).
  bool _needsConfigure = false;
  SkColorType _colorType = kUnknown_SkColorType;
  bool _useP3ColorSpace = false;

  // A copy of the window's target description, readable from any thread
  // while the window itself is under the mutex.
  std::mutex _targetInfoMutex;
  RNSkGraphiteTargetInfo _targetInfo;
  bool _hasTargetInfo = false;
  int _layoutWidth = 0;
  int _layoutHeight = 0;
  // The size resize() noted, for the presenting thread to take (see
  // takePendingSizeLocked).
  int _pendingWidth = 0;
  int _pendingHeight = 0;
  bool _hasPendingSize = false;
  // The bit depth the window has, or will have (see getHighBitDepth).
  bool _knownHighBitDepth = false;
  bool _hasKnownHighBitDepth = false;

  std::function<void()> _requestRedraw;
  std::function<bool()> _canPresent;
};

} // namespace RNSkia
