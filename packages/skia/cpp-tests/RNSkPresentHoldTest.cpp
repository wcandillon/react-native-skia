// Host-side checks of RNSkia::RNSkPresentHold, which holds a window's present
// for the GPU and gives it one frame a tick (see run.sh).

#include <algorithm>
#include <cstddef>
#include <cstdio>
#include <functional>
#include <optional>
#include <type_traits>
#include <utility>
#include <vector>

#include "rnskia/RNSkPresentHold.h"

namespace RNSkia {
namespace {

int failures = 0;

bool expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
  return condition;
}

/** The work a window's frames gave the GPU: frame n is work n. */
struct GpuQueue {
  int submitted = 0;
  int finished = 0;
  int tracked = 0;
};

/**
 The queue of the window whose hold is running. A window holds its queue by
 value, so that the searches below carry a window down by copying it, and
 installs it around every call into its hold (see Window::Driving).
 */
GpuQueue *&drivenQueue() {
  static GpuQueue *queue = nullptr;
  return queue;
}

/** The GPU as RNSkPresentHold sees it: the queue of the window driving it. */
class FakeGpu {
public:
  using Work = int;

  int track() {
    auto &queue = *drivenQueue();
    queue.tracked++;
    return queue.submitted;
  }

  bool isDone(const int &work) const { return drivenQueue()->finished >= work; }
};

using Hold = RNSkPresentHold<FakeGpu>;

static_assert(!std::is_default_constructible_v<Hold>,
              "a window's hold is chosen when the window is made");

constexpr PresentHold kHolds[] = {PresentHold::kNone,
                                  PresentHold::kOncePerTickAfterPreviousFrame};

/**
 A window's side of the hold, as RNSkWindowSurface drives it: the frames it
 replays, presents and drops, and the GPU they run on.
 */
class Window {
public:
  explicit Window(PresentHold hold)
      : _hold(hold), _presentHold(hold, FakeGpu()) {}

  /**
   The window replays a frame, unless it takes none now (see
   RNSkPresentHold::takesFrame): the frame then stays queued. A frame for a
   window resized since its swapchain was configured configures it again
   first, as RNSkWindowSurface does.
   */
  bool replay(bool forResizedWindow = false) {
    if (!_presentHold.takesFrameOnceConfigured([this, forResizedWindow]() {
          if (forResizedWindow) {
            reconfigure();
          }
        })) {
      return false;
    }
    _frame = ++_gpu.submitted;
    _replayed.push_back(_frame);
    Driving driving(_gpu);
    _presentHold.presentOrHold([this] { present(); });
    return true;
  }

  HeldFrame presentHeldFrame() {
    Driving driving(_gpu);
    return _presentHold.presentHeldFrame([this] { present(); });
  }

  /** A frame of the display asks the window to present. */
  void tick() {
    Driving driving(_gpu);
    _presentHold.allowNextPresent();
    _presentedSinceTick = 0;
  }

  /**
   Another window on the same GPU queue submits a frame of its own, after the
   frames of this one submitted so far: once, which the searches below place
   anywhere among this window's frames, and only beside a window that holds
   frames, the one its work can delay.
   */
  bool submitOtherWindowsWork() {
    if (_hold == PresentHold::kNone ||
        _otherWindowsFrames == kMostOtherWindowsFrames) {
      return false;
    }
    _otherWindowsFrames++;
    ++_gpu.submitted;
    return true;
  }

  /** The GPU finishes the oldest frame it is on. */
  bool finishGpuFrame() {
    if (_gpu.finished == _gpu.submitted) {
      return false;
    }
    _gpu.finished++;
    return true;
  }

  /**
   The window's surface is replaced, as when its GPU device is: a held frame
   goes with it, since nothing can present it anymore.
   */
  void replaceSurface() {
    if (_presentHold.hasHeldFrame()) {
      _dropped.push_back(_frame);
    }
    Driving driving(_gpu);
    _presentHold.dropFrames();
    _lastPresentFence = std::nullopt;
    _presentedSinceTick = 0;
  }

  /**
   The swapchain is reconfigured for a new size: its held frame is presented
   into it first, whatever the GPU and the tick.
   */
  void reconfigure() { release(); }

  /**
   The window goes away: its held frame is presented into it before the
   swapchain goes, whatever the GPU and the tick, and the next window starts
   afresh.
   */
  void detach() { release(); }

