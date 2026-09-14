#include "Promise.h"
#include <future>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace RNJsi {

namespace jsi = facebook::jsi;

Promise::Promise(jsi::Runtime &runtime, jsi::Function &&resolver,
                 jsi::Function &&rejecter)
    : runtime(runtime), _resolver(std::move(resolver)),
      _rejecter(std::move(rejecter)) {}

jsi::Value Promise::createPromise(jsi::Runtime &runtime, RunPromise run) {
  // Get Promise ctor from global
  auto promiseCtor = runtime.global().getPropertyAsFunction(runtime, "Promise");

  auto promiseCallback = jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forUtf8(runtime, "PromiseCallback"), 2,
      [=](jsi::Runtime &runtime, const jsi::Value &thisValue,
          const jsi::Value *arguments, size_t count) -> jsi::Value {
        // Call function
        auto resolver = arguments[0].asObject(runtime).asFunction(runtime);
        auto rejecter = arguments[1].asObject(runtime).asFunction(runtime);
        auto promise = std::make_shared<Promise>(runtime, std::move(resolver),
                                                 std::move(rejecter));
        run(runtime, promise);

        return jsi::Value::undefined();
      });

  return promiseCtor.callAsConstructor(runtime, promiseCallback);
}

void Promise::resolve(jsi::Value &&result) {
  _resolver.call(runtime, std::move(result));
}

void Promise::reject(std::string message) {
  jsi::JSError error(runtime, message);
  _rejecter.call(runtime, error.value());
}

} // namespace RNJsi
