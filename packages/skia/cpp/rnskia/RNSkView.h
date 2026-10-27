#pragma once

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "RNSkGraphiteProducer.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkGraphiteTargetInfo.h"
#include "RNSkOffscreenSurface.h"
#include "RNSkPlatformContext.h"
#include "RNSkSurface.h"
#include "RNSkWindowSurface.h"
#include "jsi/ViewProperty.h"
#include "utils/RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkCanvas.h"

#include "include/core/SkImage.h"
#include "include/core/SkRect.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * The native side of a Skia view. Frames come from one of two producers: JS
 * records them itself through the view's target
 * (SkiaViewApi.makeGraphiteContext), or <Canvas> hands over a recorder (or a
 * picture) that the render thread pool records for the view. Either way the
 * recordings are queued on the target; the view presents them onto its window
 * surface once the platform view's surface can show a new frame (see
 * setFrameScheduler), on the thread the platform view presents on: the main
 * thread, or a thread of its own (an Android canvas presents on one shared by
 * every canvas, see setPresentThread).
 *
 * Threading: the registry side (RNSkJsiViewApi) runs on the JS thread, except
 * applyUpdates() which a Reanimated mapper calls on the UI runtime; snapshots
 * replay on the calling thread. Presenting (redraw, presentFrame) runs on the
 * present thread, and only there. The window surface keeps the present thread
 * and the platform view's own thread apart (see RNSkWindowSurface).
 */
class RNSkView : public std::enable_shared_from_this<RNSkView> {
public:
  RNSkView(std::shared_ptr<RNSkPlatformContext> context,
           std::shared_ptr<RNSkWindowSurface> surface)
      : _platformContext(std::move(context)), _surface(std::move(surface)),
        _producer(std::make_shared<RNSkGraphiteProducer>()) {
    // Until the platform view installs a present thread (see
    // setPresentThread), the view presents on the main thread. Without this
    // view: the runner is copied into callbacks that may outlive it.
    auto platformContext = _platformContext;
    _runOnPresentThread = [platformContext](std::function<void()> task) {
      platformContext->runOnMainThread(std::move(task));
    };
    // A new window or a new size: present again. The platform view owns
    // the surface together with this view, and the destructor clears the
    // callback, so a raw capture is safe.
    _surface->setRequestRedraw([this]() { requestRedraw(); });
  }

