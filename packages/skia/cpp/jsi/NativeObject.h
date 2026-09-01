//
// NativeObject base class for JSI NativeState pattern
//

#pragma once

#include <functional>
#include <jsi/jsi.h>
#include <memory>
#include <mutex>
#include <string>
#include <type_traits>
#include <unordered_map>
#include <utility>

#include "jsi/BoxedNativeObject.h"
#include "jsi/JSICache.h"

// Forward declare to avoid circular dependency
namespace RNJsi {
template <typename ArgType, typename SFINAE> struct JSIConverter;
} // namespace RNJsi

// Include the converter - must come after forward declaration
#include "JSIConverter.h"

namespace RNJsi {

namespace jsi = facebook::jsi;

// Minimum memory pressure reported for any native object.
// This accounts for C++ wrapper overhead and ensures dispose() never
// increases reported memory pressure (which would defeat its purpose).
static constexpr size_t kMinMemoryPressure = 256;

// Forward declaration
template <typename Derived> class NativeObject;

/**
 * Base class for native objects using the NativeState pattern.
 *
 * Instead of using HostObject (which intercepts all property access),
 * this pattern:
 * 1. Stores native data via jsi::Object::setNativeState()
 * 2. Installs methods on a shared prototype object (once per runtime)
 * 3. Creates plain JS objects that use the prototype chain
 *
 * Usage:
 * ```cpp
 * class MyClass : public NativeObject<MyClass> {
 * public:
 *   static constexpr const char* CLASS_NAME = "MyClass";
 *
 *   MyClass(...) : NativeObject(CLASS_NAME), ... {}
 *
 *   std::string getValue() { return _value; }
 *
 *   static void definePrototype(jsi::Runtime& rt, jsi::Object& proto) {
 *     installGetter(rt, proto, "value", &MyClass::getValue);
 *   }
 *
 * private:
 *   std::string _value;
 * };
 * ```
 */
template <typename Derived>
class NativeObject : public jsi::NativeState,
                     public std::enable_shared_from_this<Derived> {
public:
  // Marker type for SFINAE detection in JSIConverter
  using IsNativeObject = std::true_type;

  /**
   * Key under which this class's prototype is stored in the per-runtime
   * JSICache. The address of this per-instantiation static is unique per
   * Derived, so no registry of class ids is needed.
   */
  static RNJsi::JSICache::PrototypeKey prototypeKey() {
    static constexpr char key = 0;
    return &key;
  }

  /**
   * Returns this class's prototype on `runtime`, or nullptr if it has not
   * been installed there yet. The prototype is owned by the runtime (see
   * JSICache), so the pointer is valid for as long as `runtime` is.
   */
  static jsi::Object *getCachedPrototype(jsi::Runtime &runtime) {
    return RNJsi::JSICache::get(runtime).getPrototype(prototypeKey());
  }

  /**
   * Ensure the prototype is installed for this runtime.
   * Called automatically by create(), but can be called manually.
   */
  static void installPrototype(jsi::Runtime &runtime) {
    if (getCachedPrototype(runtime) != nullptr) {
      return; // Already installed on this runtime
    }

    // Create prototype object
    jsi::Object prototype(runtime);

    // Let derived class define its methods/properties
    Derived::definePrototype(runtime, prototype);

    // Add Symbol.toStringTag for proper object identification in console.log
    auto symbolCtor = runtime.global().getPropertyAsObject(runtime, "Symbol");
    auto toStringTag = symbolCtor.getProperty(runtime, "toStringTag");
    if (!toStringTag.isUndefined()) {
      // Use Object.defineProperty to set symbol property since setProperty
      // doesn't support symbols directly
      auto objectCtor = runtime.global().getPropertyAsObject(runtime, "Object");
      auto defineProperty =
          objectCtor.getPropertyAsFunction(runtime, "defineProperty");
      jsi::Object descriptor(runtime);
      descriptor.setProperty(
          runtime, "value",
          jsi::String::createFromUtf8(runtime, Derived::CLASS_NAME));
      descriptor.setProperty(runtime, "writable", false);
      descriptor.setProperty(runtime, "enumerable", false);
      descriptor.setProperty(runtime, "configurable", true);
      defineProperty.call(runtime, prototype, toStringTag, descriptor);
    }

    // Install the shared pieces every native object needs for JS type
    // detection and cross-runtime transfer (worklets):
    // - `__typename__` (CLASS_NAME), used by JS type guards and as the
    //   boxing brand
    // - `__box()`, which wraps the object into a RNJsi::BoxedNativeObject
    //   HostObject that worklets can pass across runtimes by reference
    // See registerCustomSerializable in src/skia/SkiaWorkletSerialization.ts.
    prototype.setProperty(
        runtime, "__typename__",
        jsi::String::createFromUtf8(runtime, Derived::CLASS_NAME));

    auto boxFunc = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, "__box"), 0,
        [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *,
           size_t) -> jsi::Value {
          return RNJsi::boxNativeObject(rt, thisValue);
        });
    prototype.setProperty(runtime, "__box", boxFunc);

