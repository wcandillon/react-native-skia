// Host-side check of rnsurface::ThreadChecker (see run.sh): entries pass
// until the checker is bound, the bound thread passes, another thread is
// reported once per site, and binding again moves the contract. Built as a
// release build (RNSURFACE_THREAD_CHECK_ABORTS 0), so that a violation
// reports rather than aborts the run.

#define RNSURFACE_THREAD_CHECK_ABORTS 0

#include <cstdio>
#include <thread>
#include <utility>

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
    // Unbound: no contract yet, from any thread.
    ThreadChecker checker;
    ThreadChecker::Site site;
    expect(checker.assertCurrent(site, "unbound"), "an entry passes unbound");
    bool passed = false;
    onAnotherThread(
        [&]() { passed = checker.assertCurrent(site, "unbound, other"); });
    expect(passed, "an entry from another thread passes unbound too");
    expect(!site.reported, "nothing is reported while unbound");
  }
  {
    ThreadChecker checker;
    ThreadChecker::Site site;
    checker.bindToCurrentThread();
    expect(checker.assertCurrent(site, "bound"), "the bound thread passes");
    expect(!site.reported, "a passing entry reports nothing");
    bool passed = true;
    onAnotherThread([&]() { passed = checker.assertCurrent(site, "other"); });
    expect(!passed, "another thread fails the entry check");
    expect(site.reported, "the violation is reported");
    // The site reports once: a second violation at the same site passes the
    // reported flag through unchanged, and the call still says it failed.
    bool passedAgain = true;
    onAnotherThread(
        [&]() { passedAgain = checker.assertCurrent(site, "other"); });
    expect(!passedAgain, "a second violation still fails");
    expect(checker.assertCurrent(site, "bound again"),
           "the binding is kept after a violation");
  }
  {
    // Binding again moves the contract to the new thread.
    ThreadChecker checker;
    ThreadChecker::Site site;
    checker.bindToCurrentThread();
    bool passed = false;
    onAnotherThread([&]() {
      checker.bindToCurrentThread();
      passed = checker.assertCurrent(site, "rebound");
    });
    expect(passed, "the thread that bound again passes");
    expect(!checker.assertCurrent(site, "previous"),
           "the previous thread fails after the rebind");
  }
  {
    // The macro declares a site of its own per use, and passes on the bound
    // thread.
    ThreadChecker checker;
    checker.bindToCurrentThread();
    RNSURFACE_ASSERT_THREAD(checker, "macro");
    ThreadChecker::Site site;
    expect(checker.assertCurrent(site, "after the macro"),
           "the macro leaves the binding as it is");
  }
  if (failures == 0) {
    std::printf("ThreadCheckerTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "ThreadCheckerTest: %d failure(s)\n", failures);
  return 1;
}
