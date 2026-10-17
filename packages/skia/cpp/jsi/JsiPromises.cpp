#include "JsiPromises.h"

#ifndef NDEBUG
#include "utils/RNSkLog.h"
#endif

namespace RNJsi {

JsiPromises::Promise::Promise(jsi::Runtime &rt, jsi::Function resolve,
                              jsi::Function reject)
    : runtime_(rt), resolve_(std::move(resolve)), reject_(std::move(reject)) {
  RuntimeLifecycleMonitor::addListener(rt, this);
}

JsiPromises::Promise::~Promise() {
  bool shouldRemove = false;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    shouldRemove = !runtimeDestroyed_;
  }
  // Call removeListener outside the lock to avoid holding mutex_ across
  // an external call. This keeps the locking hierarchy simple and avoids
  // potential issues if RuntimeLifecycleMonitor's internals change.
  if (shouldRemove) {
    RuntimeLifecycleMonitor::removeListener(runtime_, this);
  }
}

void JsiPromises::Promise::onRuntimeDestroyed(jsi::Runtime *rt) {
  if (rt != &runtime_) {
    return;
  }
  std::lock_guard<std::mutex> lock(mutex_);
  runtimeDestroyed_ = true;
  {
    jsi::Function r(std::move(resolve_));
    jsi::Function j(std::move(reject_));
  }
}

void JsiPromises::Promise::resolve(const jsi::Value &result) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (runtimeDestroyed_) {
#ifndef NDEBUG
    RNSkia::RNSkLogger::logToConsole(
        "Promise::resolve() dropped — runtime already torn down");
#endif
    return;
  }
  resolve_.call(runtime_, result);
}

void JsiPromises::Promise::reject(const std::string &message) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (runtimeDestroyed_) {
#ifndef NDEBUG
    RNSkia::RNSkLogger::logToConsole(
        "Promise::reject() dropped — runtime already torn down");
#endif
    return;
  }
  jsi::Object error(runtime_);
  error.setProperty(runtime_, "message",
                    jsi::String::createFromUtf8(runtime_, message));
  reject_.call(runtime_, error);
}

jsi::Value
JsiPromises::createPromiseAsJSIValue(jsi::Runtime &rt,
                                     PromiseSetupFunctionType &&func) {
  jsi::Function JSPromise = rt.global().getPropertyAsFunction(rt, "Promise");
  jsi::Function fn = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "fn"), 2,
      [func = std::move(func)](jsi::Runtime &rt2, const jsi::Value &thisVal,
                               const jsi::Value *args, size_t count) {
        jsi::Function resolve = args[0].getObject(rt2).getFunction(rt2);
        jsi::Function reject = args[1].getObject(rt2).getFunction(rt2);
        auto wrapper = std::make_shared<Promise>(rt2, std::move(resolve),
                                                 std::move(reject));
        func(rt2, wrapper);
        return jsi::Value::undefined();
      });

  return JSPromise.callAsConstructor(rt, fn);
}

} // namespace RNJsi