  bool hasHeldFrame() const { return _presentHold.hasHeldFrame(); }
  int tracked() const { return _gpu.tracked; }
  const std::vector<int> &replayed() const { return _replayed; }
  const std::vector<int> &presented() const { return _presented; }
  const std::vector<int> &dropped() const { return _dropped; }
  /** The frames presented into a swapchain about to change. */
  const std::vector<int> &released() const { return _released; }
  /**
   Whether a frame was ever presented while the GPU was still on work the
   present before it covers, on the same swapchain: that present's fence
   signals once every submit before it is done, other windows' included, and
   the next present waits for it (libgui's queueBuffer).
   */
  bool presentedOverBusyGpu() const { return _presentedOverBusyGpu; }
  /** The most frames ever presented on one swapchain between two ticks. */
  int mostPresentedInATick() const { return _mostPresentedInATick; }

private:
  /** Installs a window's queue for the calls into its hold (see drivenQueue).
   */
  class Driving {
  public:
    explicit Driving(GpuQueue &queue) { drivenQueue() = &queue; }
    ~Driving() { drivenQueue() = nullptr; }
    Driving(const Driving &) = delete;
    Driving &operator=(const Driving &) = delete;
  };

  void present() {
    _presentedOverBusyGpu =
        _presentedOverBusyGpu ||
        (_lastPresentFence && _gpu.finished < *_lastPresentFence);
    _lastPresentFence = _gpu.submitted;
    _presented.push_back(_frame);
    _mostPresentedInATick =
        std::max(_mostPresentedInATick, ++_presentedSinceTick);
  }

  void release() {
    Driving driving(_gpu);
    _presentHold.releaseFrames([this] { _released.push_back(_frame); });
    _lastPresentFence = std::nullopt;
    _presentedSinceTick = 0;
  }

  static constexpr int kMostOtherWindowsFrames = 1;

  PresentHold _hold;
  GpuQueue _gpu;
  Hold _presentHold;
  int _frame = 0;
  int _otherWindowsFrames = 0;
  // The work the swapchain's last present covers: every submit before it.
  std::optional<int> _lastPresentFence;
  bool _presentedOverBusyGpu = false;
  int _presentedSinceTick = 0;
  int _mostPresentedInATick = 0;
  std::vector<int> _replayed;
  std::vector<int> _presented;
  std::vector<int> _dropped;
  std::vector<int> _released;
};

enum class Event {
  kReplay,
  kPresentHeldFrame,
  kFinishGpuFrame,
  kSubmitOtherWindowsWork,
  kReconfigure,
  kReplaceSurface,
  kTick,
  kDetach
};

constexpr Event kEvents[] = {
    Event::kReplay,         Event::kPresentHeldFrame,
    Event::kFinishGpuFrame, Event::kSubmitOtherWindowsWork,
    Event::kReconfigure,    Event::kReplaceSurface,
    Event::kTick,           Event::kDetach};

/** Applies an event the window can take in its state. Returns whether it could.
 */
bool apply(Window &window, Event event) {
  switch (event) {
  case Event::kReplay:
    return window.replay();
  case Event::kPresentHeldFrame:
    return window.presentHeldFrame() != HeldFrame::kNone;
  case Event::kFinishGpuFrame:
    return window.finishGpuFrame();
  case Event::kSubmitOtherWindowsWork:
    return window.submitOtherWindowsWork();
  case Event::kReconfigure:
    window.reconfigure();
    return true;
  case Event::kReplaceSurface:
    window.replaceSurface();
    return true;
  case Event::kTick:
    window.tick();
    return true;
  case Event::kDetach:
    window.detach();
    return true;
  }
  return false;
}

/** A check of the window a sequence left, given the window before its last
 * event. */
using Check = std::function<void(const std::vector<Event> &sequence,
                                 const Window &before, const Window &after)>;

void forEachSequence(const Window &window, size_t depth, const Check &check,
                     std::vector<Event> &sequence) {
  if (sequence.size() == depth) {
    return;
  }
  for (Event event : kEvents) {
    Window next = window;
    if (!apply(next, event)) {
      continue;
    }
    sequence.push_back(event);
    check(sequence, window, next);
    if (event != Event::kDetach) {
      forEachSequence(next, depth, check, sequence);
    }
    sequence.pop_back();
  }
}

/**
 Every sequence of events up to a depth a window with `hold` can take: `check`
 runs after each event. A detach ends a sequence: the window that follows
 starts as one after a reconfigure does, which the sequences already cover.
 */
void forEachSequence(PresentHold hold, const Check &check) {
  std::vector<Event> sequence;
  forEachSequence(Window(hold), 9, check, sequence);
}

void presentsEveryFrameAtOnceWithoutHolding() {
  Window window(PresentHold::kNone);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
  expect(window.tracked() == 0, "window.tracked() == 0");
}

void ticksChangeNothingWithoutHolding() {
  Window window(PresentHold::kNone);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1, 2, 3}),
         "window.presented() == (std::vector<int>{1, 2, 3})");
}

