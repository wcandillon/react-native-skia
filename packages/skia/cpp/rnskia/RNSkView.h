#pragma once

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
#include "RNSkPacingPolicy.h"
#include "RNSkPlatformContext.h"
#include "RNSkRedrawRequest.h"
#include "RNSkSurface.h"
#include "RNSkWindowSurface.h"
#include "jsi/ViewProperty.h"
#include "rnsurface/FrameClock.h"
#include "rnsurface/FrameScheduler.h"
#include "rnsurface/ThreadChecker.h"
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
 * surface when its frame scheduler says so (rnsurface::FrameScheduler, one
 * per view, kept with the producer whose jobs it paces too): one frame per
 * frame of the display, on the frame signals the platform view hands it (see
 * setFrameHost and onFrameSignal), and none while the GPU is still on the
 * frame before where a present would wait for it (see
 * RNSkWindowSurface::setAcknowledgement). The view is the scheduler's
 * hands: it reads what the window holds before each of the scheduler's
 * entries (see windowState) and does what the entry asks for (see run). All
 * of it on the thread the platform view presents on: the main thread, or a
 * thread of its own (Android and Apple canvases each present on one shared
 * by every canvas of the platform, see setPresentThread).
 *
 * Threading: the registry side (RNSkJsiViewApi) runs on the JS thread, except
 * applyUpdates() which a Reanimated mapper calls on the UI runtime; snapshots
 * replay on the calling thread. Presenting (redraw, scheduleFrame and the
 * frame entries) runs on the present thread, and only there, which the
 * entries check once the platform view has bound it (see
 * bindPresentThread), and so does everything the platform view does to the
 * window (see RNSkWindowSurface): nothing waits for a present.
 */
class RNSkView : public std::enable_shared_from_this<RNSkView> {
public:
  RNSkView(std::shared_ptr<RNSkPlatformContext> context,
           std::shared_ptr<RNSkWindowSurface> surface)
      : _platformContext(std::move(context)), _surface(std::move(surface)),
        _producer(
            std::make_shared<RNSkGraphiteProducer>(platformPacingPolicy())) {
    // Whether a present waits for the GPU is the window's to deal with: the
    // scheduler only reads what the window holds.
    _surface->setAcknowledgement(platformPacingPolicy().acknowledgement);
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

  /**
   Declarative content: the recorder of <Canvas>, or a picture; and the
   deviceIndependentFonts option, set on the target (the view's recordings
   and those JS makes for it) before its content, so that a canvas mounting
   with it records its first frame with it. Called after setNativeId.
   */
  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) {
    auto option = props.find("deviceIndependentFonts");
    if (option != props.end() && option->second.isBool()) {
      auto target = getTarget();
      // Static content is not recorded again by itself.
      if (target &&
          target->setDeviceIndependentFonts(option->second.getBool())) {
        _producer->requestFrame();
      }
    }
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
   Schedules redraw() on the present thread, once (see RNSkRedrawRequest).
   Any thread: the window surface asks for one as it attaches or resizes, so
   nothing is presented on the spot.
   */
  void requestRedraw() {
    if (_redrawRequest.request()) {
      postRedraw();
    }
  }

  /**
   Present thread. Presents everything submitted since the last frame; with
   nothing queued, presents the last frame again (a redraw after a resize or
   on a new surface). It takes the request and decides on one read of the
   window (see RNSkRedrawRequest): without a window or a GPU device the
   request is dropped and the queue left alone, attaching a window and
   replacing the device each asking again; a window that cannot show a
   frame (the app in the background, see RNSkWindowSurface::setCanPresent)
   is owed the redraw until onCanPresent(). A redraw waits for no frame of
   the display: the window asked for it as it attached or resized, and shows
   nothing, or a stretched frame, until it has run. The frame scheduler
   hears of it as of a frame it asked for, and paces what the redraw left: a
   frame the window could not take (no drawable), which is queued again, or
   one whose present the window holds.
   */
  void redraw() {
    RNSURFACE_ASSERT_THREAD(_presentThread, "RNSkView::redraw");
    RNSkGraphiteTargetInfo targetInfo;
    switch (_redrawRequest.start(*_surface, &targetInfo)) {
    case RNSkRedrawRequest::Start::kPresent:
      break;
    case RNSkRedrawRequest::Start::kPostAgain:
      postRedraw();
      return;
    case RNSkRedrawRequest::Start::kSkip:
      return;
    }
    // Declarative content is recorded again for the surface as it is now.
    const bool frameComing = _producer->requestFrame();
    auto target = getTarget();
    if (target == nullptr) {
      return;
    }
    auto recordings = target->takeQueued();
    const bool showsLastFrameAgain = recordings.empty();
    if (showsLastFrameAgain) {
      // The last frame is presented again, also onto a surface of another
      // size (the view was resized and nothing records for it), where it
      // shows stretched to it rather than nothing at all. With a frame on its
      // way, a window that shows the last frame keeps it until the new one
      // lands: presenting it again would only cost a second present; a window
      // attached in place of another shows nothing, so it gets the last frame
      // meanwhile. A last frame made for a GPU device lost since cannot be
      // shown again: the view stays as it is until something records for it.
      std::shared_ptr<RNSkGraphiteRecording> lastPresented;
      {
        std::lock_guard<std::mutex> lock(_mutex);
        lastPresented = _lastPresented;
      }
      if (!(frameComing && _surface->showsFrame()) &&
          lastPresented != nullptr && lastPresented->isCurrent()) {
        recordings.push_back(std::move(lastPresented));
      }
    }
    Scheduler::Taken taken;
    if (!recordings.empty()) {
      // The last frame shown again holds none of the producer's slots, which
      // the frame on its way may hold, and was counted when it was first
      // presented.
      taken = presentTaken(*target, targetInfo, std::move(recordings),
                           /* fromQueue= */ !showsLastFrameAgain);
    }
    const auto window = windowState();
    const auto now = rnsurface::frameClockNow();
    run(_producer->pace([&](Scheduler &scheduler) {
      return scheduler.onFrameTaken(taken, now, window);
    }));
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
      const float pixelDensity = getPixelDensity();
      RNSkOffscreenSurface surface(_platformContext, getScaledWidth(),
                                   getScaledHeight());
      surface.setPixelDensity(pixelDensity);
      if (auto *canvas = surface.getCanvas()) {
        _producer->renderInto(canvas, pixelDensity);
      }
      return surface.makeSnapshot(bounds);
    }
    auto frame = getLastFrame();
    const bool useP3ColorSpace =
        frame != nullptr && frame->getTarget().useP3ColorSpace;
    RNSkOffscreenSurface surface(_platformContext, getScaledWidth(),
                                 getScaledHeight(), useP3ColorSpace);
    surface.setPixelDensity(getPixelDensity());
    if (frame != nullptr) {
      renderFrame(surface, frame);
    }
    return surface.makeSnapshot(bounds);
  }

