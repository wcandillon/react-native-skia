#pragma once

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include "RNSkPlatformContext.h"
#include "utils/RNSkLog.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 How native work gets back to a JS runtime: a job posted from any thread runs
 later on the runtime's own thread, with the runtime. One scheduler per
 runtime, made on first use and kept in the runtime's runtimeData, so that it
 lives exactly as long as the runtime (like Nitro's Dispatcher, and
 react-native-webgpu's RuntimeContext).

 What a scheduler does depends on the runtime (the `__RUNTIME_KIND` global
 react-native-worklets sets on each one):

 - The React Native runtime: the CallInvoker, like every native module.
 - The Reanimated UI runtime: through the React Native runtime, where
   `__skiaScheduleOnUI` (installed by src/skia/NativeSetup.ts) hands a native
   function to worklets' scheduleOnUI, which runs it on the UI runtime.
 - Any other worklet runtime (createWorkletRuntime, a Vision Camera frame
   processor): worklets offers nothing to post to it from native, but the
   runtime has a setTimeout. A job goes into a mailbox, and a timer armed
   on the runtime itself (see expectPost, called on its thread when the work
   starts) drains the mailbox, re-arming itself while a job is still to come.
   The runtime polls its mailbox meanwhile, which only lasts as long as the
   work does.
 */
class RNSkRuntimeScheduler
    : public std::enable_shared_from_this<RNSkRuntimeScheduler> {
public:
  using Job = std::function<void(jsi::Runtime &)>;

  /** The scheduler of `runtime`. Called on the runtime's thread. */
  static std::shared_ptr<RNSkRuntimeScheduler>
  get(jsi::Runtime &runtime, std::shared_ptr<RNSkPlatformContext> context) {
    static const jsi::UUID kSlot(0x6b1f2c3d, 0x5a4e, 0x11f0, 0x9c3a,
                                 0x0242ac120002ULL);
    auto existing = std::static_pointer_cast<RNSkRuntimeScheduler>(
        runtime.getRuntimeData(kSlot));
    if (existing != nullptr) {
      return existing;
    }
    auto created = std::shared_ptr<RNSkRuntimeScheduler>(
        new RNSkRuntimeScheduler(runtimeKind(runtime), std::move(context)));
    runtime.setRuntimeData(kSlot, created);
    return created;
  }

  /**
   Tells the scheduler that a job is coming, from the runtime's thread,
   before the work that will post it starts. A runtime that polls its
   mailbox starts doing so now; the others have nothing to prepare.
   */
  void expectPost(jsi::Runtime &runtime) {
    if (_kind != Kind::Mailbox) {
      return;
    }
    _expected.fetch_add(1, std::memory_order_acq_rel);
    armTick(runtime);
  }

  /**
   Runs `job` on the runtime's thread, later, with the runtime. Any thread.
   One call per expectPost() on a runtime that polls its mailbox.
   */
  void post(Job job) {
    switch (_kind) {
    case Kind::ReactNative:
      _context->runOnJavascriptThread(std::move(job));
      return;
    case Kind::UI:
      _context->runOnJavascriptThread(
          [job = std::move(job)](jsi::Runtime &reactNativeRuntime) {
            scheduleOnUI(reactNativeRuntime, std::move(job));
          });
      return;
    case Kind::Mailbox: {
      std::lock_guard<std::mutex> lock(_mailboxMutex);
      _mailbox.push_back(std::move(job));
      return;
    }
    }
  }

private:
  enum class Kind { ReactNative, UI, Mailbox };

  RNSkRuntimeScheduler(Kind kind, std::shared_ptr<RNSkPlatformContext> context)
      : _kind(kind), _context(std::move(context)) {}

  // react-native-worklets' RuntimeKind: 1 for React Native, 2 for the UI
  // runtime, more for the runtimes of the app. Without worklets there is
  // only the React Native runtime.
  static Kind runtimeKind(jsi::Runtime &runtime) {
    auto kind = runtime.global().getProperty(runtime, "__RUNTIME_KIND");
    if (!kind.isNumber() || kind.asNumber() == 1) {
      return Kind::ReactNative;
    }
    return kind.asNumber() == 2 ? Kind::UI : Kind::Mailbox;
  }

  // On the React Native runtime: has worklets run `job` on the UI runtime.
  // The function handed over is a host function, which worklets passes to
  // the UI runtime by reference.
  static void scheduleOnUI(jsi::Runtime &runtime, Job job) {
    auto schedule = runtime.global().getProperty(runtime, "__skiaScheduleOnUI");
    if (!schedule.isObject() ||
        !schedule.asObject(runtime).isFunction(runtime)) {
      RNSkLogger::logToConsole(
          "React Native Skia: nothing can run on the UI runtime, "
          "react-native-worklets did not install __skiaScheduleOnUI.");
      return;
    }
    auto function = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "skiaJob"), 0,
        [job = std::move(job)](jsi::Runtime &uiRuntime, const jsi::Value &,
                               const jsi::Value *, size_t) -> jsi::Value {
          job(uiRuntime);
          return jsi::Value::undefined();
        });
    schedule.asObject(runtime).asFunction(runtime).call(runtime,
                                                        std::move(function));
  }

  // Schedules a drain of the mailbox on the runtime, through its setTimeout,
  // unless one is scheduled already. Called on the runtime's thread.
  void armTick(jsi::Runtime &runtime) {
    bool expected = false;
    if (!_tickArmed.compare_exchange_strong(expected, true,
                                            std::memory_order_acq_rel)) {
      return;
    }
    auto setTimeout = runtime.global().getProperty(runtime, "setTimeout");
    if (!setTimeout.isObject() ||
        !setTimeout.asObject(runtime).isFunction(runtime)) {
      _tickArmed.store(false, std::memory_order_release);
      RNSkLogger::logToConsole(
          "React Native Skia: this runtime has no setTimeout, so nothing "
          "asynchronous can settle on it.");
      return;
    }
    auto self = shared_from_this();
    auto tick = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "skiaTick"), 0,
        [self](jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *,
               size_t) -> jsi::Value {
          self->_tickArmed.store(false, std::memory_order_release);
          self->drain(runtime);
          if (self->_expected.load(std::memory_order_acquire) > 0) {
            self->armTick(runtime);
          }
          return jsi::Value::undefined();
        });
    setTimeout.asObject(runtime).asFunction(runtime).call(
        runtime, std::move(tick), jsi::Value(0.0));
  }

  // Runs the jobs posted so far, on the runtime's thread.
  void drain(jsi::Runtime &runtime) {
    std::vector<Job> jobs;
    {
      std::lock_guard<std::mutex> lock(_mailboxMutex);
      jobs.swap(_mailbox);
    }
    for (auto &job : jobs) {
      _expected.fetch_sub(1, std::memory_order_acq_rel);
      job(runtime);
    }
  }

  const Kind _kind;
  std::shared_ptr<RNSkPlatformContext> _context;
  // The mailbox and its timer (Kind::Mailbox only).
  std::mutex _mailboxMutex;
  std::vector<Job> _mailbox;
  std::atomic<int> _expected{0};
  std::atomic<bool> _tickArmed{false};
};

} // namespace RNSkia
