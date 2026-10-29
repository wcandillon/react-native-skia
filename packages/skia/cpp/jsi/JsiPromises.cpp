#include "JsiPromises.h"

namespace RNJsi {

JsiPromises::Promise::Promise(jsi::Runtime &rt, jsi::Function resolve,
                              jsi::Function reject)
    : runtime_(rt), resolve_(std::move(resolve)), reject_(std::move(reject)) {}

void JsiPromises::Promise::resolve(const jsi::Value &result) {
  resolve_.call(runtime_, result);
}

void JsiPromises::Promise::reject(const std::string &message) {
  // A real Error, like a rejection thrown from JS: `instanceof Error` holds
  // and String(error) carries the message (see the encode rejections in the
  // ImageEncoding spec).
  reject_.call(runtime_, jsi::JSError(runtime_, message).value());
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
