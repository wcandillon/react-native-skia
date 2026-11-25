#pragma once

#include <functional>
#include <stdexcept>
#include <string>
#include <utility>

#include <jsi/jsi.h>

namespace RNJsi {

namespace jsi = facebook::jsi;

/**
 A failure that reaches JS as an error of a given name: a SkiaDecodeError,
 an AbortError, a TypeError. Native code throws it anywhere, on any thread;
 it becomes a JS error where it crosses into JS (a host function, see
 guardNamedErrors, or a promise, see JsiPromises::Promise::reject).

 The JS error is built by the constructor registered for its name in the
 global `__RNSkiaErrors` (see src/skia/types/Errors.ts), so `instanceof`
 holds on the runtime that registered them. A runtime without the registry
 (a worklet runtime) gets an Error with the same name, message and extra
 field.
 */
class NamedError : public std::runtime_error {
public:
  /** Builds the value of the error's extra field on the runtime. */
  using Extra = std::function<jsi::Value(jsi::Runtime &)>;

  NamedError(std::string name, const std::string &message)
      : std::runtime_error(message), _name(std::move(name)) {}

  /**
   An error that carries one more field, named `extraKey` (the `format` of a
   SkiaDecodeError, the `messages` of an SkSLCompilationError).
   */
  NamedError(std::string name, const std::string &message, std::string extraKey,
             Extra extra)
      : std::runtime_error(message), _name(std::move(name)),
        _extraKey(std::move(extraKey)), _extra(std::move(extra)) {}

  const std::string &name() const { return _name; }

  /** The JS error, built on `runtime`. */
  jsi::Value toValue(jsi::Runtime &runtime) const {
    auto message = jsi::String::createFromUtf8(runtime, what());
    auto extra = _extra ? _extra(runtime) : jsi::Value::undefined();
    auto global = runtime.global();
    // The built-in errors (TypeError, RangeError) are built as such.
    if (_name == "TypeError" || _name == "RangeError") {
      auto ctor = global.getProperty(runtime, _name.c_str());
      if (ctor.isObject() && ctor.asObject(runtime).isFunction(runtime)) {
        return ctor.asObject(runtime).asFunction(runtime).callAsConstructor(
            runtime, message);
      }
    }
    auto registry = global.getProperty(runtime, "__RNSkiaErrors");
    if (registry.isObject()) {
      auto errors = registry.asObject(runtime);
      // The errors of the generic class take their name as an argument.
      bool generic = !errors.hasProperty(runtime, _name.c_str());
      auto factory =
          errors.getProperty(runtime, generic ? "SkiaError" : _name.c_str());
      if (factory.isObject() && factory.asObject(runtime).isFunction(runtime)) {
        auto fn = factory.asObject(runtime).asFunction(runtime);
        if (generic) {
          return fn.call(runtime, message,
                         jsi::String::createFromUtf8(runtime, _name));
        }
        return fn.call(runtime, message, extra);
      }
    }
    // No registry: an Error that keeps the name and the extra field.
    auto error = global.getPropertyAsFunction(runtime, "Error")
                     .callAsConstructor(runtime, message)
                     .asObject(runtime);
    error.setProperty(runtime, "name",
                      jsi::String::createFromUtf8(runtime, _name));
    if (!_extraKey.empty()) {
      error.setProperty(runtime, _extraKey.c_str(), extra);
    }
    return jsi::Value(runtime, error);
  }

  /** The JS error, as a JSError to throw on `runtime`. */
  jsi::JSError toJSError(jsi::Runtime &runtime) const {
    return jsi::JSError(runtime, toValue(runtime));
  }

private:
  std::string _name;
  std::string _extraKey;
  Extra _extra;
};

/**
 Runs `body`, the work of a host function, and turns a NamedError it throws
 into the JS error of that name. Other exceptions pass through as they are:
 the runtime turns a std::exception into an Error with its message.
 */
template <typename Body>
auto guardNamedErrors(jsi::Runtime &runtime, Body &&body) -> decltype(body()) {
  try {
    return body();
  } catch (const NamedError &error) {
    throw error.toJSError(runtime);
  }
}

} // namespace RNJsi
