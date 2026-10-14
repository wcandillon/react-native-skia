#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

namespace RNJsi {

namespace jsi = facebook::jsi;

/**
 * Non-template base of every NativeObject. It is what lets code that does not
 * know the concrete class (NativeObjectWorkletHelpers below) tell one of our
 * native objects from any other object carrying jsi::NativeState, and read its
 * brand.
 */
class NativeObjectBase : public jsi::NativeState {
public:
  /** The class brand (Derived::CLASS_NAME), e.g. "Rect". */
  const char *getClassName() const { return _name; }

protected:
  explicit NativeObjectBase(const char *name) : _name(name) {}

  const char *_name;
};

/**
 * Registry mapping a NativeObject class brand (CLASS_NAME) to a reconstructor
 * that can recreate a fully functional JS object (prototype + native state)
 * on any runtime. This is what enables native objects (Skia and WebGPU) to
 * travel between the React Native runtime and secondary runtimes (Reanimated
 * worklets) via BoxedNativeObject.
 */
class BoxedNativeObjectRegistry {
public:
  using Reconstructor = std::function<jsi::Value(
      jsi::Runtime &, std::shared_ptr<jsi::NativeState>)>;

  static BoxedNativeObjectRegistry &getInstance() {
    static BoxedNativeObjectRegistry instance;
    return instance;
  }

  void registerClass(const std::string &brand, Reconstructor reconstructor) {
    std::lock_guard<std::mutex> lock(_mutex);
    // Brands are the unboxing key and must be unique process-wide; a silent
    // overwrite would make one class unbox into another's reconstructor.
    if (_reconstructors.count(brand) > 0) {
      throw std::runtime_error("Duplicate native object brand registered: " +
                               brand);
    }
    _reconstructors[brand] = std::move(reconstructor);
  }

  jsi::Value reconstruct(jsi::Runtime &runtime, const std::string &brand,
                         std::shared_ptr<jsi::NativeState> state) {
    Reconstructor reconstructor;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      auto it = _reconstructors.find(brand);
      if (it == _reconstructors.end()) {
        throw jsi::JSError(runtime,
                           "No native class registered for brand: " + brand);
      }
      reconstructor = it->second;
    }
    return reconstructor(runtime, std::move(state));
  }

private:
  BoxedNativeObjectRegistry() = default;
  std::mutex _mutex;
  std::unordered_map<std::string, Reconstructor> _reconstructors;
};

/**
 * HostObject bridge used to move NativeObjects between runtimes.
 *
 * NativeObject-based values are plain JS objects carrying jsi::NativeState;
 * worklets cannot serialize their prototype, so they are "boxed" into this
 * HostObject (which worklets pass across runtimes by reference) and unboxed
 * on the target runtime, where the prototype is re-installed from the class
 * registry. See registerCustomSerializable in
 * src/skia/SkiaWorkletSerialization.ts.
 */
class BoxedNativeObject : public jsi::HostObject {
public:
  BoxedNativeObject(std::shared_ptr<jsi::NativeState> state, std::string brand)
      : _state(std::move(state)), _brand(std::move(brand)) {}

  jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override {
    auto propName = name.utf8(runtime);
    if (propName == "unbox") {
      auto state = _state;
      auto brand = _brand;
      return jsi::Function::createFromHostFunction(
          runtime, jsi::PropNameID::forUtf8(runtime, "unbox"), 0,
          [state, brand](jsi::Runtime &rt, const jsi::Value &,
                         const jsi::Value *, size_t) -> jsi::Value {
            return BoxedNativeObjectRegistry::getInstance().reconstruct(
                rt, brand, state);
          });
    }
    if (propName == "__boxedNativeObject") {
      return jsi::Value(true);
    }
    if (propName == "__brand") {
      return jsi::String::createFromUtf8(runtime, _brand);
    }
    return jsi::Value::undefined();
  }

  void set(jsi::Runtime &runtime, const jsi::PropNameID &,
           const jsi::Value &) override {
    throw jsi::JSError(runtime, "Boxed native objects are read-only");
  }

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
    std::vector<jsi::PropNameID> names;
    names.reserve(3);
    names.push_back(jsi::PropNameID::forUtf8(rt, "unbox"));
    names.push_back(jsi::PropNameID::forUtf8(rt, "__boxedNativeObject"));
    names.push_back(jsi::PropNameID::forUtf8(rt, "__brand"));
    return names;
  }

private:
  std::shared_ptr<jsi::NativeState> _state;
  std::string _brand;
};

/**
 * Boxes a NativeObject-backed JS value so it can be serialized by worklets
 * and unboxed on another runtime. Throws for anything that is not one of our
 * native objects.
 */
inline jsi::Value boxNativeObject(jsi::Runtime &runtime,
                                  const jsi::Value &value) {
  if (!value.isObject()) {
    throw jsi::JSError(runtime, "box() expects a native object");
  }
  auto object = value.asObject(runtime);
  if (!object.hasNativeState<NativeObjectBase>(runtime)) {
    throw jsi::JSError(runtime, "box() expects a native object");
  }
  auto state = object.getNativeState<NativeObjectBase>(runtime);
  return jsi::Object::createFromHostObject(
      runtime,
      std::make_shared<BoxedNativeObject>(state, state->getClassName()));
}

/**
 * The native half of the worklet serializer (see registerCustomSerializable in
 * src/skia/SkiaWorkletSerialization.ts):
 *
 * - isNativeObject(value): true only for objects whose NativeState is a
 *   NativeObjectBase. Other native-state objects (WebGPU objects, worklets'
 *   own serializable refs) and objects that merely inherit from one of our
 *   prototypes (Object.create(rect)) are rejected, and no JS property is ever
 *   read, so getters and Proxy traps of unrelated objects never run.
 * - box(value): boxNativeObject(), for unbox() on the target runtime.
 *
 * One instance is installed on the main runtime as
 * globalThis.__skiaWorkletHelpers (see RNSkManager::installBindings) and
 * captured by the serializer's determine/pack worklets. Worklets hands a
 * HostObject to every runtime by reference, so the helper is available
 * wherever a native object gets captured (Reanimated UI runtime,
 * createWorkletRuntime, Vision Camera frame processors) without installing
 * anything on those runtimes.
 */
class NativeObjectWorkletHelpers : public jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override {
    auto propName = name.utf8(runtime);
    if (propName == "isNativeObject") {
      return jsi::Function::createFromHostFunction(
          runtime, name, 1,
          [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args,
             size_t count) -> jsi::Value {
            return jsi::Value(
                count > 0 && args[0].isObject() &&
                args[0].getObject(rt).hasNativeState<NativeObjectBase>(rt));
          });
    }
    if (propName == "box") {
      return jsi::Function::createFromHostFunction(
          runtime, name, 1,
          [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args,
             size_t count) -> jsi::Value {
            if (count < 1) {
              throw jsi::JSError(rt, "box() expects a native object");
            }
            return boxNativeObject(rt, args[0]);
          });
    }
    return jsi::Value::undefined();
  }

  void set(jsi::Runtime &runtime, const jsi::PropNameID &,
           const jsi::Value &) override {
    throw jsi::JSError(runtime, "Worklet helpers are read-only");
  }

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
    std::vector<jsi::PropNameID> names;
    names.reserve(2);
    names.push_back(jsi::PropNameID::forUtf8(rt, "isNativeObject"));
    names.push_back(jsi::PropNameID::forUtf8(rt, "box"));
    return names;
  }
};

} // namespace RNJsi
