#pragma once

#include <atomic>
#include <functional>
#include <mutex>
#include <utility>
#include <vector>

#include "RNSkGraphiteTargetInfo.h"
#include "RNSkSurface.h"
#include "RNSkWindowState.h"
#include "rnsurface/FrameScheduler.h"
#include "rnsurface/ThreadChecker.h"

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
 * Threading: the window belongs to the thread the view presents on (see
 * RNSkView::setPresentThread): the present thread of the process, one for
 * every canvas (see RNSkPresentThread.h, a rnsurface::RenderThread), where
 * the platform view posts the attach and the detach from the main thread.
 * Everything that touches the Dawn surface runs there, one call after the
 * other, and nothing waits for it; the entries check it once the platform view
 * has bound the thread (see bindPresentingThread and rnsurface::ThreadChecker:
 * an entry from another thread aborts in debug builds and is logged once in
 * release builds). A resize is the exception: it notes a size and posts a
 * redraw, from any thread. Nothing waits for a present: a present holds the
 * window for as long as Graphite takes to replay the frame, which includes
 * compiling the pipelines it needs, seconds on a slow GPU, and a main thread
 * made to wait for that is an ANR (#4394). A resize notes the size, which the
 * present that follows takes (see takePendingSize) and configures the swapchain
 * for (see configureIfNeeded): a Vulkan swapchain is made again for every size
 * (about 5 ms on a Pixel 8), and until a frame for the new size arrives the
 * window still takes frames made for its previous one, which the platform
 * stretches to the view. A present is made for the target the view read before
 * (see getTargetInfo); the window checks that it still is that target, and
 * declines a present made for a window resized since (see presentRecordings).
 * Where a present waits for the GPU to finish the frame presented before
 * (Android, see setAcknowledgement), a frame that comes meanwhile has its work
 * submitted and its present held, for the view to make once the GPU is done
 * (see presentHeldFrame): nothing blocks the thread every canvas presents on.
 * The description of the target texture is kept in a copy of its own, under a
 * mutex, so that whoever records for the view (the JS thread, a worklet
 * runtime, the render thread pool) can read it from any thread, also before the
 * window exists (see getLayoutSize).
 *
 * The windows of a process all present on the same thread, so the sweep over
 * them (see releaseSurfacesOn) runs with no window in use; the list itself
 * is guarded, as windows are made and destroyed on other threads too. Locks,
 * innermost last: the list of windows, the GPU context's (DawnContext); the
 * target description's mutex is leaf and never held across either.
 */
class RNSkWindowSurface final : public RNSkSurface {
public:
  /**
   Gives back the native handle attach() was given, once the Dawn surface
   over it is gone. Called from detach(), on the presenting thread, or from
   the destructor, wherever the last owner lets go of the window.
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
   Presenting thread.
   */
  void attach(void *nativeHandle, int width, int height, bool highBitDepth,
              bool useP3ColorSpace, Releaser releaser);

  /**
   Takes note of a new size, in pixels: what frames are recorded for from
   now (see getTargetInfo), and what the window is configured for by the
   first present of a frame made for it (see isTarget); until then the
   window still takes frames made for its previous size, which the platform
   stretches to the view. Requests a redraw. Any thread: the size is noted
   under the target description's mutex, and the redraw is posted.
   */
  void resize(int width, int height);

  /**
   Destroys the Dawn surface and gives the native handle back to its
   releaser: the platform may destroy the window right after. The target
   description goes away with it; the layout size stays. Takes down the
   abandon, if any (see abandon): this is the detach it waits for.
   Presenting thread; the destructor does the same on whichever thread
   lets go of the window last (see detachNow).
   */
  void detach();

  /**
   detach(), if the window attached is still `nativeHandle`. An Apple view
   lets go of its layer this way, as it leaves its superview or its layout
   collapses to zero: the detach is posted behind the present in flight,
   and an attach posted after it, for another layer, stays (see SkiaView's
   leavePresentThread and detachWindow). Presenting thread.
   */
  void detach(void *nativeHandle);

  /**
   Presenting thread: binds the entries that belong to it (see the class
   comment) to the calling thread, before the first of them; the platform
   view posts it to the thread it presents on as it makes the surface (see
   RNSkView::bindPresentThread).
   */
  void bindPresentingThread() { _presentingThread.bindToCurrentThread(); }

  /**
   The platform is about to take the window back, and will not wait for
   detach(): a SurfaceView's surface is destroyed as soon as surfaceDestroyed
   returns, and the main thread waits for the detach posted to the presenting
   thread only so long (see SkiaView.onSurfaceDestroyed). From now until
   detach() runs, nothing is presented onto the window: a present in flight
   skips its present, as presenting onto a window that is gone loses the GPU
   device. Called before that detach is posted, so that it comes before the
   check the presenting thread makes between replaying a frame and presenting
   it (see presentTexture): set after the check, it would miss the present.
   Only detach() takes it down: an attach() under way when it is set keeps
   it, as the detach posted behind that attach is what it is for. Any
   thread.
   */
  void abandon();

  /**
   Whether a window is attached. Its Dawn surface may be away for a frame
   while the GPU device is replaced (see ensureDevice). Presenting thread.
   */
  bool isAttached();

  /**
   Installed by the platform view, before the window attaches: what a
   present does while the GPU is still on the frame presented before (see
   rnsurface::FrameScheduler::Acknowledgement). On Android a present waits
   for that frame, on the thread that presents and inside Dawn's device
   lock: libgui's queueBuffer waits on the fence of the buffer queued last,
   for every Vulkan swapchain. Holding, the window submits the frame's work
   and keeps its present for presentHeldFrame(); declining, the view leaves
   the frame queued (see isAcknowledged), and a frame it presents all the
   same waits as before. Without one, a present goes at once: a Metal
   present does not wait for the GPU.
   */
  void setAcknowledgement(
      rnsurface::FrameScheduler::Acknowledgement acknowledgement) {
    _acknowledgement = acknowledgement;
  }

  rnsurface::FrameScheduler::Acknowledgement getAcknowledgement() const {
    return _acknowledgement;
  }

  /**
   Whether the GPU is done with the frame presented last: with everything
   submitted up to its present, other windows' work included, which is when
   the fence of its buffer signals. Asked without waiting (see
   DawnContext::isDone). True when no frame was presented onto this window,
   and where a present does not wait for the GPU. Presenting thread.
   */
  bool isAcknowledged();

  /**
   Whether the window holds a frame: its work is submitted, its present
   waits for the GPU to be done with the frame before it. The window takes
   no other frame meanwhile. A held frame goes away unpresented with the
   swapchain it was replayed into (a resize, a detach, a device replaced):
   Dawn destroys the image it acquired, and the frame that follows is made
   for the window as it is then. Presenting thread.
   */
  bool hasHeldFrame();

  /**
   How many frames went to the window so far: what tells a frame presented
   from one whose present is held, or dropped with its swapchain, across a
   call that may do either. Presenting thread.
   */
  uint64_t presentCount() const { return _presentCount; }

  /**
   Presents the held frame, whatever the GPU is on: the view calls it once
   isAcknowledged(). Returns whether a frame went to the window: none was
   held, or the platform took the window back meanwhile (see abandon).
   Presenting thread.
   */
  bool presentHeldFrame();

  /**
   Whether the window shows a frame the view presented: a window attached in
   place of another (a new layer, on iOS) shows nothing until one is
   presented, while the same window attached again keeps what it shows.
   Presenting thread.
   */
  bool showsFrame();

  /**
   The pixel size the platform laid the view out with, which the window gets
   when it appears. Any thread.
   */
  void setLayoutSize(int width, int height);

  /**
   The same, along with the pixel density that layout was made with (on
   Android the view's own, which follows display density changes along with
   its layout, see SkiaView.onLayout). Any thread.
   */
  void setLayoutSize(int width, int height, float pixelDensity);

  /**
   The pixel density of the platform layout (see setLayoutSize): the one of
   the layout the window has the size of, else the latest. False until the
   platform gave one. Any thread.
   */
  bool getPixelDensity(float *pixelDensity);

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
   The color space the platform view will attach the window with (Display P3
   or sRGB, see attach()), known before it does. Any thread.
   */
  void setUseP3ColorSpace(bool useP3ColorSpace);

  /**
   Whether the window renders in Display P3 rather than sRGB: as it was last
   attached, else as the platform view said it would be (see
   setUseP3ColorSpace). Returns false until either is known. Any thread.
   */
  bool getUseP3ColorSpace(bool *useP3ColorSpace);

  /**
   Installed by the view owning the surface: asks it for a frame when the
   window appears or changes size. Called from inside attach() and resize(),
   so it must not present on the spot: the view posts the redraw to the
   thread it presents on.
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
   What a frame presented now would meet: no window, no GPU device (lost,
   and not replaced yet), a window that cannot show a frame (the platform
   view says so, see setCanPresent), or one ready for a frame, which `info`,
   when given, then describes. Presenting thread.
   */
  RNSkWindowState readState(RNSkGraphiteTargetInfo *info);

  // RNSkSurface -------------------------------------------------------------

  /** Width of the window, in pixels; 0 without a window. Any thread. */
  int getWidth() override;

  /** Height of the window, in pixels; 0 without a window. Any thread. */
  int getHeight() override;

  bool getTargetInfo(RNSkGraphiteTargetInfo *info) override;

  /**
   Replays the recordings onto the window and presents it, on the thread the
   view presents on; the swapchain texture is wrapped for the recorder of
   that thread. Returns false when the window cannot present right now:
   there is none, the app is in the background, the GPU device is lost, the
   platform took the window back (see abandon), the window had no drawable,
   or the window is no longer the target given: it was resized, or
   configured again on a new device, since the caller read it (see
   getTargetInfo), and the recordings chosen for that target would not fit
   it. The redraw the change asked for presents onto the window as it is
   now. The recordings are then the caller's to present again, untouched in
   every case but one: a window taken back while the frame was being
   replayed (see presentTexture) has had the recordings replayed onto a
   swapchain texture that is never shown, and they are replayed once more
   onto the next window; a Graphite recording can be replayed any number of
   times.
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
  // What detach() does, without the thread check: the destructor runs
  // wherever the last owner lets go of the window.
  void detachNow();
  // Lets go of the Dawn surface and gives the window back to its releaser,
  // leaving the abandon, if any, up: what detach() does before it takes the
  // abandon down, and what attach() does to the previous window.
  void releaseWindow();
  // Whether the window is the target the caller read (see getTargetInfo):
  // as it is, or as resize() noted it should be (the size is taken then,
  // see takePendingSize). It is neither when the window was resized again,
  // or a device replacement configured it again (see ensureDevice), between
  // the read and the present.
  bool isTarget(const RNSkGraphiteTargetInfo &target);
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
  // get a surface on the new device on their next frame (see ensureDevice).
  void retireReplacedDevice();
  // Lets go of the Dawn surface of every window configured on the given
  // generation (see retireReplacedDevice). Presenting thread, the one every
  // window presents on.
  static void releaseSurfacesOn(uint64_t generation);
  // Configures the window on the GPU device in use when it has no surface:
  // when the device it was configured on was lost and replaced since (see
  // retireReplacedDevice), the surface is made again on the new device, the
  // window itself stays. Returns false without a context, without a
  // surface, or with one made for a device replaced since the sweep (the
  // next frame sweeps again).
  bool ensureDevice();
  // Configures the swapchain for the current size, format and usage.
  void configureSurface();
  // Configures the swapchain when the window attached or resized since it
  // was last configured (see attach, takePendingSize), by the present that
  // follows.
  void configureIfNeeded();
  // Takes the size resize() noted, if any: the window's size from now, and
  // the swapchain's by the next present (see configureIfNeeded).
  void takePendingSize();
  // Copies the window's target description where any thread can read it.
  void updateTargetInfo();
  // The description of the window's texture as it is now: what getTargetInfo
  // hands out once copied.
  RNSkGraphiteTargetInfo describe() const;
  // Whether a frame can go onto the window now: it is ready (see readState)
  // and the platform has not taken it back (see abandon).
  bool canPresent();
  // Presents the swapchain texture the frame was replayed onto, or holds
  // its present while the GPU is on the frame before it (see
  // setAcknowledgement), unless the platform took the window back meanwhile
  // (see abandon). Returns whether the window took the frame.
  bool presentTexture();
  // Presents the swapchain texture, and remembers the work submitted up to
  // here as what the next present waits for.
  void presentNow();
  // Whether the window takes a frame: it holds none, or the swapchain that
  // one was replayed into is about to be configured again.
  bool takesFrame() const { return !_heldFrame || _needsConfigure; }
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

  // The device the window is configured on, and its generation (see
  // DawnContext::generation()): a lost device is replaced, and the window
  // configured again on the new one (see retireReplacedDevice). The surface
  // is null between the two, and while the window is detached; the
  // generation is 0 then.
  wgpu::Device _device;
  uint64_t _generation = 0;
  wgpu::Surface _surface;
  void *_nativeHandle = nullptr;
  bool _showsFrame = false;
  Releaser _releaser;
  int _width = 0;
  int _height = 0;
  wgpu::TextureFormat _format = wgpu::TextureFormat::Undefined;
  wgpu::TextureUsage _usage = wgpu::TextureUsage::RenderAttachment;
  // The window attached or resized since the swapchain was configured (see
  // configureIfNeeded).
  bool _needsConfigure = false;
  // The platform took the window back before detach() ran (see abandon).
  // Taken down by detach() alone, never by attach() (see releaseWindow).
  std::atomic<bool> _abandoned{false};
  // What a present does while the GPU is on the frame before it, the frame
  // whose present is held, and the work submitted up to the last present,
  // until the GPU is done with it (see isAcknowledged).
  rnsurface::FrameScheduler::Acknowledgement _acknowledgement =
      rnsurface::FrameScheduler::Acknowledgement::kNone;
  bool _heldFrame = false;
  uint64_t _presentCount = 0;
  bool _hasPresentedWork = false;
  wgpu::Future _presentedWork{};
  uint64_t _presentedWorkGeneration = 0;
  SkColorType _colorType = kUnknown_SkColorType;
  bool _useP3ColorSpace = false;

  // A copy of the window's target description, readable from any thread
  // while the window itself belongs to the presenting thread.
  std::mutex _targetInfoMutex;
  RNSkGraphiteTargetInfo _targetInfo;
  bool _hasTargetInfo = false;
  int _layoutWidth = 0;
  int _layoutHeight = 0;
  float _layoutPixelDensity = 0;
  // The size resize() noted, for the next present to take (see
  // takePendingSize).
  int _pendingWidth = 0;
  int _pendingHeight = 0;
  bool _hasPendingSize = false;
  // The bit depth the window has, or will have (see getHighBitDepth).
  bool _knownHighBitDepth = false;
  bool _hasKnownHighBitDepth = false;
  bool _knownUseP3ColorSpace = false;
  bool _hasKnownUseP3ColorSpace = false;

  std::function<void()> _requestRedraw;
  std::function<bool()> _canPresent;

  // The thread the window belongs to (see the class comment).
  rnsurface::ThreadChecker _presentingThread;
};

} // namespace RNSkia
