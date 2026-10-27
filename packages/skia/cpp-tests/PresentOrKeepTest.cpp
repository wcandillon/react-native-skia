// Host-side check of RNSkia::presentOrKeep, how a view presents its queued
// recordings and keeps what its window could not take (see run.sh).

#include <cstdio>
#include <string>
#include <vector>

#include "rnskia/RNSkPresentOrKeep.h"

namespace {

using RNSkia::presentOrKeep;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

struct Replayed {
  size_t done;
  bool shown;
};

// A window whose description is a number, which the first `changingReads`
// reads of it find changed, and the queue's side: what each attempt was
// given, what was released, and what was kept.
struct Run {
  std::vector<Replayed> attempts;
  int windowNow;
  int changingReads = 0;
  std::vector<std::vector<std::string>> presented;
  std::vector<int> presentedOnto;
  std::vector<std::string> released;
  std::vector<std::string> kept;
  bool keptAny = false;

  RNSkia::RNSkPresented go(int targetInfo, std::vector<std::string> queued) {
    size_t attempt = 0;
    int reads = 0;
    return presentOrKeep(
        targetInfo, std::move(queued),
        [&](int info, const std::vector<std::string> &recordings) {
          presented.push_back(recordings);
          presentedOnto.push_back(info);
          return attempt < attempts.size() ? attempts[attempt++]
                                           : Replayed{0, false};
        },
        [&](const std::vector<std::string> &recordings, size_t done) {
          released.insert(released.end(), recordings.begin(),
                          recordings.begin() + static_cast<long>(done));
        },
        [&](int *now) {
          *now = windowNow;
          if (reads++ < changingReads) {
            windowNow++;
          }
          return true;
        },
        [&](std::vector<std::string> rest) {
          kept = std::move(rest);
          keptAny = true;
        });
  }
};

using Names = std::vector<std::string>;

void aBatchPresentedWholeReleasesItAll() {
  Run run{{{3, true}}, 1};
  const auto result = run.go(1, {"a", "b", "c"});
  expect(result.allDone && result.shown, "a batch the window took is done");
  expect(run.released == Names{"a", "b", "c"},
         "every recording presented gives its slot back");
  expect(!run.keptAny, "nothing is kept");
}

void aBatchPresentedInPartReleasesWhatItPresented() {
  Run run{{{1, true}}, 1};
  const auto result = run.go(1, {"a", "b", "c"});
  expect(!result.allDone && result.shown,
         "a batch the window took in part is not done, and showed a frame");
  expect(run.released == Names{"a"},
         "the recording presented gives its slot back, the others keep theirs");
  expect(run.kept == Names{"b", "c"},
         "the recordings the window did not take are kept, in order");
}

void aWindowChangedUnderThePresentGetsTheRestOnce() {
  Run run{{{1, true}, {2, true}}, 2};
  const auto result = run.go(1, {"a", "b", "c"});
  expect(result.allDone, "the rest goes onto the window as it is now");
  expect(run.presentedOnto == std::vector<int>{1, 2},
         "the second attempt presents onto the window's new description");
  expect(run.presented.size() == 2 && run.presented[1] == Names{"b", "c"},
         "the second attempt presents the rest");
  expect(run.released == Names{"a", "b", "c"},
         "each attempt gives back the slots of what it presented");
  expect(!run.keptAny, "nothing is kept");
}

void aWindowThatChangesAgainKeepsTheRest() {
  Run run{{{0, false}, {1, true}}, 2};
  const auto result = run.go(1, {"a", "b"});
  expect(!result.allDone && result.shown,
         "a frame shown on the second attempt counts");
  expect(run.presented.size() == 2, "the window is tried twice at most");
  expect(run.released == Names{"a"}, "only what was presented is released");
  expect(run.kept == Names{"b"}, "what the second attempt left is kept");
}

void aWindowThatDidNotChangeIsNotTriedAgain() {
  Run run{{{0, false}}, 1};
  const auto result = run.go(1, {"a"});
  expect(!result.allDone && !result.shown, "nothing went to the window");
  expect(run.presented.size() == 1, "a window as it was is tried once");
  expect(run.released.empty(), "nothing is released");
  expect(run.kept == Names{"a"}, "the recording is kept");
}

void aWindowChangingOnEveryReadIsTriedTwiceAtMost() {
  Run run{{{0, false}}, 2};
  run.changingReads = 5;
  const auto result = run.go(1, {"a"});
  expect(!result.allDone, "the recording is not done");
  expect(run.presented.size() == 2,
         "a window that keeps changing is tried twice at most");
  expect(run.kept == Names{"a"}, "the recording is kept for the next frame");
}

} // namespace

int main() {
  aBatchPresentedWholeReleasesItAll();
  aBatchPresentedInPartReleasesWhatItPresented();
  aWindowChangedUnderThePresentGetsTheRestOnce();
  aWindowThatChangesAgainKeepsTheRest();
  aWindowThatDidNotChangeIsNotTriedAgain();
  aWindowChangingOnEveryReadIsTriedTwiceAtMost();
  if (failures > 0) {
    return 1;
  }
  std::printf("PresentOrKeepTest: passed\n");
  return 0;
}