    // Install a generic toJSON so JSON.stringify sees the data properties.
    // They live on the prototype (getters), and JSON.stringify only
    // serializes *own* enumerable properties — with the legacy HostObject
    // pattern all properties were reported as own, so e.g.
    // JSON.stringify(rect) used to produce {x, y, width, height,
    // __typename__} and now would produce {} without this.
    auto toJSONFunc = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, "toJSON"), 0,
        [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *,
           size_t) -> jsi::Value {
          if (!thisValue.isObject()) {
            return jsi::Value::undefined();
          }
          auto self = thisValue.asObject(rt);
          auto objectCtor = rt.global().getPropertyAsObject(rt, "Object");
          auto getPrototypeOf =
              objectCtor.getPropertyAsFunction(rt, "getPrototypeOf");
          auto getOwnPropertyNames =
              objectCtor.getPropertyAsFunction(rt, "getOwnPropertyNames");
          auto proto = getPrototypeOf.call(rt, self);
          jsi::Object result(rt);
          if (proto.isObject()) {
            auto names =
                getOwnPropertyNames.call(rt, proto).asObject(rt).asArray(rt);
            auto size = names.size(rt);
            for (size_t i = 0; i < size; i++) {
              auto name = names.getValueAtIndex(rt, i).asString(rt).utf8(rt);
              if (name == "constructor" || name == "toJSON") {
                continue;
              }
              auto value = self.getProperty(rt, name.c_str());
              // Skip methods (dispose, __box, ...) — JSON.stringify would
              // drop them anyway; skipping avoids serializing them at all.
              if (value.isObject() && value.asObject(rt).isFunction(rt)) {
                continue;
              }
              result.setProperty(rt, name.c_str(), value);
            }
          }
          return result;
        });
    prototype.setProperty(runtime, "toJSON", toJSONFunc);

    // Register the reconstructor used by BoxedNativeObject::unbox() to
    // rebuild this object (prototype + native state) on another runtime.
    static std::once_flag boxingRegistered;
    std::call_once(boxingRegistered, []() {
      RNJsi::BoxedNativeObjectRegistry::getInstance().registerClass(
          Derived::CLASS_NAME,
          [](jsi::Runtime &rt,
             std::shared_ptr<jsi::NativeState> state) -> jsi::Value {
            auto instance = std::dynamic_pointer_cast<Derived>(state);
            if (instance == nullptr) {
              throw jsi::JSError(rt, "Invalid boxed native object state");
            }
            // Unboxing creates a *view* of the object on the target runtime.
            // Keep the runtime the object was originally created on: async
            // native code (e.g. GPUDevice error/lost events) delivers into
            // the creation runtime, and rebinding it to a worklet runtime
            // would invoke main-runtime jsi::Functions on the wrong runtime
            // and thread.
            auto *originalRuntime = instance->getCreationRuntime();
            auto value = Derived::create(rt, instance);
            if (originalRuntime != nullptr) {
              instance->setCreationRuntime(originalRuntime);
            }
            return value;
          });
    });

    // Hand the prototype to the runtime-owned cache
    RNJsi::JSICache::get(runtime).setPrototype(prototypeKey(),
                                               std::move(prototype));
  }

  /**
   * Install a constructor function on the global object.
   * This enables `instanceof` checks: `obj instanceof ClassName`
   *
   * The constructor throws if called directly (these objects are only
   * created internally by the native code).
   */
  static void installConstructor(jsi::Runtime &runtime) {
    installPrototype(runtime);

    auto *prototype = getCachedPrototype(runtime);
    if (prototype == nullptr) {
      return;
    }

    // Create a constructor function that throws when called directly
    auto ctor = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, Derived::CLASS_NAME), 0,
        [](jsi::Runtime &rt, const jsi::Value & /*thisVal*/,
           const jsi::Value * /*args*/, size_t /*count*/) -> jsi::Value {
          throw jsi::JSError(rt, std::string("Illegal constructor: ") +
                                     Derived::CLASS_NAME +
                                     " objects are created by the WebGPU API");
        });

    // Set the prototype property on the constructor
    // This is what makes `instanceof` work
    ctor.setProperty(runtime, "prototype", *prototype);

    // Set constructor property on prototype pointing back to constructor
    prototype->setProperty(runtime, "constructor", ctor);

    // Install on global
    runtime.global().setProperty(runtime, Derived::CLASS_NAME, std::move(ctor));
  }

  /**
   * Create a JS object with native state attached.
   */
  static jsi::Value create(jsi::Runtime &runtime,
                           std::shared_ptr<Derived> instance) {
    installPrototype(runtime);

    // Store creation runtime for logging etc.
    instance->setCreationRuntime(&runtime);

    // Create a new object
    jsi::Object obj(runtime);

    // Attach native state
    obj.setNativeState(runtime, instance);

    // Set prototype
    if (auto *prototype = getCachedPrototype(runtime)) {
      auto objectCtor = runtime.global().getPropertyAsObject(runtime, "Object");
      auto setPrototypeOf =
          objectCtor.getPropertyAsFunction(runtime, "setPrototypeOf");
      setPrototypeOf.call(runtime, obj, *prototype);
    }

    // Set memory pressure hint for GC
    auto pressure = instance->getMemoryPressure();
    if (pressure > 0) {
      obj.setExternalMemoryPressure(runtime, pressure);
    }

    return std::move(obj);
  }

  /**
   * Get the native state from a JS value.
   * Throws if the value doesn't have the expected native state.
   */
  static std::shared_ptr<Derived> fromValue(jsi::Runtime &runtime,
                                            const jsi::Value &value) {
    if (!value.isObject()) {
      throw jsi::JSError(runtime, std::string("Expected ") +
                                      Derived::CLASS_NAME +
                                      " but got non-object");
    }
    jsi::Object obj = value.getObject(runtime);
    if (!obj.hasNativeState<Derived>(runtime)) {
      throw jsi::JSError(runtime, std::string("Expected ") +
                                      Derived::CLASS_NAME +
                                      " but got different type");
    }
    return obj.getNativeState<Derived>(runtime);
  }

  /**
   * Memory pressure for GC hints. Override in derived classes.
   */
  virtual size_t getMemoryPressure() { return kMinMemoryPressure; }

  /**
   * Set the creation runtime. Called during create().
   */
  void setCreationRuntime(jsi::Runtime *runtime) { _creationRuntime = runtime; }

  /**
   * Get the creation runtime.
   * WARNING: This pointer may become invalid if the runtime is destroyed.
   */
  jsi::Runtime *getCreationRuntime() const { return _creationRuntime; }

