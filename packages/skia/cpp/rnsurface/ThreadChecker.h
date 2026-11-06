#pragma once

#include <atomic>
#include <cstdio>
#include <cstdlib>
#include <thread>

#if defined(__ANDROID__)
#include <android/log.h>
#endif

// Whether a thread contract violation takes the process down. Debug builds
// abort, so that a wrong thread is found where it happens; release builds
// log once per call site and carry on. Android's release build defines
// NDEBUG (CMake), Xcode's debug configurations define DEBUG; a build that
// defines neither is treated as release, as nothing should abort by
// accident.
#if !defined(RNSURFACE_THREAD_CHECK_ABORTS)
#if !defined(NDEBUG) && (defined(DEBUG) || defined(__ANDROID__))
#define RNSURFACE_THREAD_CHECK_ABORTS 1
#else
#define RNSURFACE_THREAD_CHECK_ABORTS 0
#endif
#endif

namespace rnsurface {

/**
 * The thread an object belongs to, checked at its entries rather than
 * described in a comment. The platform view injects the thread a view
 * presents on today (RNSkView::setPresentThread) without telling C++ which
 * thread that is, so the checker binds to the first thread that enters, and
 * every entry after that must come from the same one; a platform that knows
 * the thread binds explicitly (see bindToCurrentThread).
 *
 * A violation aborts in debug builds (RNSURFACE_THREAD_CHECK_ABORTS); in
 * release builds it is logged once per call site (see Site) and the call
 * goes on as it did before the check existed.
 */
class ThreadChecker {
public:
  /**
   One per call site (a function-local static, see RNSURFACE_ASSERT_THREAD):
   a release build reports the first violation at a site and no other.
   */
  struct Site {
    std::atomic<bool> reported{false};
  };

  ThreadChecker() = default;
  ThreadChecker(const ThreadChecker &) = delete;
  ThreadChecker &operator=(const ThreadChecker &) = delete;

  /** Binds to the calling thread, from any state. */
  void bindToCurrentThread() {
    _thread.store(std::this_thread::get_id(), std::memory_order_release);
  }

  /** Forgets the thread: the next entry binds again. */
  void unbind() { _thread.store(std::thread::id(), std::memory_order_release); }

  bool isBound() const {
    return _thread.load(std::memory_order_acquire) != std::thread::id();
  }

  /** Whether the calling thread is the bound one; false while unbound. */
  bool isCurrent() const {
    return _thread.load(std::memory_order_acquire) ==
           std::this_thread::get_id();
  }

  /**
   The entry check: binds to the calling thread when none is bound, else
   compares. Returns whether the calling thread is the right one; a wrong
   one aborts in debug builds, and is logged once per site in release
   builds, with `what` naming the entry.
   */
  bool assertCurrent(Site &site, const char *what) {
    const auto current = std::this_thread::get_id();
    auto expected = std::thread::id();
    if (_thread.compare_exchange_strong(expected, current,
                                        std::memory_order_acq_rel)) {
      return true;
    }
    if (expected == current) {
      return true;
    }
    if (!site.reported.exchange(true)) {
      report(what);
    }
#if RNSURFACE_THREAD_CHECK_ABORTS
    std::abort();
#endif
    return false;
  }

private:
  static void report(const char *what) {
#if defined(__ANDROID__)
    __android_log_print(ANDROID_LOG_ERROR, "RNSkia",
                        "%s was called on the wrong thread", what);
#else
    std::fprintf(stderr, "RNSkia: %s was called on the wrong thread\n", what);
#endif
  }

  std::atomic<std::thread::id> _thread{std::thread::id()};
};

} // namespace rnsurface

/**
 * The entry check of a method that belongs to a thread: `checker` is a
 * ThreadChecker, `what` names the entry in the report.
 */
#define RNSURFACE_ASSERT_THREAD(checker, what)                                 \
  do {                                                                         \
    static ::rnsurface::ThreadChecker::Site rnsurfaceSite;                     \
    (checker).assertCurrent(rnsurfaceSite, what);                              \
  } while (0)