  /** Width of the surface, in pixels. */
  int getScaledWidth() { return _surface->getWidth(); }

  /**
   Pixels per point of the view: the density of its platform layout when the
   platform gives one (see RNSkWindowSurface::setLayoutSize), else the
   platform's.
   */
  float getPixelDensity() {
    float pixelDensity;
    if (_surface->getPixelDensity(&pixelDensity)) {
      return pixelDensity;
    }
    return _platformContext->getPixelDensity();
  }

  /** Height of the surface, in pixels. */
  int getScaledHeight() { return _surface->getHeight(); }

  // Platform view side -------------------------------------------------------

  /**
   Installed by the platform view when it presents on another thread than
   the main thread: runs a task on the thread the view presents on, never on
   the spot (the window surface asks for a redraw from inside attach() and
   resize(), and a redraw on the spot would present mid-attach). Any
   thread. Without one, tasks are posted to the main thread. Android and
   Apple views always install one: a present waits for the pipelines its
   draws use to compile, which must not hold the main thread (and an Android
   platform context runs a task handed over on the main thread on the spot,
   see JniPlatformContext). Installed once, before the view is bound to its
   id.
   */
  void setPresentThread(std::function<void(std::function<void()>)> run) {
    _runOnPresentThread = std::move(run);
  }

  /**
   Present thread: binds the entries that belong to it (redraw,
   scheduleFrame, onFrameSignal; see rnsurface::ThreadChecker) to the calling
   thread, before the first of them. The platform view posts it to its
   present thread as it installs it (see setPresentThread), ahead of
   everything it posts there.
   */
  void bindPresentThread() { _presentThread.bindToCurrentThread(); }

  using Scheduler = rnsurface::FrameScheduler;

