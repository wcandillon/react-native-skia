// Host-side check of rnsurface::ThreadChecker (see run.sh): the first entry
// binds, the same thread passes, another thread is reported once per site.
// Built as a release build (RNSURFACE_THREAD_CHECK_ABORTS 0), so that a
// violation reports rather than aborts the run.

#define RNSURFACE_THREAD_CHECK_ABORTS 0

#include <cstdio>
#include <thread>

#include "rnsurface/ThreadChecker.h"

namespace {

using rnsurface::ThreadChecker;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

template <typename F> void onAnotherThread(F f) {
  std::thread thread(std::move(f));
  thread.join();
}

} // namespace

int main() {
  {
    ThreadChecker checker;
    ThreadChecker::Site site;
    expect(!checker.isBound(), "unbound until the first entry");
    expect(!checker.isCurrent(), "no thread is current while unbound");
    expect(checker.assertCurrent(site, "first"), "the first entry binds");
    expect(checker.isBound(), "bound after the first entry");
    expect(checker.isCurrent(), "the binding thread is current");
    expect(checker.assertCurrent(site, "again"), "the same thread passes");
    expect(!site.reported, "a passing entry reports nothing");
  }
  {
    ThreadChecker checker;
    ThreadChecker::Site site;
    checker.bindToCurrentThread();
    bool passed = true;
    bool current = true;
    onAnotherThread([&]() {
      current = checker.isCurrent();
      passed = checker.assertCurrent(site, "other");
    });
    expect(!current, "another thread is not current");
    expect(!passed, "another thread fails the entry check");
    expect(site.reported, "the violation is reported");
    // The site reports once: a second violation at the same site passes the
    // reported flag through unchanged, and the call still says it failed.
    bool passedAgain = true;
    onAnotherThread(
        [&]() { passedAgain = checker.assertCurrent(site, "other"); });
    expect(!passedAgain, "a second violation still fails");
    expect(checker.isCurrent(), "the binding is kept after a violation");
  }
  {
    ThreadChecker checker;
    ThreadChecker::Site site;
    checker.bindToCurrentThread();
    checker.unbind();
    expect(!checker.isBound(), "unbind forgets the thread");
    bool passed = false;
    onAnotherThread([&]() { passed = checker.assertCurrent(site, "rebind"); });
    expect(passed, "the next entry after unbind binds again");
    expect(!checker.isCurrent(), "bound to the other thread now");
    expect(!site.reported, "a rebind reports nothing");
  }
  {
    // The macro declares a site of its own per use.
    ThreadChecker checker;
    RNSURFACE_ASSERT_THREAD(checker, "macro");
    expect(checker.isCurrent(), "the macro binds on first use");
  }
  if (failures == 0) {
    std::printf("ThreadCheckerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "ThreadCheckerTest: %d failure(s)\n", failures);
  return 1;
}