  ~RNSkView() {
    _surface->setRequestRedraw(nullptr);
    std::shared_ptr<RNSkGraphiteTarget> target;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = std::move(_target);
    }
    if (target) {
      target->detach(_surface);
    }
  }

  // Registry side ------------------------------------------------------------

  /**
   Binds the view to its id. The target recording for this id (created by
   whichever side came first, see RNSkGraphiteTargetRegistry) is attached to
   the view's surface, and frames recorded before the view existed are
   presented now.
   */
  void setNativeId(size_t nativeId) {
    _nativeId = nativeId;
    // The registry's entry, not the view's: after a reload a recycled view
    // still holds the target of the previous bundle.
    auto target = RNSkGraphiteTargetRegistry::getInstance().bind(
        nativeId, _platformContext);
    std::shared_ptr<RNSkGraphiteTarget> previous;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_target == target) {
        return;
      }
      previous = std::move(_target);
      _target = target;
    }
    if (previous) {
      previous->detach(_surface);
    }
    // Self-contained: the target calls it from whichever thread submits a
    // recording, possibly while this view is being destroyed.
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    auto run = _runOnPresentThread;
    auto scheduleOnPresentThread = [weakThis, run]() {
      run([weakThis]() {
        if (auto view = weakThis.lock()) {
          view->scheduleFrame();
        }
      });
    };
    target->attach(_surface, scheduleOnPresentThread);
    _producer->setTarget(target);
    if (target->hasQueued()) {
      scheduleOnPresentThread();
    }
  }

  size_t getNativeId() { return _nativeId; }

  /** Declarative content: the recorder of <Canvas>, or a picture. */
  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) {
    for (auto &prop : props) {
      if (prop.first == "recorder") {
        _producer->setRecorder(
            prop.second.isRecorder() ? prop.second.getRecorder() : nullptr);
      } else if (prop.first == "picture") {
        _producer->setPicture(prop.second.isPicture() ? prop.second.getPicture()
                                                      : nullptr);
      }
    }
  }

  /**
   Reads the shared values on the calling runtime into the recording the
   view owns and schedules a frame. Returns false when there is nothing to
   update: no recording, or one other than recorderId (a stale mapper).
   */
  bool applyUpdates(jsi::Runtime &runtime, double recorderId,
                    const jsi::Array &values) {
    return _producer->applyUpdates(runtime, recorderId, values);
  }

  /**
   Schedules redraw() on the present thread, once. A redraw the window could
   not show (the app in the background) stays requested until onCanPresent()
   schedules it again. Any thread: the window surface asks for one from the
   main thread, with its own mutex held, so nothing is presented on the spot.
   */
  void requestRedraw() {
    if (_redrawRequested.exchange(true)) {
      return;
    }
    postRedraw();
  }

  /**
   Present thread. Presents everything submitted since the last frame; with
   nothing queued, presents the last frame again (a redraw after a resize or
   on a new surface). Without a surface the queue is left alone: the surface
   presents it when it appears. While the window cannot show a frame (the
   app in the background, see RNSkWindowSurface::setCanPresent) nothing is
   replayed either: the redraw stays requested, and onCanPresent() schedules
   it again. A frame the window could not take (no drawable) is queued again
   and handed to the frame scheduler, which tries it on the view's next frame
   (see setFrameScheduler).
   */
  void redraw() {
    RNSkGraphiteTargetInfo targetInfo;
    if (!_surface->getTargetInfo(&targetInfo)) {
      _redrawRequested = false;
      return;
    }
    if (!_surface->canPresent()) {
      return;
    }
    _redrawRequested = false;
    // Declarative content is recorded again for the surface as it is now.
    const bool frameComing = _producer->requestFrame();
    auto target = getTarget();
    if (target == nullptr) {
      return;
    }
    auto recordings = target->takeQueued();
    if (recordings.empty()) {
      // With a frame on its way, the layer keeps showing the last one until
      // it lands: presenting it again would only cost a second present.
      // Otherwise the last frame is presented again, also onto a surface of
      // another size (the view was resized and nothing records for it): the
      // frame then shows stretched to it rather than nothing at all. A last
      // frame made for a GPU device lost since cannot be shown again: the
      // view stays as it is until something records for it.
      std::shared_ptr<RNSkGraphiteRecording> lastPresented;
      {
        std::lock_guard<std::mutex> lock(_mutex);
        lastPresented = _lastPresented;
      }
      if (frameComing || lastPresented == nullptr ||
          !lastPresented->isCurrent()) {
        return;
      }
      recordings.push_back(std::move(lastPresented));
    }
    const size_t taken = recordings.size();
    if (presentOrKeep(*target, targetInfo, std::move(recordings)).allDone) {
      _producer->onFramePresented(taken);
      return;
    }
    // Not scheduleFrame(): without a scheduler it redraws, which would fail
    // again and recurse.
    if (_frameScheduler) {
      _frameScheduler(/* forResizedWindow= */ false);
    }
  }

  /**
   Renders the view into an offscreen surface and returns a GPU image of it,
   usable by any canvas: declarative content is replayed on the calling
   thread with the latest values, so the snapshot does not wait for a frame;
   otherwise the current frame is replayed. A snapshot is in sRGB whichever
   color space the view renders in: a frame recorded in Display P3 is
   replayed into a surface in that color space and converted on the GPU (see
   RNSkOffscreenSurface::makeSnapshot).
   */
  sk_sp<SkImage> makeImageSnapshot(SkRect *bounds) {
    if (_producer->hasContent()) {
      RNSkOffscreenSurface surface(_platformContext, getScaledWidth(),
                                   getScaledHeight());
      if (auto *canvas = surface.getCanvas()) {
        _producer->renderInto(canvas, _platformContext->getPixelDensity());
      }
      return surface.makeSnapshot(bounds);
    }
    auto frame = getLastFrame();
    const bool useP3ColorSpace =
        frame != nullptr && frame->getTarget().useP3ColorSpace;
    RNSkOffscreenSurface surface(_platformContext, getScaledWidth(),
                                 getScaledHeight(), useP3ColorSpace);
    if (frame != nullptr) {
      renderFrame(surface, frame);
    }
    return surface.makeSnapshot(bounds);
  }

  /** Width of the surface, in pixels. */
  int getScaledWidth() { return _surface->getWidth(); }

  /** Height of the surface, in pixels. */
  int getScaledHeight() { return _surface->getHeight(); }

  // Platform view side -------------------------------------------------------

  /**
   Installed by the platform view when it presents on another thread than
   the main thread: runs a task on the thread the view presents on, never on
   the spot (the window surface posts redraws with its mutex held). Any
   thread. Without one, tasks are posted to the main thread, which the Apple
   views present on; an Android view always installs one (its platform
   context runs a task handed over on the main thread on the spot, see
   JniPlatformContext). Installed once, before the view is bound to its id.
   */
  void setPresentThread(std::function<void(std::function<void()>)> run) {
    _runOnPresentThread = std::move(run);
  }

  /**
   Installed by the platform view, which calls presentFrame() once its surface
   can show a new frame, and again while it says more are waiting: on the
   display link on iOS, straight away and then a frame apart on macOS, and on
   Android as its FrameScheduler decides (a SurfaceView on the vsync, a
   TextureView once its window took the previous frame). Its argument says that
   the window was resized since the frame it shows was made, so it shows that
   frame stretched to its size (see presentThroughTexture), and that the
   recording waiting is for its size: a platform view that would wait for its
   next frame presents on the spot instead, so that the window is drawn at its
   size as soon as it can be, and a view resized on every frame is drawn at
   the right size on every frame. Called on the present thread (see
   setPresentThread), where it must call presentFrame() too. Without one,
   frames are presented as soon as the present thread gets to them, and one
   the window could not take waits for the next redraw.
   */
  void setFrameScheduler(std::function<void(bool forResizedWindow)> scheduler) {
    _frameScheduler = std::move(scheduler);
  }

  /**
   Installed by the platform view: whether its window shows the latest frame
   presented at each of its draws and lets the others go (a TextureView),
   rather than each frame in turn (a SurfaceView, a CAMetalLayer). With it,
   a frame recorded for the size the window still has is presented onto it
   ahead of the frame for its new size (see present): it costs a present and
   nothing else, and keeps the window moving should the latter be late.
   Without it, such a frame would take a turn of its own and hold the latter
   back by a frame. Installed before the window attaches.
   */
  void setWindowTakesLatestFrame(bool takesLatestFrame) {
    _windowTakesLatestFrame = takesLatestFrame;
  }

  /** Present thread: a recording is waiting. */
  void scheduleFrame() {
    if (_frameScheduler) {
      _frameScheduler(hasFrameForResizedWindow());
    } else {
      redraw();
    }
  }

  /** What presentFrame() did, as a mask. */
  enum PresentFrameResult : int {
    kNothingPresented = 0,
    // A frame went to the window.
    kFramePresented = 1,
    // Recordings are left for a later frame: more were queued, or the
    // window could not take them (no drawable).
    kMoreQueued = 2,
  };

  /**
   Present thread. Presents the queued recordings (see setFrameScheduler for
   when). Says whether a frame went to the window, and whether more are
   waiting, so that the platform view asks again: also when the window could
   not take one (no drawable), so that it is tried again on the next frame
   rather than left waiting for a redraw. Without a surface the queue is
   left alone: the surface presents it when it appears. While the window
   cannot show a frame (the app in the background) the queue is left alone
   too, and nobody asks again before onCanPresent().
   */
  int presentFrame() {
    auto target = getTarget();
    if (target == nullptr) {
      return kNothingPresented;
    }
    RNSkGraphiteTargetInfo targetInfo;
    if (!_surface->getTargetInfo(&targetInfo) || !_surface->canPresent()) {
      return kNothingPresented;
    }
    auto recordings = target->takeQueued();
    if (recordings.empty()) {
      return kNothingPresented;
    }
    const size_t taken = recordings.size();
    const auto presented =
        presentOrKeep(*target, targetInfo, std::move(recordings));
    const int result = presented.shown ? kFramePresented : kNothingPresented;
    if (!presented.allDone) {
      return result | kMoreQueued;
    }
    _producer->onFramePresented(taken);
    return target->hasQueued() ? result | kMoreQueued : result;
  }

  /**
   Main thread. The window can show frames again (the app came back to the
   foreground, see RNSkWindowSurface::setCanPresent): a redraw it could not
   show is scheduled again, else the recordings queued meanwhile are handed
   to the frame scheduler. Nothing is replayed on the spot. A GPU device
   lost in the background (where iOS refuses GPU work) is replaced now that
   the app is back, and the view is asked for a frame once it is.
   */
  void onCanPresent() {
    DawnContext::requestRecovery();
    if (_redrawRequested) {
      postRedraw();
    } else if (hasQueuedRecordings()) {
      scheduleFrame();
    }
  }

  bool hasQueuedRecordings() {
    auto target = getTarget();
    return target && target->hasQueued();
  }

  std::shared_ptr<RNSkPlatformContext> getPlatformContext() {
    return _platformContext;
  }

