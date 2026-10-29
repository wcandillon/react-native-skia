#pragma once

#include <atomic>
#include <exception>
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

 What a scheduler does depends on the runtime:

 - The React Native runtime, marked by install() when the bindings are
   installed on it: the CallInvoker, like every native module.
 - Any other runtime (the Reanimated UI runtime, createWorkletRuntime, a
   Vision Camera frame processor, a runtime without worklets' marker):
   nothing can post to it from native, but the runtime has a setTimeout. A
   job goes into a mailbox, and a timer armed on the runtime itself (see
   expectPost, called on its thread when the work starts) drains the
   mailbox, re-arming itself while a job is still to come. The runtime polls
   its mailbox meanwhile, which only lasts as long as the work does, and
   never waits for the React Native JS thread: on the UI runtime the timer
   is one frame of worklets' requestAnimationFrame. A job nobody expects
   (see postEvent) waits in the mailbox for the next one that is.
 - The Reanimated UI runtime (the `__RUNTIME_KIND` global
   react-native-worklets sets on each of its runtimes is 2), ahead of its
   timer: through the React Native runtime, where `__skiaScheduleOnUI`
   (installed by src/skia/NativeSetup.ts) hands a native function to
   worklets' scheduleOnUI, which drains the mailbox on the UI runtime right
   away (wakeUI). Best effort, and what delivers a job nobody expects there
   while none is; a busy JS thread only delays this wake, never the timer.
 */
class RNSkRuntimeScheduler
    : public std::enable_shared_from_this<RNSkRuntimeScheduler> {
public:
  using Job = std::function<void(jsi::Runtime &)>;

  /**
   Marks `runtime` as the React Native runtime of `context`, the one its
   CallInvoker reaches. Called where the bindings are installed, on that
   runtime's thread, before anything asks for its scheduler.
   */
  static void install(jsi::Runtime &runtime,
                      std::shared_ptr<RNSkPlatformContext> context) {
    runtime.setRuntimeData(
        slot(), std::shared_ptr<RNSkRuntimeScheduler>(new RNSkRuntimeScheduler(
                    Kind::ReactNative, std::move(context))));
  }

  /** The scheduler of `runtime`. Called on the runtime's thread. */
  static std::shared_ptr<RNSkRuntimeScheduler>
  get(jsi::Runtime &runtime, std::shared_ptr<RNSkPlatformContext> context) {
    auto existing = std::static_pointer_cast<RNSkRuntimeScheduler>(
        runtime.getRuntimeData(slot()));
    if (existing != nullptr) {
      return existing;
    }
    auto created = std::shared_ptr<RNSkRuntimeScheduler>(
        new RNSkRuntimeScheduler(runtimeKind(runtime), std::move(context)));
    runtime.setRuntimeData(slot(), created);
    return created;
  }

  /**
   Tells the scheduler that a post() is coming, from the runtime's thread,
   before the work that will post it starts. A runtime that polls its
   mailbox starts doing so now; the React Native runtime has nothing to
   prepare.
   */
  void expectPost(jsi::Runtime &runtime) {
    if (_kind == Kind::ReactNative) {
      return;
    }
    _expected.fetch_add(1, std::memory_order_acq_rel);
    armTick(runtime);
  }

  /**
   Runs `job` on the runtime's thread, later, with the runtime: the job one
   expectPost() announced. Any thread.
   */
  void post(Job job) { enqueue(std::move(job), /* expected= */ true); }

  /**
   Runs `job` on the runtime's thread, later, with the runtime, with no
   expectPost() ahead of it: something that happened on its own (a lost
   device). On a runtime that polls its mailbox it is delivered with the
   next job that runtime expects. Any thread.
   */
  void postEvent(Job job) { enqueue(std::move(job), /* expected= */ false); }

private:
  enum class Kind { ReactNative, UI, Mailbox };

  struct Entry {
    Job job;
    // Announced by an expectPost(), which it balances when it runs.
    bool expected;
  };

  RNSkRuntimeScheduler(Kind kind, std::shared_ptr<RNSkPlatformContext> context)
      : _kind(kind), _context(std::move(context)) {}

  static const jsi::UUID &slot() {
    static const jsi::UUID kSlot(0x6b1f2c3d, 0x5a4e, 0x11f0, 0x9c3a,
                                 0x0242ac120002ULL);
    return kSlot;
  }

  // react-native-worklets' RuntimeKind: 1 for React Native, 2 for the UI
  // runtime, more for the runtimes of the app. The React Native runtime is
  // marked by install() and never gets here; any other runtime, marked or
  // not, is reached through its own setTimeout, the UI runtime also through
  // worklets. (A runtime settling through the CallInvoker would be settled
  // with the React Native runtime while its promise lives on another: never
  // that by default.)
  static Kind runtimeKind(jsi::Runtime &runtime) {
    auto kind = runtime.global().getProperty(runtime, "__RUNTIME_KIND");
    return kind.isNumber() && kind.asNumber() == 2 ? Kind::UI : Kind::Mailbox;
  }

  void enqueue(Job job, bool expected) {
    if (_kind == Kind::ReactNative) {
      _context->runOnJavascriptThread(std::move(job));
      return;
    }
    {
      std::lock_guard<std::mutex> lock(_mailboxMutex);
      _mailbox.push_back({std::move(job), expected});
    }
    if (_kind == Kind::UI) {
      wakeUI();
    }
  }

  // Best effort, and coalesced (one wake in flight at a time): on the React
  // Native runtime, worklets runs the function handed to __skiaScheduleOnUI
  // on the UI runtime, where it drains the mailbox ahead of the next tick.
  // The function is a host function, which worklets passes by reference.
  // Without the hook the tick alone runs the expected jobs, and a job nobody
  // expects waits for the next one that is.
  void wakeUI() {
    if (sUIUnreachable.load(std::memory_order_acquire)) {
      return;
    }
    bool expected = false;
    if (!_wakePending.compare_exchange_strong(expected, true,
                                              std::memory_order_acq_rel)) {
      return;
    }
    auto self = shared_from_this();
    _context->runOnJavascriptThread([self](jsi::Runtime &runtime) {
      auto schedule =
          runtime.global().getProperty(runtime, "__skiaScheduleOnUI");
      if (!schedule.isObject() ||
          !schedule.asObject(runtime).isFunction(runtime)) {
        self->_wakePending.store(false, std::memory_order_release);
        if (!sUIUnreachable.exchange(true, std::memory_order_acq_rel)) {
          RNSkLogger::logToConsole(
              "React Native Skia: react-native-worklets did not install "
              "__skiaScheduleOnUI, so the UI runtime settles its promises on "
              "its own timer alone, and a lost GPU device reaches it with "
              "its next awaited operation only.");
        }
        return;
      }
      auto wake = jsi::Function::createFromHostFunction(
          runtime, jsi::PropNameID::forAscii(runtime, "skiaWake"), 0,
          [self](jsi::Runtime &uiRuntime, const jsi::Value &,
                 const jsi::Value *, size_t) -> jsi::Value {
            // Cleared before the drain: a job posted meanwhile is either in
            // this drain or gets a wake of its own.
            self->_wakePending.store(false, std::memory_order_release);
            auto error = self->drain(uiRuntime);
            if (error != nullptr) {
              std::rethrow_exception(error);
            }
            return jsi::Value::undefined();
          });
      schedule.asObject(runtime).asFunction(runtime).call(runtime,
                                                          std::move(wake));
    });
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
          auto error = self->drain(runtime);
          if (self->_expected.load(std::memory_order_acquire) > 0) {
            self->armTick(runtime);
          }
          if (error != nullptr) {
            // Thrown by a job, after the others ran and the next tick is
            // armed: the runtime reports it as the timer's.
            std::rethrow_exception(error);
          }
          return jsi::Value::undefined();
        });
    setTimeout.asObject(runtime).asFunction(runtime).call(
        runtime, std::move(tick), jsi::Value(0.0));
  }

  // Runs the jobs posted so far, on the runtime's thread, every one of them
  // even when one throws: the first exception is returned for the caller to
  // rethrow once the rest ran. An expected job balances its expectPost()
  // before it runs, so that a throwing one does not leave the timer armed
  // for good.
  std::exception_ptr drain(jsi::Runtime &runtime) {
    std::vector<Entry> entries;
    {
      std::lock_guard<std::mutex> lock(_mailboxMutex);
      entries.swap(_mailbox);
    }
    std::exception_ptr first = nullptr;
    for (auto &entry : entries) {
      if (entry.expected) {
        _expected.fetch_sub(1, std::memory_order_acq_rel);
      }
      try {
        entry.job(runtime);
      } catch (...) {
        if (first == nullptr) {
          first = std::current_exception();
        }
      }
    }
    return first;
  }

  const Kind _kind;
  std::shared_ptr<RNSkPlatformContext> _context;
  // The mailbox and its timer (Kind::UI and Kind::Mailbox).
  std::mutex _mailboxMutex;
  std::vector<Entry> _mailbox;
  std::atomic<int> _expected{0};
  std::atomic<bool> _tickArmed{false};
  // A wake through __skiaScheduleOnUI not run yet (Kind::UI).
  std::atomic<bool> _wakePending{false};
  // Set once a wake for the UI runtime found no way to run there: the UI
  // runtime then settles its promises on its own timer alone.
  static inline std::atomic<bool> sUIUnreachable{false};
};

} // namespace RNSkia
