#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <optional>
#include <string>
#include <tuple>
#include <type_traits>
#include <unordered_map>
#include <utility>

#include "JSTypeTraits.h"
#include "NativeStateWrapper.h"
#include "RuntimeAwareCache.h"

namespace RNJsi {

namespace jsi = facebook::jsi;

// =============================================================================
// Function Traits - Extract return type and argument types from method pointers
// =============================================================================

template <typename T>
struct FunctionTraits;

template <typename C, typename R, typename... Args>
struct FunctionTraits<R (C::*)(Args...)> {
  using ReturnType = R;
  using ClassType = C;
  using ArgsTuple = std::tuple<Args...>;
  static constexpr size_t arity = sizeof...(Args);
};

template <typename C, typename R, typename... Args>
struct FunctionTraits<R (C::*)(Args...) const> {
  using ReturnType = R;
  using ClassType = C;
  using ArgsTuple = std::tuple<Args...>;
  static constexpr size_t arity = sizeof...(Args);
};

// =============================================================================
// Prototype Cache Entry - Holds prototype using optional to avoid default ctor
// =============================================================================

struct PrototypeCacheEntry {
  std::optional<jsi::Object> prototype;
};

// =============================================================================
// JSClass - Main template for wrapping C++ objects with JSI native state
// =============================================================================

template <typename T, typename Derived>
class JSClass {
public:
  using ObjectType = T;

  virtual ~JSClass() = default;

protected:
  /**
   * Access the wrapped native object.
   */
  T &getObject() { return _state->get(); }
  const T &getObject() const { return _state->get(); }

  /**
   * Override this to register methods and properties.
   * Called once per runtime when creating the prototype.
   */
  virtual void loadHybridMethods() = 0;

  /**
   * Override to report memory pressure for GC hints.
   */
  virtual size_t getMemoryPressure() const { return 0; }

  /**
   * Register a method on the prototype.
   */
  template <typename MethodPtr>
  void registerHybridMethod(const char *name, MethodPtr method, Derived *self) {
    _pendingMethods.emplace(name, createMethodHostFunction(name, method, self));
  }

  /**
   * Register a getter property on the prototype.
   */
  template <typename GetterPtr>
  void registerHybridGetter(const char *name, GetterPtr getter, Derived *self) {
    _pendingGetters.emplace(name,
                            createGetterHostFunction(name, getter, self));
  }

private:
  std::shared_ptr<NativeStateWrapper<T>> _state;

  // Temporary storage for methods/getters during prototype creation
  std::unordered_map<std::string, jsi::HostFunctionType> _pendingMethods;
  std::unordered_map<std::string, jsi::HostFunctionType> _pendingGetters;

  // Per-runtime prototype cache
  static RuntimeAwareCache<PrototypeCacheEntry> &getPrototypeCache() {
    static RuntimeAwareCache<PrototypeCacheEntry> cache;
    return cache;
  }

  /**
   * Instance state stored as NativeState on the JS object.
   * Contains both the wrapped object and the C++ wrapper instance.
   */
  struct InstanceState : public jsi::NativeState {
    std::shared_ptr<NativeStateWrapper<T>> objectState;
    std::shared_ptr<Derived> instance;

    InstanceState(std::shared_ptr<NativeStateWrapper<T>> state,
                  std::shared_ptr<Derived> inst)
        : objectState(std::move(state)), instance(std::move(inst)) {}
  };

  /**
   * Create a host function for a method.
   */
  template <typename MethodPtr>
  jsi::HostFunctionType createMethodHostFunction(const char *name,
                                                 MethodPtr method,
                                                 Derived *self) {
    return [method](jsi::Runtime &rt, const jsi::Value &thisValue,
                    const jsi::Value *arguments,
                    size_t count) -> jsi::Value {
      // Get instance from native state
      if (!thisValue.isObject()) {
        throw jsi::JSError(rt, "Expected this to be an object");
      }
      auto obj = thisValue.asObject(rt);
      if (!obj.hasNativeState(rt)) {
        throw jsi::JSError(rt, "Object has no native state");
      }
      auto instanceState =
          std::dynamic_pointer_cast<InstanceState>(obj.getNativeState(rt));
      if (!instanceState) {
        throw jsi::JSError(rt, "Invalid native state type");
      }

      Derived *instance = instanceState->instance.get();
      instance->_state = instanceState->objectState;

      return invokeMethod(rt, thisValue, arguments, count, instance, method);
    };
  }

  /**
   * Create a host function for a getter.
   */
  template <typename GetterPtr>
  jsi::HostFunctionType createGetterHostFunction(const char *name,
                                                 GetterPtr getter,
                                                 Derived *self) {
    return [getter](jsi::Runtime &rt, const jsi::Value &thisValue,
                    const jsi::Value *arguments,
                    size_t count) -> jsi::Value {
      if (!thisValue.isObject()) {
        throw jsi::JSError(rt, "Expected this to be an object");
      }
      auto obj = thisValue.asObject(rt);
      if (!obj.hasNativeState(rt)) {
        throw jsi::JSError(rt, "Object has no native state");
      }
      auto instanceState =
          std::dynamic_pointer_cast<InstanceState>(obj.getNativeState(rt));
      if (!instanceState) {
        throw jsi::JSError(rt, "Invalid native state type");
      }

      Derived *instance = instanceState->instance.get();
      instance->_state = instanceState->objectState;

      // Getters take no arguments
      return invokeMethod(rt, thisValue, nullptr, 0, instance, getter);
    };
  }