  /** What the view asks of its platform view, on the present thread. */
  struct FrameHost {
    /**
     Has onFrameSignal() called at the next frame of the display: a display
     link on iOS, the AChoreographer of the present thread on Android. One
     request, one signal: the view asks again for the next. Without one,
     the view signals itself as soon as the present thread gets to it, and
     presents unpaced.
     */
    std::function<void()> requestFrameSignal;
    /**
     Has onAcknowledgementPoll() called shortly, once. The GPU being done
     with a frame is no event the view hears (see DawnContext::isDone), so a
     platform whose presents wait for it polls, from a timer of the present
     thread. Never asked for elsewhere.
     */
    std::function<void()> watchAcknowledgement;
    /** A frame went to the window. */
    std::function<void()> onFramePresented;
  };

  /**
   Installed by the platform view, before the window attaches (see
   FrameHost).
   */
  void setFrameHost(FrameHost host) { _frameHost = std::move(host); }

  /**
   Installed by the platform view, before the window attaches: whether its
   window shows the latest frame presented at each of its draws and lets the
   others go (a TextureView), each frame in turn (a SurfaceView, a
   CAMetalLayer), or nothing yet. The scheduler paces each its own way, and
   a window that shows the latest frame gets a frame recorded for the size
   it still has ahead of the frame for its new size (see present): it costs
   a present and nothing else, and keeps the window moving should the latter
   be late. Where each frame shows in turn, such a frame would take a turn
   of its own and hold the latter back by a frame. Present thread.
   */
  void setWindow(Scheduler::Window window) {
    _windowTakesLatestFrame = window == Scheduler::Window::kShowsLatestFrame;
    _producer->setWindow(window);
  }

  /**
   Present thread: a recording is waiting. It is urgent when the window was
   resized since the frame it shows was made, so that it shows that frame
   stretched to its size (see presentThroughTexture), and the recording is
   for its size: it goes ahead of the frame signal or of the draw it would
   otherwise wait for, so that a view resized on every frame is drawn at the
   right size on every frame.
   */
  void scheduleFrame() {
    RNSURFACE_ASSERT_THREAD(_presentThread, "RNSkView::scheduleFrame");
    const bool urgent = hasFrameForResizedWindow();
    const auto window = windowState();
    const auto now = rnsurface::frameClockNow();
    run(_producer->pace([&](Scheduler &scheduler) {
      return scheduler.onFrameQueued(now, window, urgent);
    }));
  }

  /**
   Present thread: the frame signal asked for with
   FrameHost::requestFrameSignal. A frame of the display started at
   `signal.time`, lasts `signal.interval`, and a frame presented by
   `signal.deadline` still makes it, all on rnsurface::frameClockNow()'s
   clock.
   */
  void onFrameSignal(const Scheduler::FrameSignal &signal) {
    RNSURFACE_ASSERT_THREAD(_presentThread, "RNSkView::onFrameSignal");
    const auto window = windowState();
    const auto now = rnsurface::frameClockNow();
    run(_producer->pace([&](Scheduler &scheduler) {
      return scheduler.onFrameSignal(signal, now, window);
    }));
    if (platformPacingLogs()) {
      logPacing(now);
    }
  }

  /**
   Present thread: the window drew the frame it was given (a TextureView):
   the next one can go to it.
   */
  void onFrameConsumed() {
    RNSURFACE_ASSERT_THREAD(_presentThread, "RNSkView::onFrameConsumed");
    const auto window = windowState();
    const auto now = rnsurface::frameClockNow();
    run(_producer->pace([&](Scheduler &scheduler) {
      return scheduler.onFrameConsumed(now, window);
    }));
  }

  /**
   Present thread: the poll asked for with FrameHost::watchAcknowledgement.
   The held frame goes if the GPU is done with the one before it.
   */
  void onAcknowledgementPoll() {
    RNSURFACE_ASSERT_THREAD(_presentThread, "RNSkView::onAcknowledgementPoll");
    _acknowledgementWatched = false;
    const auto window = windowState();
    const auto now = rnsurface::frameClockNow();
    run(_producer->pace([&](Scheduler &scheduler) {
      return scheduler.onAcknowledgementPoll(now, window);
    }));
  }

  /**
   Present thread: the view left its window, or the window lost its surface.
   The scheduler forgets the frame signal it asked for: the platform view
   cancels it, or does not call onFrameSignal() for it (see
   wantsFrameSignal). The recordings stay, for the next window.
   */
  void cancelFrames() {
    RNSURFACE_ASSERT_THREAD(_presentThread, "RNSkView::cancelFrames");
    _producer->cancelFrames();
  }

