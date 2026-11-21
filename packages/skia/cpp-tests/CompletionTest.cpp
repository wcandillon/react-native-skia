// Host-side check of RNSkia::RNSkCompletion (see run.sh): a wait answers the
// result once it is completed, from this thread or another; answers nothing
// after its slice otherwise; and the first result completed is the one kept,
// however often it is completed or waited for.

#include <chrono>
#include <cstdio>
#include <thread>

#include "rnskia/RNSkCompletion.h"

namespace {

using namespace std::chrono_literals;
using RNSkia::RNSkCompletion;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

void aCompletedResultIsAnsweredAtOnce() {
  RNSkCompletion completion;
  completion.complete(true);
  const auto start = std::chrono::steady_clock::now();
  const auto result = completion.waitFor(10s);
  expect(result == true, "the result completed is answered");
  expect(std::chrono::steady_clock::now() - start < 1s, "without waiting");
}

void aFalseResultIsAResult() {
  RNSkCompletion completion;
  completion.complete(false);
  expect(completion.waitFor(10s) == false, "false is answered as a result");
}

void aWaitEndsWithItsSliceWhenNothingIsCompleted() {
  RNSkCompletion completion;
  const auto start = std::chrono::steady_clock::now();
  const auto result = completion.waitFor(50ms);
  const auto waited = std::chrono::steady_clock::now() - start;
  expect(!result.has_value(), "nothing is answered before completion");
  expect(waited >= 50ms, "the wait lasts its slice");
  expect(waited < 5s, "and not much longer");
}

void aResultCompletedOnAnotherThreadEndsTheWait() {
  RNSkCompletion completion;
  std::thread completer([&completion]() {
    std::this_thread::sleep_for(20ms);
    completion.complete(true);
  });
  const auto start = std::chrono::steady_clock::now();
  const auto result = completion.waitFor(10s);
  const auto waited = std::chrono::steady_clock::now() - start;
  completer.join();
  expect(result == true, "the other thread's result is answered");
  expect(waited < 5s, "as it is completed, not at the end of the slice");
}

void theFirstResultIsKept() {
  RNSkCompletion completion;
  completion.complete(false);
  completion.complete(true);
  expect(completion.waitFor(0ms) == false, "a second completion is ignored");
  expect(completion.waitFor(0ms) == false,
         "a second wait answers the same result");
}

} // namespace

int main() {
  aCompletedResultIsAnsweredAtOnce();
  aFalseResultIsAResult();
  aWaitEndsWithItsSliceWhenNothingIsCompleted();
  aResultCompletedOnAnotherThreadEndsTheWait();
  theFirstResultIsKept();
  if (failures != 0) {
    std::fprintf(stderr, "%d failure(s)\n", failures);
    return 1;
  }
  std::printf("CompletionTest: all passed\n");
  return 0;
}