  /**
   * Invoke a method with automatic argument conversion.
   */
  template <typename MethodPtr>
  static jsi::Value invokeMethod(jsi::Runtime &rt, const jsi::Value &thisValue,
                                 const jsi::Value *arguments, size_t count,
                                 Derived *instance, MethodPtr method) {
    using Traits = FunctionTraits<MethodPtr>;
    using RetType = typename Traits::ReturnType;
    using ArgsTuple = typename Traits::ArgsTuple;

    return invokeWithArgs<MethodPtr, RetType, ArgsTuple>(
        rt, thisValue, arguments, count, instance, method,
        std::make_index_sequence<Traits::arity>{});
  }

  /**
   * Helper to unpack arguments and invoke the method.
   */
  template <typename MethodPtr, typename RetType, typename ArgsTuple,
            size_t... Is>
  static jsi::Value invokeWithArgs(jsi::Runtime &rt,
                                   const jsi::Value &thisValue,
                                   const jsi::Value *arguments, size_t count,
                                   Derived *instance, MethodPtr method,
                                   std::index_sequence<Is...>) {
    // Check argument count
    constexpr size_t expectedArgs = sizeof...(Is);
    if (count < expectedArgs) {
      throw jsi::JSError(rt, "Expected " + std::to_string(expectedArgs) +
                                 " arguments, got " + std::to_string(count));
    }

    // Convert arguments and invoke
    if constexpr (std::is_same_v<RetType, void>) {
      (instance->*method)(
          JSTypeTraits<std::decay_t<std::tuple_element_t<Is, ArgsTuple>>>::
              fromJS(rt, arguments[Is])...);
      return jsi::Value::undefined();
    } else if constexpr (std::is_same_v<RetType, ThisRef>) {
      (instance->*method)(
          JSTypeTraits<std::decay_t<std::tuple_element_t<Is, ArgsTuple>>>::
              fromJS(rt, arguments[Is])...);
      return jsi::Value(rt, thisValue.asObject(rt));
    } else {
      RetType result = (instance->*method)(
          JSTypeTraits<std::decay_t<std::tuple_element_t<Is, ArgsTuple>>>::
              fromJS(rt, arguments[Is])...);
      return JSTypeTraits<RetType>::toJS(rt, result);
    }
  }

  /**
   * Get or create the prototype for this runtime.
   */
  static jsi::Object &getPrototype(jsi::Runtime &rt) {
    auto &entry = getPrototypeCache().get(rt);

    if (!entry.prototype.has_value()) {
      entry.prototype = createPrototype(rt);
    }

    return entry.prototype.value();
  }

  /**
   * Create the prototype object with all methods registered.
   */
  static jsi::Object createPrototype(jsi::Runtime &rt) {
    auto prototype = jsi::Object(rt);

    // Create a temporary instance to collect method registrations
    auto tempInstance = std::make_shared<Derived>();
    tempInstance->loadHybridMethods();

    // Register all methods on the prototype
    for (auto &[name, hostFunc] : tempInstance->_pendingMethods) {
      auto func = jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forAscii(rt, name.c_str()), 0, hostFunc);
      prototype.setProperty(rt, name.c_str(), std::move(func));
    }

    // Register all getters on the prototype
    for (auto &[name, hostFunc] : tempInstance->_pendingGetters) {
      auto func = jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forAscii(rt, name.c_str()), 0, hostFunc);
      prototype.setProperty(rt, name.c_str(), std::move(func));
    }

    return prototype;
  }

public:
  /**
   * Create a new JS object wrapping the given native object.
   */
  static jsi::Value create(jsi::Runtime &rt, T object) {
    // Get or create the prototype for this runtime
    auto &prototype = getPrototype(rt);

    // Create JS object with prototype
    // Note: jsi::Object::create(rt, prototype) is not available in all JSI
    // versions We need to use Object.create() from JS
    auto objectCreate =
        rt.global()
            .getPropertyAsObject(rt, "Object")
            .getPropertyAsFunction(rt, "create");
    auto jsObj = objectCreate.call(rt, prototype).asObject(rt);

    // Create native state
    auto objectState = std::make_shared<NativeStateWrapper<T>>(std::move(object));
    auto instance = std::make_shared<Derived>();
    instance->_state = objectState;

    auto instanceState =
        std::make_shared<InstanceState>(std::move(objectState), std::move(instance));

    // Attach native state to JS object
    jsObj.setNativeState(rt, instanceState);

    // Set external memory pressure if applicable
    size_t memPressure = instanceState->instance->getMemoryPressure();
    if (memPressure > 0) {
      jsObj.setExternalMemoryPressure(rt, memPressure);
    }

    return jsObj;
  }

  /**
   * Extract the native object pointer from a JS value.
   * Returns nullptr if the value is not a valid wrapped object.
   */
  static T *fromValue(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
      return nullptr;
    }
    auto obj = value.asObject(rt);
    if (!obj.hasNativeState(rt)) {
      return nullptr;
    }
    auto instanceState =
        std::dynamic_pointer_cast<InstanceState>(obj.getNativeState(rt));
    if (!instanceState) {
      return nullptr;
    }
    return &instanceState->objectState->get();
  }
};

} // namespace RNJsi