  /**
   Present thread: whether a frame signal is asked for and has not come. A
   platform view that ticks on its own (a display link) pauses when none is,
   and one whose signal has no cancel drops a signal nobody asks for.
   */
  bool wantsFrameSignal() { return _producer->wantsFrameSignal(); }

  /**
   Present thread. The window can show frames again (the app came
   back to the foreground, see RNSkWindowSurface::setCanPresent): the redraw
   owed since one found it could not present is posted (see
   RNSkRedrawRequest), else the recordings queued meanwhile are handed to the
   frame scheduler. Nothing is replayed on the spot. A GPU device lost in the
   background (where iOS refuses GPU work) is replaced now that the app is
   back, and the view is asked for a frame once it is.
   */
  void onCanPresent() {
    DawnContext::requestRecovery();
    if (_redrawRequest.onCanPresent()) {
      postRedraw();
    } else {
      // What was queued meanwhile, or held, is the scheduler's again.
      const auto window = windowState();
      const auto now = rnsurface::frameClockNow();
      run(_producer->pace([&](Scheduler &scheduler) {
        return scheduler.onWindowAvailable(now, window);
      }));
    }
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
   What the window holds right now, for the scheduler (see
   Scheduler::WindowState): read before each of its entries, outside of the
   producer's lock, as the acknowledgement asks Dawn. Present thread.
   */
  Scheduler::WindowState windowState() {
    Scheduler::WindowState state;
    auto target = getTarget();
    state.available = target != nullptr &&
                      _surface->readState(nullptr) == RNSkWindowState::kReady;
    state.queued = target != nullptr && target->hasQueued();
    state.held = _surface->hasHeldFrame();
    // Asked only where the answer decides something: a frame is held for
    // it, or waits queued for it.
    const bool declines = _surface->getAcknowledgement() ==
                          Scheduler::Acknowledgement::kDeclinesFrame;
    state.acknowledged = state.held || (declines && state.queued)
                             ? _surface->isAcknowledged()
                             : true;
    return state;
  }

  /**
   Does what an entry of the scheduler asked for, and what the entries it
   reports back to ask for in turn. Present thread.
   */
  void run(Scheduler::Actions actions) {
    for (;;) {
      if (actions.requestFrameSignal) {
        requestFrameSignal();
      }
      if (actions.watchAcknowledgement) {
        watchAcknowledgement();
      }
      if (actions.takeFrame) {
        const auto taken = takeFrame();
        const auto window = windowState();
        const auto now = rnsurface::frameClockNow();
        actions = _producer->pace([&](Scheduler &scheduler) {
          return scheduler.onFrameTaken(taken, now, window);
        });
        continue;
      }
      if (actions.presentHeldFrame) {
        // A held frame the window lost meanwhile (taken back by the
        // platform, or its GPU device lost) went nowhere.
        const bool presented = _surface->presentHeldFrame();
        if (presented && _frameHost.onFramePresented) {
          _frameHost.onFramePresented();
        }
        const auto window = windowState();
        const auto now = rnsurface::frameClockNow();
        actions = _producer->pace([&](Scheduler &scheduler) {
          return presented ? scheduler.onHeldFramePresented(now, window)
                           : scheduler.onAcknowledgementPoll(now, window);
        });
        continue;
      }
      return;
    }
  }

  /**
   Logs what the scheduler did since the last log, at most once a second and
   only while frame signals come: for measuring a pacing policy on a device
   (see platformPacingPolicy). Present thread.
   */
  void logPacing(Scheduler::Nanos now) {
    if (now - _pacingLoggedAt < 1000000000) {
      return;
    }
    Scheduler::Stats stats;
    bool deep = false;
    Scheduler::Nanos interval = 0;
    Scheduler::Nanos deadline = 0;
    Scheduler::Nanos submit = 0;
    _producer->pace([&](Scheduler &scheduler) {
      stats = scheduler.stats();
      deep = scheduler.isDeep();
      interval = scheduler.interval();
      deadline = scheduler.deadlineAfterSignal();
      submit = scheduler.submitEstimate();
      return Scheduler::Actions();
    });
    const auto &last = _pacingLogged;
    const auto since = [](std::uint64_t now, std::uint64_t before) {
      return static_cast<unsigned long long>(now - before);
    };
    RNSkLogger::logToConsole(
        "pacing view=%zu depth=%d frame=%.2fms deadline=+%.2fms submit=%.2fms "
        "signals=%llu "
        "presents=%llu held=%llu onSignal=%llu inSlot=%llu urgent=%llu "
        "missed=%llu declined=%llu recordings=%llu late=%llu waiting=%llu "
        "depthChanges=%llu",
        _nativeId, deep ? 2 : 1, static_cast<double>(interval) / 1.0e6,
        static_cast<double>(deadline) / 1.0e6,
        static_cast<double>(submit) / 1.0e6,
        since(stats.frameSignals, last.frameSignals),
        since(stats.presents, last.presents), since(stats.holds, last.holds),
        since(stats.takenOnSignal, last.takenOnSignal),
        since(stats.takenInSlot, last.takenInSlot),
        since(stats.takenUrgent, last.takenUrgent),
        since(stats.missedDeadlines, last.missedDeadlines),
        since(stats.declined, last.declined),
        since(stats.recordings, last.recordings),
        since(stats.lateRecordings, last.lateRecordings),
        since(stats.waitingRecordings, last.waitingRecordings),
        since(stats.depthChanges, last.depthChanges));
    _pacingLoggedAt = now;
    _pacingLogged = stats;
  }

  void requestFrameSignal() {
    if (_frameHost.requestFrameSignal) {
      _frameHost.requestFrameSignal();
      return;
    }
    // No platform view to signal the display's frames: the view signals
    // itself, a task behind those queued, and presents unpaced.
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    _runOnPresentThread([weakThis]() {
      auto view = weakThis.lock();
      if (view != nullptr && view->wantsFrameSignal()) {
        const auto now = rnsurface::frameClockNow();
        view->onFrameSignal({now, kUnpacedInterval, now});
      }
    });
  }

  void watchAcknowledgement() {
    if (_acknowledgementWatched) {
      return;
    }
    _acknowledgementWatched = true;
    if (_frameHost.watchAcknowledgement) {
      _frameHost.watchAcknowledgement();
      return;
    }
    // No timer: asked again a task behind those queued.
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    _runOnPresentThread([weakThis]() {
      if (auto view = weakThis.lock()) {
        view->onAcknowledgementPoll();
      }
    });
  }

  /**
   Present thread. Takes one frame off the target for the window, as the
   scheduler asked: the producer runs up to a frame ahead, and clients queue
   what they like, so more than one recording can be waiting; replaying two
   would cost the GPU two frames for one shown, which halves a GPU-bound
   canvas. The others wait for their own frame of the display. Recordings
   for a size the window no longer has still go together: present() drops
   those for the one behind them. Without a window that can show a frame,
   the queue is left alone: attaching a window, replacing the device and
   onCanPresent() each step the scheduler again.
   */
  Scheduler::Taken takeFrame() {
    auto target = getTarget();
    RNSkGraphiteTargetInfo targetInfo;
    if (target == nullptr ||
        _surface->readState(&targetInfo) != RNSkWindowState::kReady) {
      return {};
    }
    auto recordings = target->takeQueued();
    if (recordings.empty()) {
      return {};
    }
    if (recordings.size() > 1 && recordings.front()->hasSizeOf(targetInfo)) {
      target->requeue({recordings.begin() + 1, recordings.end()});
      recordings.resize(1);
    }
    return presentTaken(*target, targetInfo, std::move(recordings),
                        /* fromQueue= */ true);
  }

  /**
   Presents recordings onto the window and says what came of it, in the
   scheduler's terms. Those taken off the target (`fromQueue`) are the
   producer's to know of, by identity, as its ready recording leaves its slot
   when the window takes it (see RNSkGraphiteProducer::onFramesTaken), and
   count as done for the clients pacing on the target (see
   RNSkGraphiteTarget::pendingFrames), also when the window could not take
   every one: the ones it kept went back to the queue, and count once
   presented.
   */
  Scheduler::Taken
  presentTaken(RNSkGraphiteTarget &target,
               const RNSkGraphiteTargetInfo &targetInfo,
               std::vector<std::shared_ptr<RNSkGraphiteRecording>> recordings,
               bool fromQueue) {
    if (fromQueue) {
      _producer->onFramesTaken(recordings);
    }
    const auto presentsBefore = _surface->presentCount();
    const auto startedAt = rnsurface::frameClockNow();
    const auto presented =
        presentOrKeep(target, targetInfo, std::move(recordings));
    Scheduler::Taken taken;
    taken.duration = rnsurface::frameClockNow() - startedAt;
    if (fromQueue && presented.done > 0) {
      target.onRecordingsDone(presented.done);
    }
    if (_surface->presentCount() != presentsBefore) {
      taken.take = Scheduler::Take::kPresented;
      if (_frameHost.onFramePresented) {
        _frameHost.onFramePresented();
      }
    } else if (presented.shown && _surface->hasHeldFrame()) {
      // The window took the frame and holds its present: also when it
      // dropped the frame it held before with its swapchain (a resize).
      taken.take = Scheduler::Take::kHeld;
    } else if (!presented.allDone) {
      taken.take = Scheduler::Take::kDeclined;
    }
    return taken;
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

  /**
   Runs redraw() on the present thread, when it gets to it, unless a redraw
   took the request meanwhile.
   */
  void postRedraw() {
    std::weak_ptr<RNSkView> weakThis = weak_from_this();
    _runOnPresentThread([weakThis]() {
      if (auto view = weakThis.lock()) {
        if (view->_redrawRequest.isWaiting()) {
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
    // How many of the recordings are done, from the front; the rest went
    // back to the queue.
    size_t done;
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
    size_t done = 0;
    for (int attempt = 0;; attempt++) {
      const auto replayed =
          present(*_surface, targetInfo, recordings, /* remember= */ true);
      shown = shown || replayed.shown;
      done += replayed.done;
      if (replayed.done == recordings.size()) {
        return {true, shown, done};
      }
      recordings.erase(recordings.begin(),
                       recordings.begin() + static_cast<long>(replayed.done));
      RNSkGraphiteTargetInfo now;
      if (attempt == 0 && _surface->getTargetInfo(&now) && now != targetInfo) {
        targetInfo = now;
        continue;
      }
      // Back in the queue, and the producer's ready recording back in its
      // slot if it is among them.
      _producer->onFramesReturned(recordings);
      target.requeue(std::move(recordings));
      return {false, shown, done};
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
      if (!recording->hasSizeOf(targetInfo)) {
        // A recording made for a size the window had: declarative content,
        // which is recorded again for the window as it is now (see redraw),
        // or an imperative frame submitted before the resize. The frame is
        // stale, but it carries the latest content: a declarative one goes
        // onto the window while the window still has that size (the
        // platform stretches it to the view until the frame for the new
        // size lands) when the window shows the latest frame presented
        // rather than each in turn (see setWindow): it costs
        // a present and nothing else there. An imperative one does not, as
        // no frame for the new size need follow it. Otherwise it is dropped
        // when another recording follows it or a declarative frame is on its
        // way, as presenting it would only hold that one up (a view resized on
        // every frame has a frame's worth of work in the present alone, see
        // RNSkWindowSurface::configureIfNeeded, and one presented through a
        // texture costs a texture pass each: imperative frames queued faster
        // than a slow GPU presents them would pile up for good, as they did
        // on the CI emulator), and shown through a texture, stretched, when
        // nothing is: better than the previous frame.
        if (!flush(i)) {
          taken = false;
          break;
        }
        if (_producer->hasContent() && _windowTakesLatestFrame &&
            &surface == _surface.get() &&
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
  FrameHost _frameHost;
  bool _windowTakesLatestFrame = false;
  // A poll for the acknowledgement is on its way (see
  // watchAcknowledgement). Present thread.
  bool _acknowledgementWatched = false;
  // What a view without a platform view to signal the display's frames
  // takes a frame to last (see requestFrameSignal).
  static constexpr Scheduler::Nanos kUnpacedInterval = 16666667;
  // What the last log of the scheduler's doings showed, and when (see
  // logPacing). Present thread.
  Scheduler::Stats _pacingLogged;
  Scheduler::Nanos _pacingLoggedAt = 0;
  std::function<void(std::function<void()>)> _runOnPresentThread;
  RNSkRedrawRequest _redrawRequest;
  // The thread the view presents on (see the class comment).
  rnsurface::ThreadChecker _presentThread;

  // The target is bound on the JS thread and read on the present thread and
  // by snapshots; the last presented frame is written by the present thread
  // and read by snapshots.
  std::mutex _mutex;
  std::shared_ptr<RNSkGraphiteTarget> _target;
  std::shared_ptr<RNSkGraphiteRecording> _lastPresented;
};

} // namespace RNSkia