void presentsTheFirstFrameAtOnce() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1}),
         "window.presented() == (std::vector<int>{1})");
}

void holdsAFrameWhileTheGpuIsOnThePreviousOne() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(window.hasHeldFrame(), "window.hasHeldFrame()");
  expect(!window.replay(), "!window.replay()");
  expect(window.presentHeldFrame() == HeldFrame::kWaitingForGpu,
         "window.presentHeldFrame() == HeldFrame::kWaitingForGpu");
  expect(window.presented() == (std::vector<int>{1}),
         "window.presented() == (std::vector<int>{1})");
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  expect(window.presentHeldFrame() == HeldFrame::kPresented,
         "window.presentHeldFrame() == HeldFrame::kPresented");
}

void presentsTheHeldFrameOnceTheGpuIsDone() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  expect(window.presentHeldFrame() == HeldFrame::kPresented,
         "window.presentHeldFrame() == HeldFrame::kPresented");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
  expect(window.presentHeldFrame() == HeldFrame::kNone,
         "window.presentHeldFrame() == HeldFrame::kNone");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
}

void presentsAFrameAtOnceOnceTheGpuIsDoneAfterATick() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
}

void waitsForTheGpuWorkSubmittedBeforeThePresentBeforeIt() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.hasHeldFrame(), "window.hasHeldFrame()")) {
    return;
  }
  if (!expect(window.submitOtherWindowsWork(),
              "window.submitOtherWindowsWork()")) {
    return;
  }
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  window.tick();
  if (!expect(window.presentHeldFrame() == HeldFrame::kPresented,
              "window.presentHeldFrame() == HeldFrame::kPresented")) {
    return;
  }
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(window.hasHeldFrame(), "window.hasHeldFrame()");
  expect(window.presentHeldFrame() == HeldFrame::kWaitingForGpu,
         "window.presentHeldFrame() == HeldFrame::kWaitingForGpu");
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  expect(window.presentHeldFrame() == HeldFrame::kPresented,
         "window.presentHeldFrame() == HeldFrame::kPresented");
  expect(window.presented() == (std::vector<int>{1, 2, 4}),
         "window.presented() == (std::vector<int>{1, 2, 4})");
  expect(!window.presentedOverBusyGpu(), "!window.presentedOverBusyGpu()");
}

void takesNoSecondFrameInATickWhateverTheGpu() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  expect(!window.replay(), "!window.replay()");
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1}),
         "window.presented() == (std::vector<int>{1})");

  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
}

void takesTheFrameAfterAHeldOneAtTheNextTick() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  window.tick();
  if (!expect(window.presentHeldFrame() == HeldFrame::kPresented,
              "window.presentHeldFrame() == HeldFrame::kPresented")) {
    return;
  }
  expect(!window.replay(), "!window.replay()");
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1, 2, 3}),
         "window.presented() == (std::vector<int>{1, 2, 3})");
}

void aTickPresentsTheHeldFrameOnlyOnceTheGpuIsDone() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  expect(window.presentHeldFrame() == HeldFrame::kWaitingForGpu,
         "window.presentHeldFrame() == HeldFrame::kWaitingForGpu");
  if (!expect(window.finishGpuFrame(), "window.finishGpuFrame()")) {
    return;
  }
  expect(window.presentHeldFrame() == HeldFrame::kPresented,
         "window.presentHeldFrame() == HeldFrame::kPresented");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
}

void dropsTheHeldFrameWithItsSurface() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.hasHeldFrame(), "window.hasHeldFrame()")) {
    return;
  }
  window.replaceSurface();
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presentHeldFrame() == HeldFrame::kNone,
         "window.presentHeldFrame() == HeldFrame::kNone");
  window.replaceSurface();
  expect(window.dropped() == (std::vector<int>{2}),
         "window.dropped() == (std::vector<int>{2})");
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(window.presented() == (std::vector<int>{1, 3}),
         "window.presented() == (std::vector<int>{1, 3})");
}

