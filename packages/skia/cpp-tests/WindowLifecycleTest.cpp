// Host-side check of RNSkia::RNSkWindowLifecycle, what a window is through
// its life (see run.sh): the window surface makes the Dawn calls, and what
// follows from an attach, a detach, an abandon, a resize, a GPU device
// replaced or a present is decided there, with no Dawn in it. Each test
// plays what the platform view and the present thread do, in the order they
// can land.

#include <cstdint>
#include <cstdio>

#include "rnskia/RNSkWindowLifecycle.h"

namespace {

using RNSkia::RNSkWindowLifecycle;
using RNSkia::RNSkWindowState;
using Offer = RNSkWindowLifecycle::Offer;
using SurfaceCheck = RNSkWindowLifecycle::SurfaceCheck;
using Wait = RNSkWindowLifecycle::WaitForPreviousWork;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Two windows to tell apart: only their addresses are used.
int windowA = 0;
int windowB = 0;

// The GPU, as the window surface asks it: whether it is done with the work
// of the last present, and how often it was asked.
struct Gpu {
  bool done = true;
  int asked = 0;
  auto ask() {
    return [this]() {
      asked++;
      return done;
    };
  }
};

const auto always = []() { return true; };

// What RNSkWindowSurface::attach does once the surface is made.
void attachOn(RNSkWindowLifecycle &window, void *handle, uint64_t generation) {
  window.attach(handle);
  window.bindDevice(generation);
  window.surfaceMade();
}

// What a present does, from the frame replayed to the present made.
Offer present(RNSkWindowLifecycle &window, Gpu &gpu) {
  if (window.needsConfigure()) {
    window.configured();
  }
  const auto offer = window.offerFrame(gpu.ask());
  if (offer == Offer::kPresent && window.presented()) {
    window.rememberPresentedWork();
  }
  return offer;
}

void aWindowIsNoneUntilAttached() {
  RNSkWindowLifecycle window;
  expect(window.state(false, always) == RNSkWindowState::kNone,
         "a window never attached is none");
  expect(!window.isAttached() && !window.hasSurface(),
         "a window never attached has no handle and no surface");
  expect(window.takesFrame(), "nothing is deferred on a new window");
  attachOn(window, &windowA, 1);
  expect(window.state(false, always) == RNSkWindowState::kReady,
         "an attached window is ready");
  expect(window.needsConfigure(), "an attached window is to be configured");
  expect(!window.showsFrame(), "an attached window shows nothing yet");
  expect(window.checkSurface(1) == SurfaceCheck::kUsable,
         "its surface is on the device in use");
}

void theStateIsReadInOrder() {
  RNSkWindowLifecycle window;
  int asked = 0;
  const auto canPresent = [&]() {
    asked++;
    return false;
  };
  expect(window.state(true, canPresent) == RNSkWindowState::kNone,
         "no window comes before a lost device");
  attachOn(window, &windowA, 1);
  expect(window.state(true, canPresent) == RNSkWindowState::kNoDevice,
         "a lost device comes before a window that cannot present");
  expect(asked == 0, "a window without a device is not asked if it presents");
  expect(window.state(false, canPresent) == RNSkWindowState::kCannotPresent,
         "a window in the background cannot present");
  expect(asked == 1, "an attached window with a device is asked once");
}

void theSameWindowAttachedAgainKeepsItsFrame() {
  RNSkWindowLifecycle window;
  Gpu gpu;
  attachOn(window, &windowA, 1);
  expect(present(window, gpu) == Offer::kPresent, "the frame is presented");
  expect(window.showsFrame(), "the window shows the frame");
  attachOn(window, &windowA, 1);
  expect(window.showsFrame(), "the same window attached again keeps it");
  expect(window.needsConfigure(), "and is configured again");
  attachOn(window, &windowB, 1);
  expect(!window.showsFrame(), "another window shows nothing yet");
  expect(window.presentCount() == 1, "the count of presents is kept");
}

void aDetachOnlyTakesItsOwnWindow() {
  RNSkWindowLifecycle window;
  attachOn(window, &windowA, 1);
  expect(!window.isWindow(&windowB), "another window is not the one attached");
  expect(!window.isWindow(nullptr), "no window is not the one attached");
  expect(window.isWindow(&windowA), "the window attached is");
  window.detach();
  expect(!window.isAttached() && !window.hasSurface() &&
             window.generation() == 0 && !window.needsConfigure() &&
             !window.showsFrame(),
         "a detached window keeps nothing");
  expect(!window.isWindow(&windowA), "a detached window is no window");
}

void anAbandonStaysUntilTheDetach() {
  RNSkWindowLifecycle window;
  Gpu gpu;
  attachOn(window, &windowA, 1);
  window.abandon();
  expect(present(window, gpu) == Offer::kDeclined,
         "nothing is presented onto a window the platform took back");
  expect(window.presentCount() == 0 && !window.showsFrame(),
         "a declined frame does not count");
  // The platform took the window back as another attach was under way: the
  // detach posted behind that attach is what takes the abandon down.
  attachOn(window, &windowB, 1);
  expect(window.isAbandoned(), "an attach keeps the abandon");
  expect(present(window, gpu) == Offer::kDeclined,
         "and nothing is presented until the detach");
  window.release();
  expect(window.isAbandoned(), "a release keeps the abandon");
  window.detach();
  expect(!window.isAbandoned(), "the detach takes the abandon down");
  attachOn(window, &windowA, 1);
  expect(present(window, gpu) == Offer::kPresent,
         "the next window takes a frame");
}

void aPresentIsDeferredWhileTheGpuIsOnTheFrameBefore() {
  RNSkWindowLifecycle window;
  window.setWaitForPreviousWork(Wait::kBeforePresent);
  Gpu gpu;
  attachOn(window, &windowA, 1);
  expect(present(window, gpu) == Offer::kPresent,
         "the first frame has nothing to wait for");
  expect(gpu.asked == 0, "the GPU is not asked before a first present");
  gpu.done = false;
  expect(!window.isPreviousWorkDone(gpu.ask()),
         "the GPU is on the frame presented");
  expect(present(window, gpu) == Offer::kDeferred,
         "the next frame has its present deferred");
  expect(window.hasDeferredPresent() && !window.takesFrame(),
         "the window takes no other frame meanwhile");
  expect(window.presentCount() == 1, "a deferred frame is not presented yet");
  gpu.done = true;
  expect(window.isPreviousWorkDone(gpu.ask()), "the GPU is done");
  const int asked = gpu.asked;
  expect(window.isPreviousWorkDone(gpu.ask()) && gpu.asked == asked,
         "its yes is remembered, the GPU is not asked again");
  expect(window.takeDeferredPresent(false, 1), "the deferred frame goes");
  expect(!window.takeDeferredPresent(false, 1), "and only once");
  expect(window.takesFrame(), "the window takes frames again");
}

void aPresentTheViewDefersWaitsWhateverTheGpuIsOn() {
  RNSkWindowLifecycle window;
  window.setWaitForPreviousWork(Wait::kBeforePresent);
  Gpu gpu;
  attachOn(window, &windowA, 1);
  window.deferNextPresent(true);
  expect(present(window, gpu) == Offer::kDeferred,
         "a present the view defers is deferred with an idle GPU");
  window.deferNextPresent(false);
  expect(window.takeDeferredPresent(false, 1), "and goes when it is due");
}

void aPresentThatDoesNotWaitIsNeverDeferred() {
  for (const auto wait : {Wait::kNever, Wait::kBeforeSubmit}) {
    RNSkWindowLifecycle window;
    window.setWaitForPreviousWork(wait);
    Gpu gpu;
    gpu.done = false;
    attachOn(window, &windowA, 1);
    window.deferNextPresent(true);
    expect(present(window, gpu) == Offer::kPresent &&
               present(window, gpu) == Offer::kPresent,
           "a present goes at once where it is not deferred");
    expect(!window.hasDeferredPresent(), "nothing is deferred");
  }
  RNSkWindowLifecycle window;
  Gpu gpu;
  gpu.done = false;
  attachOn(window, &windowA, 1);
  expect(!window.presented(), "a present that never waits remembers no work");
  expect(window.isPreviousWorkDone(gpu.ask()) && gpu.asked == 0,
         "and its previous work is always done");
}

void aDeferredPresentIsLostWithItsSwapchain() {
  const auto deferred = [](RNSkWindowLifecycle &window, Gpu &gpu) {
    window.setWaitForPreviousWork(Wait::kBeforePresent);
    attachOn(window, &windowA, 1);
    present(window, gpu);
    gpu.done = false;
    expect(present(window, gpu) == Offer::kDeferred, "a present is deferred");
  };
  {
    // A resize: the window takes the frame made for the new size, and the
    // swapchain made for it takes the deferred frame.
    RNSkWindowLifecycle window;
    Gpu gpu;
    deferred(window, gpu);
    window.resized();
    expect(window.takesFrame(),
           "a window to be configured again takes a frame");
    window.configured();
    expect(!window.hasDeferredPresent() &&
               !window.takeDeferredPresent(false, 1),
           "the deferred frame went with the swapchain");
  }
  {
    RNSkWindowLifecycle window;
    Gpu gpu;
    deferred(window, gpu);
    window.detach();
    expect(!window.takeDeferredPresent(false, 1),
           "a detach takes the deferred frame");
    attachOn(window, &windowA, 1);
    expect(window.isPreviousWorkDone(gpu.ask()),
           "and the next window waits for no previous work");
  }
  {
    RNSkWindowLifecycle window;
    Gpu gpu;
    deferred(window, gpu);
    window.abandon();
    expect(!window.takeDeferredPresent(false, 1),
           "a window the platform took back gets no deferred frame");
    expect(!window.hasDeferredPresent(), "which is lost, not kept");
  }
  {
    RNSkWindowLifecycle window;
    Gpu gpu;
    deferred(window, gpu);
    expect(!window.takeDeferredPresent(true, 1),
           "a lost device presents no deferred frame");
  }
  {
    // The device was replaced and no present swept the window yet: the
    // surface, and the frame, are on the lost one.
    RNSkWindowLifecycle window;
    Gpu gpu;
    deferred(window, gpu);
    expect(!window.takeDeferredPresent(false, 2),
           "a replaced device presents no deferred frame");
  }
}

void aReplacedDeviceTakesTheSurfaceAndKeepsTheWindow() {
  RNSkWindowLifecycle window;
  window.setWaitForPreviousWork(Wait::kBeforePresent);
  Gpu gpu;
  attachOn(window, &windowA, 1);
  present(window, gpu);
  gpu.done = false;
  present(window, gpu);
  expect(window.checkSurface(2) == SurfaceCheck::kStale,
         "a surface on a replaced device is not used");
  expect(!window.dropSurfaceOn(3), "a sweep of another device leaves it");
  expect(window.hasSurface(), "with its surface");
  expect(window.dropSurfaceOn(1), "the sweep of its device takes the surface");
  expect(window.isAttached() && window.showsFrame(),
         "the window stays, with what it shows");
  expect(window.state(false, always) == RNSkWindowState::kReady,
         "and is ready: presenting brings the surface back");
  expect(!window.hasSurface() && window.generation() == 0,
         "it is on no device");
  expect(!window.hasDeferredPresent() && window.takesFrame(),
         "the deferred frame went with the surface");
  expect(window.isPreviousWorkDone(gpu.ask()),
         "and so did the work of the lost device");
  expect(!window.dropSurfaceOn(1), "a second sweep finds nothing");
  expect(window.checkSurface(2) == SurfaceCheck::kMissing,
         "the next frame makes a surface");
  // What RNSkWindowSurface::ensureDevice does.
  window.bindDevice(2);
  window.surfaceMade();
  window.configured();
  expect(window.checkSurface(2) == SurfaceCheck::kUsable &&
             !window.needsConfigure(),
         "made and configured on the device in use");
  gpu.done = true;
  expect(present(window, gpu) == Offer::kPresent, "the frame is presented");
}

void aSurfaceThatCouldNotBeMadeIsAskedForAgain() {
  RNSkWindowLifecycle window;
  attachOn(window, &windowA, 1);
  window.dropSurfaceOn(1);
  // ensureDevice bound the device and the surface could not be made.
  window.bindDevice(2);
  expect(window.checkSurface(2) == SurfaceCheck::kMissing,
         "a window bound to a device without a surface asks again");
  expect(window.dropSurfaceOn(2) && window.generation() == 0,
         "and the sweep of that device unbinds it");
}

} // namespace

int main() {
  aWindowIsNoneUntilAttached();
  theStateIsReadInOrder();
  theSameWindowAttachedAgainKeepsItsFrame();
  aDetachOnlyTakesItsOwnWindow();
  anAbandonStaysUntilTheDetach();
  aPresentIsDeferredWhileTheGpuIsOnTheFrameBefore();
  aPresentTheViewDefersWaitsWhateverTheGpuIsOn();
  aPresentThatDoesNotWaitIsNeverDeferred();
  aDeferredPresentIsLostWithItsSwapchain();
  aReplacedDeviceTakesTheSurfaceAndKeepsTheWindow();
  aSurfaceThatCouldNotBeMadeIsAskedForAgain();
  if (failures > 0) {
    return 1;
  }
  std::printf("WindowLifecycleTest: passed\n");
  return 0;
}
