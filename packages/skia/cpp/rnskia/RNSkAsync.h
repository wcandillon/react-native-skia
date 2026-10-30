#pragma once

#include <atomic>
#include <exception>
#include <functional>
#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "RNSkPlatformContext.h"
#include "RNSkRuntimeScheduler.h"
#include "jsi/JsiPromises.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 Native work that JS awaits as a Promise: a GPU readback, an encoding on the
 worker thread, a load. The work finishes on whichever thread it finishes
 on; the Promise is settled on the runtime that created it, where its
 resolve and reject functions live, through that runtime's scheduler (see
 RNSkRuntimeScheduler for how each kind of runtime is reached).
 */
class RNSkAsync {
public:
  using Promise = RNJsi::JsiPromises::Promise;
  /** Settles the promise; runs on the runtime that created it. */
  using Settle = std::function<void(jsi::Runtime &, Promise &)>;
  /**
   Hands the result back: called exactly once, from any thread, with how to
   settle the promise from it.
   */
  using Complete = std::function<void(Settle)>;
  /** Starts the work, which calls `complete` exactly once when done. */
  using Work = std::function<void(Complete)>;

  /**
   A promise of the work's result. Rejected when nothing could ever settle
   it on this runtime (one without setTimeout), when the work throws before
   it started, and when its settling throws on the runtime (a typed array
   too large for it, say).
   */
  static jsi::Value run(jsi::Runtime &runtime,
                        std::shared_ptr<RNSkPlatformContext> context,
                        Work work) {
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [context = std::move(context), work = std::move(work)](
                     jsi::Runtime &runtime, std::shared_ptr<Promise> promise) {
          auto scheduler = RNSkRuntimeScheduler::get(runtime, context);
          if (!scheduler->expectPost(runtime)) {
            promise->reject("Nothing can settle a promise on this runtime: "
                            "it has no setTimeout.");
            return;
          }
          // Completed once: the post expected above is made exactly once,
          // whether by the work or, when the work throws before completing,
          // by an empty job in its place (the executor's exception rejects
          // the promise).
          auto completed = std::make_shared<std::atomic<bool>>(false);
          auto complete = [scheduler, promise, completed](Settle settle) {
            if (completed->exchange(true, std::memory_order_acq_rel)) {
              return;
            }
            scheduler->post(
                [promise, settle = std::move(settle)](jsi::Runtime &runtime) {
                  try {
                    settle(runtime, *promise);
                  } catch (const jsi::JSError &error) {
                    // The JS error itself (a RangeError for a typed array
                    // too large, say), name and stack kept.
                    promise->reject(error);
                  } catch (const std::exception &error) {
                    promise->reject(error.what());
                  }
                });
          };
          try {
            work(std::move(complete));
          } catch (...) {
            if (!completed->exchange(true, std::memory_order_acq_rel)) {
              scheduler->post([](jsi::Runtime &) {});
            }
            throw;
          }
        });
  }

  /**
   A promise settled right away, on the calling runtime: a result that needs
   no work (an image that is already on the CPU, a read of nothing).
   */
  static jsi::Value settled(jsi::Runtime &runtime, Settle settle) {
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [settle = std::move(settle)](
                     jsi::Runtime &runtime, std::shared_ptr<Promise> promise) {
          settle(runtime, *promise);
        });
  }
};

} // namespace RNSkia
