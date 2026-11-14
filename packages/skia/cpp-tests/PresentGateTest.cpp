// Host-side check of rnsurface::PresentGate, which keeps a present from
// waiting for the GPU on Android, and of what the frame scheduler does with
// the frame it declines (see run.sh). The GPU is a stand-in: work is a serial,
// done once the stand-in says so.

#include <cstdint>
#include <cstdio>

#include "rnsurface/FrameScheduler.h"
#include "rnsurface/PresentGate.h"

namespace {

using rnsurface::FrameScheduler;
using rnsurface::PresentGate;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Work submitted is numbered; the GPU is done with it up to `completed`.
struct GpuState {
  uint64_t submitted = 0;
  uint64_t completed = 0;
  int asked = 0;
};

struct Gpu {
  using Work = uint64_t;
  GpuState *state;
  Work track() const { return state->submitted; }
  bool isDone(const Work &work) const {
    state->asked++;
    return work <= state->completed;
  }
};

void aWindowThatPresentedNothingTakesAFrame() {
  GpuState gpu;
  PresentGate<Gpu> gate(Gpu{&gpu});
  expect(gate.isOpen(), "no frame presented yet: open");
  expect(gpu.asked == 0, "no frame presented yet: the GPU is not asked");
}

void aFrameIsDeclinedWhileTheGpuIsOnThePreviousOne() {
  GpuState gpu;
  PresentGate<Gpu> gate(Gpu{&gpu});
  gpu.submitted = 1;
  gate.onPresented();
  expect(!gate.isOpen(), "the GPU is on the frame presented: closed");
  expect(!gate.isOpen(), "still on it: still closed");
  gpu.completed = 1;
  expect(gate.isOpen(), "the GPU is done with it: open");
  const int asked = gpu.asked;
  expect(gate.isOpen(), "open until the next present");
  expect(gpu.asked == asked, "work found done is not asked about again");
}

void aFrameWaitsForEverythingSubmittedBeforeThePreviousPresent() {
  GpuState gpu;
  PresentGate<Gpu> gate(Gpu{&gpu});
  // Another window's work, and an offscreen surface's, went to the queue
  // before the present: the fence of the frame covers them too.
  gpu.submitted = 3;
  gate.onPresented();
  gpu.completed = 2;
  expect(!gate.isOpen(), "work submitted before the present is waited for");
  // Work submitted after the present is not.
  gpu.submitted = 5;
  gpu.completed = 3;
  expect(gate.isOpen(), "work submitted after the present is not waited for");
}

void eachPresentIsWaitedForInTurn() {
  GpuState gpu;
  PresentGate<Gpu> gate(Gpu{&gpu});
  gpu.submitted = 1;
  gate.onPresented();
  gpu.completed = 1;
  expect(gate.isOpen(), "first frame done: open");
  gpu.submitted = 2;
  gate.onPresented();
  expect(!gate.isOpen(), "second frame presented: closed again");
  gpu.completed = 2;
  expect(gate.isOpen(), "second frame done: open");
}

void aWindowThatIsGoneWaitsForNothing() {
  GpuState gpu;
  PresentGate<Gpu> gate(Gpu{&gpu});
  gpu.submitted = 1;
  gate.onPresented();
  gate.reset();
  expect(gate.isOpen(), "the next window has presented nothing: open");
}

// A window as RNSkView::presentFrame drives it: one recording a present,
// declined, and left queued, while the gate is closed.
struct Host : FrameScheduler::Host {
  GpuState gpu;
  PresentGate<Gpu> gate{Gpu{&gpu}};
  int queued = 0;
  int presents = 0;
  int callbacks = 0;

  void postFrameCallback() override { callbacks++; }

  int presentFrame() override {
    if (!gate.isOpen()) {
      return queued > 0 ? FrameScheduler::kMoreQueued
                        : FrameScheduler::kNothingPresented;
    }
    if (queued == 0) {
      return FrameScheduler::kNothingPresented;
    }
    queued--;
    gpu.submitted++;
    gate.onPresented();
    presents++;
    return queued > 0 ? FrameScheduler::kPresented | FrameScheduler::kMoreQueued
                      : FrameScheduler::kPresented;
  }
};

void aDeclinedFrameIsTriedAgainOnTheNextVsync(FrameScheduler::Window window,
                                              const char *what) {
  Host host;
  FrameScheduler scheduler(host);
  scheduler.setWindow(window);
  // The first frame goes to the window: on its vsync, or on the spot.
  host.queued = 1;
  scheduler.requestFrame();
  if (window == FrameScheduler::Window::kShowsEachFrame) {
    scheduler.onFrame();
  } else {
    scheduler.onFrameConsumed();
  }
  expect(host.presents == 1, what);
  // The second comes while the GPU is still on the first.
  host.queued = 1;
  scheduler.requestFrame();
  if (window == FrameScheduler::Window::kShowsEachFrame) {
    scheduler.onFrame();
  }
  expect(host.presents == 1, "a frame is declined while the GPU is busy");
  expect(host.queued == 1, "a declined frame stays queued");
  expect(scheduler.isFrameCallbackPosted(),
         "a declined frame asks for the next vsync");
  // Still busy on that vsync: declined again, and asked for again.
  scheduler.onFrame();
  expect(host.presents == 1, "still busy: declined again");
  expect(scheduler.isFrameCallbackPosted(), "still busy: asks again");
  // The GPU is done: the frame goes on the vsync that follows.
  host.gpu.completed = host.gpu.submitted;
  scheduler.onFrame();
  expect(host.presents == 2, "the GPU is done: the frame is presented");
  expect(host.queued == 0, "the GPU is done: nothing is left queued");
  expect(!scheduler.isFrameCallbackPosted(),
         "nothing queued: no vsync is asked for");
}

void aClosedGateWithNothingQueuedAsksForNoVsync() {
  Host host;
  FrameScheduler scheduler(host);
  scheduler.setWindow(FrameScheduler::Window::kShowsEachFrame);
  host.queued = 1;
  scheduler.requestFrame();
  const int callbacks = host.callbacks;
  scheduler.onFrame();
  expect(host.presents == 1, "the frame is presented");
  expect(host.callbacks == callbacks && !scheduler.isFrameCallbackPosted(),
         "the GPU is busy with nothing queued: no vsync is asked for");
}

} // namespace

int main() {
  aWindowThatPresentedNothingTakesAFrame();
  aFrameIsDeclinedWhileTheGpuIsOnThePreviousOne();
  aFrameWaitsForEverythingSubmittedBeforeThePreviousPresent();
  eachPresentIsWaitedForInTurn();
  aWindowThatIsGoneWaitsForNothing();
  aDeclinedFrameIsTriedAgainOnTheNextVsync(
      FrameScheduler::Window::kShowsEachFrame,
      "a SurfaceView's first frame is presented");
  aDeclinedFrameIsTriedAgainOnTheNextVsync(
      FrameScheduler::Window::kShowsLatestFrame,
      "a TextureView's first frame is presented");
  aClosedGateWithNothingQueuedAsksForNoVsync();
  if (failures > 0) {
    return 1;
  }
  std::printf("PresentGateTest: passed\n");
  return 0;
}