protected:
  explicit NativeObject(const char *name) : _name(name) {}

  virtual ~NativeObject() {}

  const char *_name;
  jsi::Runtime *_creationRuntime = nullptr;

  // ============================================================
  // Helper methods for definePrototype() implementations
  // ============================================================

  /**
   * Install a method on the prototype.
   *
   * The installers below resolve `this` with NativeObject<Derived>::fromValue
   * (explicitly qualified): derived classes may shadow fromValue with a
   * public static of the same name that returns the wrapped inner object
   * (the RNSkia wrappers do), which must not be picked up here.
   */
  template <typename ReturnType, typename... Args>
  static void installMethod(jsi::Runtime &runtime, jsi::Object &prototype,
                            const char *name,
                            ReturnType (Derived::*method)(Args...)) {
    auto func = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, name), sizeof...(Args),
        [method](jsi::Runtime &rt, const jsi::Value &thisVal,
                 const jsi::Value *args, size_t count) -> jsi::Value {
          auto native = NativeObject<Derived>::fromValue(rt, thisVal);
          return callMethod(native.get(), method, rt, args,
                            std::index_sequence_for<Args...>{}, count);
        });
    prototype.setProperty(runtime, name, func);
  }

  /**
   * Install a method whose native implementation needs the calling jsi::Runtime
   * as its first parameter. Used by entry points that must act per-runtime
   * (e.g. GPU::requestAdapter, which creates a per-runtime RuntimeContext).
   */
  template <typename ReturnType, typename... Args>
  static void installMethodWithRuntime(
      jsi::Runtime &runtime, jsi::Object &prototype, const char *name,
      ReturnType (Derived::*method)(jsi::Runtime &, Args...)) {
    auto func = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, name), sizeof...(Args),
        [method](jsi::Runtime &rt, const jsi::Value &thisVal,
                 const jsi::Value *args, size_t count) -> jsi::Value {
          auto native = NativeObject<Derived>::fromValue(rt, thisVal);
          return callMethodWithRuntime(native.get(), method, rt, args,
                                       std::index_sequence_for<Args...>{},
                                       count);
        });
    prototype.setProperty(runtime, name, func);
  }

  /**
   * Install a getter on the prototype.
   */
  template <typename ReturnType>
  static void installGetter(jsi::Runtime &runtime, jsi::Object &prototype,
                            const char *name, ReturnType (Derived::*getter)()) {
    // Create a getter function
    auto getterFunc = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, std::string("get_") + name),
        0,
        [getter](jsi::Runtime &rt, const jsi::Value &thisVal,
                 const jsi::Value *args, size_t count) -> jsi::Value {
          auto native = NativeObject<Derived>::fromValue(rt, thisVal);
          if constexpr (std::is_same_v<ReturnType, void>) {
            (native.get()->*getter)();
            return jsi::Value::undefined();
          } else {
            ReturnType result = (native.get()->*getter)();
            return RNJsi::JSIConverter<std::decay_t<ReturnType>>::toJSI(
                rt, std::move(result));
          }
        });

    // Use Object.defineProperty to create a proper getter
    auto objectCtor = runtime.global().getPropertyAsObject(runtime, "Object");
    auto defineProperty =
        objectCtor.getPropertyAsFunction(runtime, "defineProperty");

    jsi::Object descriptor(runtime);
    descriptor.setProperty(runtime, "get", getterFunc);
    descriptor.setProperty(runtime, "enumerable", true);
    descriptor.setProperty(runtime, "configurable", true);

    defineProperty.call(runtime, prototype,
                        jsi::String::createFromUtf8(runtime, name), descriptor);
  }

  /**
   * Install a setter on the prototype.
   */
  template <typename ValueType>
  static void installSetter(jsi::Runtime &runtime, jsi::Object &prototype,
                            const char *name,
                            void (Derived::*setter)(ValueType)) {
    auto setterFunc = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, std::string("set_") + name),
        1,
        [setter](jsi::Runtime &rt, const jsi::Value &thisVal,
                 const jsi::Value *args, size_t count) -> jsi::Value {
          if (count < 1) {
            throw jsi::JSError(rt, "Setter requires a value argument");
          }
          auto native = NativeObject<Derived>::fromValue(rt, thisVal);
          auto value = RNJsi::JSIConverter<std::decay_t<ValueType>>::fromJSI(
              rt, args[0], false);
          (native.get()->*setter)(std::move(value));
          return jsi::Value::undefined();
        });

    // Use Object.defineProperty to create a proper setter
    auto objectCtor = runtime.global().getPropertyAsObject(runtime, "Object");
    auto defineProperty =
        objectCtor.getPropertyAsFunction(runtime, "defineProperty");

    // Check if property already has a getter
    auto getOwnPropertyDescriptor =
        objectCtor.getPropertyAsFunction(runtime, "getOwnPropertyDescriptor");
    auto existingDesc = getOwnPropertyDescriptor.call(
        runtime, prototype, jsi::String::createFromUtf8(runtime, name));

    jsi::Object descriptor(runtime);
    if (existingDesc.isObject()) {
      auto existingDescObj = existingDesc.getObject(runtime);
      if (existingDescObj.hasProperty(runtime, "get")) {
        descriptor.setProperty(runtime, "get",
                               existingDescObj.getProperty(runtime, "get"));
      }
    }
    descriptor.setProperty(runtime, "set", setterFunc);
    descriptor.setProperty(runtime, "enumerable", true);
    descriptor.setProperty(runtime, "configurable", true);

    defineProperty.call(runtime, prototype,
                        jsi::String::createFromUtf8(runtime, name), descriptor);
  }

  /**
   * Install both getter and setter for a property.
   */
  template <typename ReturnType, typename ValueType>
  static void installGetterSetter(jsi::Runtime &runtime, jsi::Object &prototype,
                                  const char *name,
                                  ReturnType (Derived::*getter)(),
                                  void (Derived::*setter)(ValueType)) {
    auto getterFunc = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, std::string("get_") + name),
        0,
        [getter](jsi::Runtime &rt, const jsi::Value &thisVal,
                 const jsi::Value *args, size_t count) -> jsi::Value {
          auto native = NativeObject<Derived>::fromValue(rt, thisVal);
          ReturnType result = (native.get()->*getter)();
          return RNJsi::JSIConverter<std::decay_t<ReturnType>>::toJSI(
              rt, std::move(result));
        });

    auto setterFunc = jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, std::string("set_") + name),
        1,
        [setter](jsi::Runtime &rt, const jsi::Value &thisVal,
                 const jsi::Value *args, size_t count) -> jsi::Value {
          if (count < 1) {
            throw jsi::JSError(rt, "Setter requires a value argument");
          }
          auto native = NativeObject<Derived>::fromValue(rt, thisVal);
          auto value = RNJsi::JSIConverter<std::decay_t<ValueType>>::fromJSI(
              rt, args[0], false);
          (native.get()->*setter)(std::move(value));
          return jsi::Value::undefined();
        });

    auto objectCtor = runtime.global().getPropertyAsObject(runtime, "Object");
    auto defineProperty =
        objectCtor.getPropertyAsFunction(runtime, "defineProperty");

    jsi::Object descriptor(runtime);
    descriptor.setProperty(runtime, "get", getterFunc);
    descriptor.setProperty(runtime, "set", setterFunc);
    descriptor.setProperty(runtime, "enumerable", true);
    descriptor.setProperty(runtime, "configurable", true);

    defineProperty.call(runtime, prototype,
                        jsi::String::createFromUtf8(runtime, name), descriptor);
  }