private:
  std::shared_ptr<RNSkGraphiteTarget> getTarget() {
    std::lock_guard<std::mutex> lock(_mutex);
    return _target;
  }

  /**
   The frame on screen, or the one about to be, if any; none when it was
   made for a GPU device lost since (it cannot be replayed). Any thread.
   */
  std::shared_ptr<RNSkGraphiteRecording> getLastFrame() {
    std::shared_ptr<RNSkGraphiteTarget> target;
    std::shared_ptr<RNSkGraphiteRecording> recording;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = _target;
      recording = _lastPresented;
    }
    if (target) {
      if (auto latest = target->peekLatest()) {
        recording = latest;
      }
    }
    if (recording != nullptr && !recording->isCurrent()) {
      return nullptr;
    }
    return recording;
  }

  /**
   Whether the window was resized since the frame it shows was made, so
   that it shows that frame stretched to its size (see
   presentThroughTexture), and the latest recording waiting is for its
   size. Present thread.
   */
  bool hasFrameForResizedWindow() {
    RNSkGraphiteTargetInfo targetInfo;
    if (!_surface->getTargetInfo(&targetInfo)) {
      return false;
    }
    std::shared_ptr<RNSkGraphiteTarget> target;
    std::shared_ptr<RNSkGraphiteRecording> lastPresented;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      target = _target;
      lastPresented = _lastPresented;
    }
    if (target == nullptr || lastPresented == nullptr ||
        lastPresented->hasSizeOf(targetInfo)) {
      return false;
    }
    auto latest = target->peekLatest();
    return latest != nullptr && latest->hasSizeOf(targetInfo);
  }

  /** Replays a frame onto another surface (a snapshot surface). Any thread. */
  bool renderFrame(RNSkSurface &surface,
                   const std::shared_ptr<RNSkGraphiteRecording> &recording) {
    RNSkGraphiteTargetInfo targetInfo;
    if (!surface.getTargetInfo(&targetInfo)) {
      return false;
    }
    return present(surface, targetInfo, {recording}, /* remember= */ false)
               .done == 1;
  }

  /** Runs redraw() on the present thread, when it gets to it. */
  void postRedraw() {
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    _runOnPresentThread([weakThis]() {
      if (auto view = weakThis.lock()) {
        if (view->_redrawRequested) {
          view->redraw();
        }
      }
    });
  }

  /** What presentOrKeep() did. */
  struct Presented {
    // Every recording is done: shown, or skipped (see present).
    bool allDone;
    // A frame went to the window.
    bool shown;
  };

  /**
   Presents the recordings onto the window, described by targetInfo, and
   remembers the last one shown. The one the window could not take and the
   ones behind it go back to the front of the target's queue: the window had
   no drawable, or it changed under the present (the main thread resized it
   between the read of its description and the present, see
   RNSkWindowSurface::presentRecordings). A window that changed is read
   again and the rest presented onto it as it is now, once, rather than a
   frame later: what was recorded for the previous size shows stretched to
   it, or is dropped for a frame behind it (see present).
   */
  Presented presentOrKeep(
      RNSkGraphiteTarget &target, RNSkGraphiteTargetInfo targetInfo,
      std::vector<std::shared_ptr<RNSkGraphiteRecording>> recordings) {
    bool shown = false;
    for (int attempt = 0;; attempt++) {
      const auto replayed =
          present(*_surface, targetInfo, recordings, /* remember= */ true);
      shown = shown || replayed.shown;
      if (replayed.done == recordings.size()) {
        return {true, shown};
      }
      recordings.erase(recordings.begin(),
                       recordings.begin() + static_cast<long>(replayed.done));
      RNSkGraphiteTargetInfo now;
      if (attempt == 0 && _surface->getTargetInfo(&now) && now != targetInfo) {
        targetInfo = now;
        continue;
      }
      target.requeue(std::move(recordings));
      return {false, shown};
    }
  }

  /**
   Replays the recordings onto the surface's target, in order, and remembers
   the last one shown for the next redraw when asked to (not for a snapshot).
   Says how many of them are done, from the front, and whether a frame went
   to the surface. Done are all, unless the surface
   could not take one (no drawable, or the surface is no longer the target
   described by targetInfo: resized since it was read), also through a
   texture; that one and the ones behind it are left to the caller. One made
   for another format, or whose replay into a texture failed, is skipped:
   done, not shown. One that declarative content recorded for another size
   than the target's goes onto the surface as it is when the surface still
   has that size (the window takes it until the frame for its new size
   arrives); else it is skipped when another recording follows it or is on
   its way (see RNSkGraphiteProducer::hasFrameComing), and shown through a
   texture, stretched to the target, when nothing is (see the comments in
   the loop).
   */
  struct Replayed {
    // How many of the recordings are done, from the front.
    size_t done;
    // A frame went to the surface.
    bool shown;
  };
  Replayed
  present(RNSkSurface &surface, const RNSkGraphiteTargetInfo &targetInfo,
          const std::vector<std::shared_ptr<RNSkGraphiteRecording>> &recordings,
          bool remember) {
    // Recordings of the target's size and color space are replayed straight
    // onto it, as one batch; any other goes through a texture of its own.
    std::vector<skgpu::graphite::Recording *> batch;
    std::shared_ptr<RNSkGraphiteRecording> batchLast;
    std::shared_ptr<RNSkGraphiteRecording> last;
    size_t done = 0;
    // Presents the batch; the recordings before upTo are then done.
    auto flush = [&](size_t upTo) {
      if (!batch.empty()) {
        if (!surface.presentRecordings(targetInfo, batch)) {
          return false;
        }
        batch.clear();
        last = std::move(batchLast);
      }
      done = upTo;
      return true;
    };
    bool taken = true;
    for (size_t i = 0; i < recordings.size(); i++) {
      const auto &recording = recordings[i];
      // A recording made for a GPU device lost since (one queued when the
      // device was lost) can never be replayed: consumed, not shown. The
      // producer records again for the device in use (see redraw).
      if (!recording->isCurrent()) {
        RNSkLogger::logToConsole("SkiaView: skipping a recording made for a "
                                 "lost GPU device");
        continue;
      }
      // A recording made for another format (recorded before the surface
      // existed, with a bit depth the surface did not get) cannot be
      // replayed onto this one.
      if (!recording->hasFormatOf(targetInfo)) {
        RNSkLogger::logToConsole("SkiaView: skipping a recording made for a "
                                 "different surface format");
        continue;
      }
      if (recording->hasSizeOf(targetInfo) &&
          recording->hasColorSpaceOf(targetInfo)) {
        batch.push_back(recording->get());
        batchLast = recording;
        continue;
      }
      if (!recording->hasSizeOf(targetInfo) && _producer->hasContent()) {
        // Declarative content recorded for a size the window had. It is
        // recorded again for the window as it is now (see redraw), so this
        // frame is stale, but it carries the latest content: it goes onto
        // the window while the window still has that size (the platform
        // stretches it to the view until the frame for the new size lands)
        // when the window shows the latest frame presented rather than each
        // in turn (see setWindowTakesLatestFrame): it costs a present and
        // nothing else there. Otherwise it is dropped when the frame for
        // the new size follows or is on its way, as presenting it would
        // only hold that one up (a view resized on every frame has a
        // frame's worth of work in the present alone, see
        // RNSkWindowSurface::configureIfNeededLocked), and shown through a
        // texture, stretched, when nothing is: better than the previous
        // frame.
        if (!flush(i)) {
          taken = false;
          break;
        }
        if (_windowTakesLatestFrame && &surface == _surface.get() &&
            surface.presentRecordings(recording->getTarget(),
                                      {recording->get()})) {
          last = recording;
          done = i + 1;
          continue;
        }
        if (i + 1 < recordings.size() || _producer->hasFrameComing()) {
          continue;
        }
      }
      if (!flush(i)) {
        taken = false;
        break;
      }
      const auto result = presentThroughTexture(surface, targetInfo, recording);
      if (result == TexturePresent::kDeclined) {
        taken = false;
        break;
      }
      if (result == TexturePresent::kPresented) {
        last = recording;
      }
      done = i + 1;
    }
    if (taken) {
      flush(recordings.size());
    }
    if (remember && last != nullptr) {
      std::lock_guard<std::mutex> lock(_mutex);
      _lastPresented = last;
    }
    return {done, last != nullptr};
  }

  /** What became of a recording presented through a texture. */
  enum class TexturePresent { kPresented, kConsumed, kDeclined };

  /**
   Presents a recording made for another size than the target's: the size
   JS measured before the surface existed can be a pixel off (the platform
   rounds the layout to pixels on its own terms), and the view may have been
   resized since. The recording is replayed into a texture of its own size
   and that texture is drawn onto the target, stretched to it (as the
   compositor shows a buffer of another size than its layer), so the frame
   shows, without an empty edge, rather than being dropped; the copy only
   happens while the sizes differ. The same goes
   for a recording made in another color space than the target's: the
   texture is in the color space of the recording, and drawing it converts
   the colors. A recording that cannot be replayed into such a texture is
   consumed; one the surface could not take (no drawable, or it is no longer
   the target described by targetInfo) is declined, for the caller to keep.
   */
  TexturePresent presentThroughTexture(
      RNSkSurface &surface, const RNSkGraphiteTargetInfo &targetInfo,
      const std::shared_ptr<RNSkGraphiteRecording> &recording) {
    const auto &size = recording->getTarget();
    RNSkOffscreenSurface intermediate(_platformContext, size.width, size.height,
                                      size.useP3ColorSpace);
    RNSkGraphiteTargetInfo info;
    if (!intermediate.getTargetInfo(&info) ||
        !recording->isCompatibleWith(info)) {
      // No texture of that size and format: the frame is consumed.
      RNSkLogger::logToConsole("SkiaView: skipping a %dx%d recording, the "
                               "surface is %dx%d",
                               size.width, size.height, surface.getWidth(),
                               surface.getHeight());
      return TexturePresent::kConsumed;
    }
    auto image = intermediate.presentRecordings(info, {recording->get()})
                     ? intermediate.makeImage()
                     : nullptr;
    if (image == nullptr) {
      RNSkLogger::logToConsole("SkiaView: skipping a %dx%d recording, it "
                               "could not be replayed into a texture",
                               size.width, size.height);
      return TexturePresent::kConsumed;
    }
    return surface.presentImage(targetInfo, image) ? TexturePresent::kPresented
                                                   : TexturePresent::kDeclined;
  }

  std::shared_ptr<RNSkPlatformContext> _platformContext;
  std::shared_ptr<RNSkWindowSurface> _surface;
  std::shared_ptr<RNSkGraphiteProducer> _producer;
  size_t _nativeId = 0;
  std::function<void(bool forResizedWindow)> _frameScheduler;
  bool _windowTakesLatestFrame = false;
  std::function<void(std::function<void()>)> _runOnPresentThread;
  std::atomic<bool> _redrawRequested = {false};

  // The target is bound on the JS thread and read on the present thread and
  // by snapshots; the last presented frame is written by the present thread
  // and read by snapshots.
  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  std::shared_ptr<RNSkGraphiteRecording> _lastPresented;
};

} // namespace RNSkia
