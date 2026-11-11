// Host-side check of RNSkia::RNSkImagePresenterLayout, the layout a static
// canvas's images take (see run.sh): the main thread hands each change on to
// the images' worker, which applies the changes later, in order, through the
// stand-in presenter below.

#include <cstdio>
#include <vector>

#include "rnskia/RNSkImagePresenterLayout.h"

namespace {

using RNSkia::RNSkImagePresenterLayout;
using Change = RNSkImagePresenterLayout::Change;
using Layout = RNSkImagePresenterLayout::Layout;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// The image presenter as the worker leaves it, and the tasks the main thread
// handed on that the worker has not run yet.
struct Presenter {
  struct Task {
    Change change;
    Layout layout;
  };
  std::vector<Task> pending;
  Layout applied;
  int attaches = 0;

  void post(Change change, const Layout &layout) {
    if (change != Change::kNone) {
      pending.push_back({change, layout});
    }
  }

  void runWorker() {
    for (const auto &task : pending) {
      if (task.change == Change::kAttach) {
        attaches++;
      }
      applied = task.layout;
    }
    pending.clear();
  }
};

void theFirstLayoutAttaches() {
  RNSkImagePresenterLayout layout;
  expect(layout.layOut({100, 100, false}) == Change::kAttach,
         "the first layout attaches the presenter");
}

void aLayoutThatChangesNothingHandsNothingOn() {
  RNSkImagePresenterLayout layout;
  (void)layout.layOut({100, 100, false});
  expect(layout.layOut({100, 100, false}) == Change::kNone,
         "a layout at the size handed on last hands nothing on");
}

void anEmptyLayoutIsLeftOut() {
  RNSkImagePresenterLayout layout;
  expect(layout.layOut({0, 100, false}) == Change::kNone,
         "an empty layout hands nothing on");
  expect(layout.layOut({100, 100, false}) == Change::kAttach,
         "the first layout after an empty one attaches the presenter");
}

void aNewColorSpaceAttachesAgain() {
  RNSkImagePresenterLayout layout;
  (void)layout.layOut({100, 100, false});
  expect(layout.layOut({100, 100, true}) == Change::kAttach,
         "a new color space attaches the presenter again");
  expect(layout.layOut({120, 100, true}) == Change::kResize,
         "a new size in the same color space resizes it");
}

// A layout back to the size the worker still has, before the worker got to
// the change in between: the worker must end at the last size laid out.
void aSizeLaidOutBackBeforeTheWorkerRunsIsHandedOn() {
  RNSkImagePresenterLayout layout;
  Presenter presenter;
  presenter.post(layout.layOut({100, 100, false}), {100, 100, false});
  presenter.runWorker();
  presenter.post(layout.layOut({120, 100, false}), {120, 100, false});
  presenter.post(layout.layOut({100, 100, false}), {100, 100, false});
  presenter.runWorker();
  expect(presenter.applied == Layout{100, 100, false},
         "the presenter ends at the size laid out last");
  expect(presenter.attaches == 1, "the presenter is attached once");
}

} // namespace

int main() {
  theFirstLayoutAttaches();
  aLayoutThatChangesNothingHandsNothingOn();
  anEmptyLayoutIsLeftOut();
  aNewColorSpaceAttachesAgain();
  aSizeLaidOutBackBeforeTheWorkerRunsIsHandedOn();
  if (failures > 0) {
    return 1;
  }
  std::printf("ImagePresenterLayoutTest: passed\n");
  return 0;
}