private:
  // Helper to call a method that takes the calling jsi::Runtime as its first
  // parameter, with JSI argument conversion for the rest and JSI conversion of
  // the result.
  template <typename ReturnType, typename... Args, size_t... Is>
  static jsi::Value
  callMethodWithRuntime(Derived *obj,
                        ReturnType (Derived::*method)(jsi::Runtime &, Args...),
                        jsi::Runtime &runtime, const jsi::Value *args,
                        std::index_sequence<Is...>, size_t count) {
    ReturnType result = (obj->*method)(
        runtime, RNJsi::JSIConverter<std::decay_t<Args>>::fromJSI(
                     runtime, args[Is], Is >= count)...);
    return RNJsi::JSIConverter<std::decay_t<ReturnType>>::toJSI(
        runtime, std::move(result));
  }

  // Helper to call a method with JSI argument conversion
  template <typename ReturnType, typename... Args, size_t... Is>
  static jsi::Value callMethod(Derived *obj,
                               ReturnType (Derived::*method)(Args...),
                               jsi::Runtime &runtime, const jsi::Value *args,
                               std::index_sequence<Is...>, size_t count) {
    if constexpr (std::is_same_v<ReturnType, void>) {
      (obj->*method)(RNJsi::JSIConverter<std::decay_t<Args>>::fromJSI(
          runtime, args[Is], Is >= count)...);
      return jsi::Value::undefined();
    } else if constexpr (std::is_same_v<ReturnType, jsi::Value>) {
      // Special case: if return type is jsi::Value, method has full control
      // This requires the method signature to match HostFunction
      return (obj->*method)(runtime, jsi::Value::undefined(), args, count);
    } else {
      ReturnType result =
          (obj->*method)(RNJsi::JSIConverter<std::decay_t<Args>>::fromJSI(
              runtime, args[Is], Is >= count)...);
      return RNJsi::JSIConverter<std::decay_t<ReturnType>>::toJSI(
          runtime, std::move(result));
    }
  }
};

// Type trait to detect NativeObject-derived classes
template <typename T> struct is_native_object : std::false_type {};

template <typename T>
struct is_native_object<std::shared_ptr<T>>
    : std::bool_constant<std::is_base_of_v<NativeObject<T>, T>> {};

} // namespace RNJsi