void presentsTheHeldFrameBeforeItsSwapchainIsReconfigured() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.hasHeldFrame(), "window.hasHeldFrame()")) {
    return;
  }
  window.reconfigure();
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.released() == (std::vector<int>{2}),
         "window.released() == (std::vector<int>{2})");
  expect(window.dropped().empty(), "window.dropped().empty()");
  window.reconfigure();
  expect(window.released() == (std::vector<int>{2}),
         "window.released() == (std::vector<int>{2})");
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(window.presented() == (std::vector<int>{1, 3}),
         "window.presented() == (std::vector<int>{1, 3})");
}

void aNewSwapchainWaitsForNoFrameTheOldOneHad() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.reconfigure();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
}

void aNewSwapchainTakesAFrameInTheTickTheOldOnePresentedIn() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(!window.replay(), "!window.replay()");
  expect(window.replay(/* forResizedWindow= */ true),
         "window.replay(/* forResizedWindow= */ true)");
  expect(window.presented() == (std::vector<int>{1, 2}),
         "window.presented() == (std::vector<int>{1, 2})");
}

void presentsTheHeldFrameWhenItsWindowGoesAway() {
  Window window(PresentHold::kOncePerTickAfterPreviousFrame);
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  window.tick();
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  if (!expect(window.hasHeldFrame(), "window.hasHeldFrame()")) {
    return;
  }
  window.detach();
  expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
  expect(window.released() == (std::vector<int>{2}),
         "window.released() == (std::vector<int>{2})");
  expect(window.dropped().empty(), "window.dropped().empty()");
  if (!expect(window.replay(), "window.replay()")) {
    return;
  }
  expect(window.presented() == (std::vector<int>{1, 3}),
         "window.presented() == (std::vector<int>{1, 3})");
}

void presentsNothingWhenAWindowHoldingNoFrameGoesAway() {
  for (PresentHold hold : kHolds) {
    Window window(hold);
    window.detach();
    if (!expect(window.replay(), "window.replay()")) {
      return;
    }
    window.detach();
    expect(window.released().empty(), "window.released().empty()");
    expect(window.presented() == (std::vector<int>{1}),
           "window.presented() == (std::vector<int>{1})");
  }
}

void leavesNoFrameHeldWhenItsWindowGoesAwayInEverySequence() {
  for (PresentHold hold : kHolds) {
    size_t released = 0;
    forEachSequence(hold, [&released](const std::vector<Event> &sequence,
                                      const Window &attached,
                                      const Window &window) {
      if (sequence.back() != Event::kDetach) {
        return;
      }
      expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
      std::vector<int> expected = attached.released();
      if (attached.hasHeldFrame()) {
        expected.push_back(window.replayed().back());
      }
      expect(window.released() == expected, "window.released() == expected");
      released += window.released().size() - attached.released().size();
    });
    expect((released > 0) ==
               (hold == PresentHold::kOncePerTickAfterPreviousFrame),
           "(released > 0) == (hold == "
           "PresentHold::kOncePerTickAfterPreviousFrame)");
  }
}

void neverPresentsOverABusyGpuInEverySequence() {
  for (PresentHold hold : kHolds) {
    bool presentedOverBusyGpu = false;
    forEachSequence(hold, [&presentedOverBusyGpu](const std::vector<Event> &,
                                                  const Window &,
                                                  const Window &window) {
      presentedOverBusyGpu =
          presentedOverBusyGpu || window.presentedOverBusyGpu();
    });
    expect(presentedOverBusyGpu == (hold == PresentHold::kNone),
           "presentedOverBusyGpu == (hold == PresentHold::kNone)");
  }
}

void presentsOrDropsEveryFrameOnceInOrderInEverySequence() {
  for (PresentHold hold : kHolds) {
    size_t mostDropped = 0;
    forEachSequence(hold, [&mostDropped](const std::vector<Event> &,
                                         const Window &, const Window &window) {
      const auto &presented = window.presented();
      expect(std::is_sorted(presented.begin(), presented.end()),
             "std::is_sorted(presented.begin(), presented.end())");
      std::vector<int> settled = presented;
      settled.insert(settled.end(), window.dropped().begin(),
                     window.dropped().end());
      settled.insert(settled.end(), window.released().begin(),
                     window.released().end());
      std::sort(settled.begin(), settled.end());
      std::vector<int> expected = window.replayed();
      if (window.hasHeldFrame()) {
        expected.pop_back();
      }
      expect(settled == expected, "settled == expected");
      mostDropped = std::max(mostDropped, window.dropped().size());
    });
    expect((mostDropped > 0) ==
               (hold == PresentHold::kOncePerTickAfterPreviousFrame),
           "(mostDropped > 0) == (hold == "
           "PresentHold::kOncePerTickAfterPreviousFrame)");
  }
}

