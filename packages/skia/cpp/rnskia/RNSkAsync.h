#pragma once

#include <condition_variable>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <utility>

#include <jsi/jsi.h>

#include "RNSkPlatformContext.h"
#include "jsi/JsiPromises.h"
#include "utils/RNSkLog.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 Native work that JS awaits as a Promise: a GPU readback, an encoding on the
 worker thread. The work finishes on whichever thread it finishes on; the
 Promise is settled on the runtime that created it, where its resolve and
 reject functions live.

 How the result gets back to that runtime depends on the runtime (the
 `__RUNTIME_KIND` global react-native-worklets sets on each one):

 - The React Native runtime: through the CallInvoker, like every native
   module.
 - The Reanimated UI runtime: through the React Native runtime, where
   `__skiaScheduleOnUI` (installed by src/skia/NativeSetup.ts) hands a
   native function to worklets' scheduleOnUI; worklets runs it on the UI
   runtime, and it settles the Promise there.
 - A worklet runtime of the app's own (createWorkletRuntime, a Vision Camera
   frame processor): worklets offers nothing to post to it from native, so
   the work is waited for on the calling thread and the Promise is settled
   before it is returned. `await` then costs nothing more than the work
   itself did.
 */
class RNSkAsync {
public:
  using Promise = RNJsi::JsiPromises::Promise;
  /** Settles the promise; runs on the runtime that created it. */
  using Settle = std::function<void(jsi::Runtime &, Promise &)>;
  /**
   Hands the result back: called once, from any thread, with how to settle
   the promise from it.
   */
  using Complete = std::function<void(Settle)>;
  /**
   Starts the work. Either settles the promise right away, on the calling
   runtime (a result that needs no work), or calls `complete` exactly once
   when the work is done.
   */
  using Work = std::function<void(jsi::Runtime &, Promise &, Complete)>;

  static jsi::Value run(jsi::Runtime &runtime,
                        std::shared_ptr<RNSkPlatformContext> context,
                        Work work) {
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [context = std::move(context), work = std::move(work)](
                     jsi::Runtime &runtime, std::shared_ptr<Promise> promise) {
          switch (runtimeKind(runtime)) {
          case RuntimeKind::ReactNative:
            work(runtime, *promise, [context, promise](Settle settle) {
              context->runOnJavascriptThread(
                  [promise, settle = std::move(settle)](jsi::Runtime &runtime) {
                    settle(runtime, *promise);
                  });
            });
            return;
          case RuntimeKind::UI:
            work(runtime, *promise, [context, promise](Settle settle) {
              context->runOnJavascriptThread(
                  [promise, settle = std::move(settle)](jsi::Runtime &runtime) {
                    settleOnUI(runtime, promise, std::move(settle));
                  });
            });
            return;
          case RuntimeKind::Worker: {
            auto mailbox = std::make_shared<Mailbox>();
            work(runtime, *promise, [mailbox](Settle settle) {
              {
                std::lock_guard<std::mutex> lock(mailbox->mutex);
                mailbox->settle = std::move(settle);
              }
              mailbox->condition.notify_one();
            });
            std::unique_lock<std::mutex> lock(mailbox->mutex);
            mailbox->condition.wait(
                lock, [&mailbox]() { return mailbox->settle.has_value(); });
            auto settle = std::move(*mailbox->settle);
            lock.unlock();
            settle(runtime, *promise);
            return;
          }
          }
        });
  }

private:
  enum class RuntimeKind { ReactNative, UI, Worker };

  struct Mailbox {
    std::mutex mutex;
    std::condition_variable condition;
    std::optional<Settle> settle;
  };

  // react-native-worklets' RuntimeKind: 1 for React Native, 2 for the UI
  // runtime, more for the runtimes of the app. Without worklets there is
  // only the React Native runtime.
  static RuntimeKind runtimeKind(jsi::Runtime &runtime) {
    auto kind = runtime.global().getProperty(runtime, "__RUNTIME_KIND");
    if (!kind.isNumber() || kind.asNumber() == 1) {
      return RuntimeKind::ReactNative;
    }
    return kind.asNumber() == 2 ? RuntimeKind::UI : RuntimeKind::Worker;
  }

  // On the React Native runtime: has worklets run `settle` on the UI
  // runtime. The function handed over is a host function, which worklets
  // passes to the UI runtime by reference.
  static void settleOnUI(jsi::Runtime &runtime,
                         std::shared_ptr<Promise> promise, Settle settle) {
    auto schedule = runtime.global().getProperty(runtime, "__skiaScheduleOnUI");
    if (!schedule.isObject() ||
        !schedule.asObject(runtime).isFunction(runtime)) {
      RNSkLogger::logToConsole(
          "React Native Skia: a promise created on the UI runtime cannot be "
          "settled, react-native-worklets did not install __skiaScheduleOnUI.");
      return;
    }
    auto settler = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "settle"), 0,
        [promise, settle = std::move(settle)](
            jsi::Runtime &uiRuntime, const jsi::Value &, const jsi::Value *,
            size_t) -> jsi::Value {
          settle(uiRuntime, *promise);
          return jsi::Value::undefined();
        });
    schedule.asObject(runtime).asFunction(runtime).call(runtime,
                                                        std::move(settler));
  }
};

} // namespace RNSkia
