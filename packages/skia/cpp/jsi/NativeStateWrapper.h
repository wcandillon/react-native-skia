#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <utility>

namespace RNJsi {

namespace jsi = facebook::jsi;

/**
 * Wrapper around jsi::NativeState that holds a native C++ object.
 *
 * T can be:
 *   - A value type (e.g., SkPath)
 *   - A smart pointer (e.g., sk_sp<SkImage>, std::shared_ptr<T>)
 */
template <typename T>
class NativeStateWrapper : public jsi::NativeState {
public:
  explicit NativeStateWrapper(T object) : _object(std::move(object)) {}

  T &get() { return _object; }
  const T &get() const { return _object; }

  void set(T object) { _object = std::move(object); }

private:
  T _object;
};

/**
 * Helper to extract native state from a JS object.
 * Returns nullptr if the object doesn't have the expected native state type.
 */
template <typename T>
std::shared_ptr<NativeStateWrapper<T>>
getNativeStateWrapper(jsi::Runtime &runtime, const jsi::Object &obj) {
  if (!obj.hasNativeState(runtime)) {
    return nullptr;
  }
  return std::dynamic_pointer_cast<NativeStateWrapper<T>>(
      obj.getNativeState(runtime));
}

} // namespace RNJsi