void presentsAtMostOneFrameATickInEverySequence() {
  for (PresentHold hold : kHolds) {
    int mostPresentedInATick = 0;
    forEachSequence(hold, [&mostPresentedInATick](const std::vector<Event> &,
                                                  const Window &,
                                                  const Window &window) {
      mostPresentedInATick =
          std::max(mostPresentedInATick, window.mostPresentedInATick());
    });
    expect((mostPresentedInATick > 1) == (hold == PresentHold::kNone),
           "(mostPresentedInATick > 1) == (hold == PresentHold::kNone)");
  }
}

void holdsAFrameOnlyWhileTheGpuIsBusyInEverySequence() {
  size_t held = 0;
  forEachSequence(
      PresentHold::kOncePerTickAfterPreviousFrame,
      [&held](const std::vector<Event> &sequence, const Window &,
              const Window &window) {
        if (sequence.back() != Event::kReplay || !window.hasHeldFrame()) {
          return;
        }
        held++;
        Window probe = window;
        expect(probe.presentHeldFrame() == HeldFrame::kWaitingForGpu,
               "probe.presentHeldFrame() == HeldFrame::kWaitingForGpu");
      });
  expect(held > 0, "held > 0");
}

void takesAFrameAfterTheGpuAndATickInEverySequence() {
  for (PresentHold hold : kHolds) {
    size_t held = 0;
    forEachSequence(hold, [&held](const std::vector<Event> &, const Window &,
                                  const Window &reached) {
      held += reached.hasHeldFrame() ? 1 : 0;
      Window window = reached;
      while (window.finishGpuFrame()) {
      }
      window.tick();
      const auto heldFrame = window.presentHeldFrame();
      expect(heldFrame != HeldFrame::kWaitingForGpu,
             "heldFrame != HeldFrame::kWaitingForGpu");
      expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
      if (heldFrame == HeldFrame::kPresented) {
        expect(!window.replay(), "!window.replay()");
        while (window.finishGpuFrame()) {
        }
        window.tick();
      }
      expect(window.replay(), "window.replay()");
      expect(!window.hasHeldFrame(), "!window.hasHeldFrame()");
    });
    expect(
        (held > 0) == (hold == PresentHold::kOncePerTickAfterPreviousFrame),
        "(held > 0) == (hold == PresentHold::kOncePerTickAfterPreviousFrame)");
  }
}

} // namespace
} // namespace RNSkia

int main() {
  RNSkia::presentsEveryFrameAtOnceWithoutHolding();
  RNSkia::ticksChangeNothingWithoutHolding();
  RNSkia::presentsTheFirstFrameAtOnce();
  RNSkia::holdsAFrameWhileTheGpuIsOnThePreviousOne();
  RNSkia::presentsTheHeldFrameOnceTheGpuIsDone();
  RNSkia::presentsAFrameAtOnceOnceTheGpuIsDoneAfterATick();
  RNSkia::waitsForTheGpuWorkSubmittedBeforeThePresentBeforeIt();
  RNSkia::takesNoSecondFrameInATickWhateverTheGpu();
  RNSkia::takesTheFrameAfterAHeldOneAtTheNextTick();
  RNSkia::aTickPresentsTheHeldFrameOnlyOnceTheGpuIsDone();
  RNSkia::dropsTheHeldFrameWithItsSurface();
  RNSkia::presentsTheHeldFrameBeforeItsSwapchainIsReconfigured();
  RNSkia::aNewSwapchainWaitsForNoFrameTheOldOneHad();
  RNSkia::aNewSwapchainTakesAFrameInTheTickTheOldOnePresentedIn();
  RNSkia::presentsTheHeldFrameWhenItsWindowGoesAway();
  RNSkia::presentsNothingWhenAWindowHoldingNoFrameGoesAway();
  RNSkia::leavesNoFrameHeldWhenItsWindowGoesAwayInEverySequence();
  RNSkia::neverPresentsOverABusyGpuInEverySequence();
  RNSkia::presentsOrDropsEveryFrameOnceInOrderInEverySequence();
  RNSkia::presentsAtMostOneFrameATickInEverySequence();
  RNSkia::holdsAFrameOnlyWhileTheGpuIsBusyInEverySequence();
  RNSkia::takesAFrameAfterTheGpuAndATickInEverySequence();
  if (RNSkia::failures == 0) {
    std::printf("RNSkPresentHoldTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "RNSkPresentHoldTest: %d failure(s)\n",
               RNSkia::failures);
  return 1;
}
