#pragma once

#include <limits>
#include <map>
#include <memory>
#include <string>
#include <type_traits>
#include <unordered_set>
#include <utility>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "utils/RNSkLog.h"

#include "EnumMapper.h"
#include "Promise.h"

// This number is the maximum integer that can be represented exactly as a
// double
#define MAX_SAFE_INTEGER static_cast<uint64_t>(9007199254740991)

#if __has_include(<cxxabi.h>)
#include <cxxabi.h>
#endif

namespace RNJsi {

namespace jsi = facebook::jsi;

// Unknown type (error)
template <typename ArgType, typename Enable = void> struct JSIConverter {
  static ArgType fromJSI(jsi::Runtime &, const jsi::Value &, bool outOfBound) {
    static_assert(always_false<ArgType>::value,
                  "This type is not supported by the JSIConverter!");
    return ArgType();
  }
  static jsi::Value toJSI(jsi::Runtime &, ArgType) {
    static_assert(always_false<ArgType>::value,
                  "This type is not supported by the JSIConverter!");
    return jsi::Value::undefined();
  }

private:
  template <typename> struct always_false : std::false_type {};
};

// int <> number
template <> struct JSIConverter<int> {
  static int fromJSI(jsi::Runtime &, const jsi::Value &arg, bool outOfBound) {
    return static_cast<int>(arg.asNumber());
  }
  static jsi::Value toJSI(jsi::Runtime &, int arg) { return jsi::Value(arg); }
};

// double <> number
template <> struct JSIConverter<double> {
  static double fromJSI(jsi::Runtime &, const jsi::Value &arg,
                        bool outOfBound) {
    return arg.asNumber();
  }
  static jsi::Value toJSI(jsi::Runtime &, double arg) {
    return jsi::Value(arg);
  }
};

// float <> number
template <> struct JSIConverter<float> {
  static float fromJSI(jsi::Runtime &, const jsi::Value &arg, bool outOfBound) {
    return static_cast<float>(arg.asNumber());
  }
  static jsi::Value toJSI(jsi::Runtime &, float arg) {
    return jsi::Value(static_cast<double>(arg));
  }
};

template <> struct JSIConverter<std::nullptr_t> {
  static std::nullptr_t fromJSI(jsi::Runtime &, const jsi::Value &arg,
                                bool outOfBound) {
    return nullptr;
  }
  static jsi::Value toJSI(jsi::Runtime &, std::nullptr_t arg) {
    return jsi::Value::null();
  }
};

template <typename T>
struct JSIConverter<T, std::enable_if_t<!std::is_same_v<T, uint64_t> &&
                                        std::is_same_v<T, size_t>>> {
  static size_t fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isNumber()) {
      double value = arg.asNumber();
      return static_cast<size_t>(value);
    } else {
      return arg.asBigInt(runtime).asInt64(runtime);
    }
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, size_t arg) {
    return jsi::Value(static_cast<double>(arg));
  }
};

// uint32_t <> double
template <> struct JSIConverter<uint32_t> {
  static double fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    double value = arg.asNumber();
    return static_cast<uint32_t>(value);
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, uint32_t arg) {
    return jsi::Value(static_cast<double>(arg));
  }
};

// uint64_t <> BigInt
template <> struct JSIConverter<uint64_t> {
  static uint64_t fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                          bool outOfBound) {
    if (arg.isNumber()) {
      double value = arg.asNumber();
      if (value < 0 || value > MAX_SAFE_INTEGER) {
        throw jsi::JSError(runtime, "Number out of range for uint64_t");
      }
      return static_cast<uint64_t>(value);
    } else {
      return arg.asBigInt(runtime).getUint64(runtime);
    }
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, uint64_t arg) {
    if (arg <= MAX_SAFE_INTEGER) {
      return jsi::Value(static_cast<double>(arg));
    } else {
      throw jsi::JSError(runtime,
                         "Number too large to be represented as a double");
    }
  }
};

template <> struct JSIConverter<void *> {
  static void *fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                       bool outOfBound) {
    return reinterpret_cast<void *>(arg.asBigInt(runtime).getUint64(runtime));
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, void *arg) {
    return jsi::BigInt::fromUint64(runtime, reinterpret_cast<uint64_t>(arg));
  }
};

// bool <> boolean
template <> struct JSIConverter<bool> {
  static bool fromJSI(jsi::Runtime &, const jsi::Value &arg, bool outOfBound) {
    return arg.asBool();
  }
  static jsi::Value toJSI(jsi::Runtime &, bool arg) { return jsi::Value(arg); }
};

// std::string <> string
template <> struct JSIConverter<std::string> {
  static std::string fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                             bool outOfBound) {
    return arg.asString(runtime).utf8(runtime);
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, const std::string &arg) {
    return jsi::String::createFromUtf8(runtime, arg);
  }
};

// std::optional<T> <> T | undefined
template <typename TInner> struct JSIConverter<std::optional<TInner>> {
  static std::optional<TInner> fromJSI(jsi::Runtime &runtime,
                                       const jsi::Value &arg, bool outOfBound) {
    if (outOfBound || arg.isUndefined()) {
      return {};
    } else {
      return JSIConverter<TInner>::fromJSI(runtime, std::move(arg), outOfBound);
    }
  }
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          const std::optional<TInner> &arg) {
    if (arg == std::nullopt) {
      return jsi::Value::undefined();
    } else {
      return JSIConverter<TInner>::toJSI(runtime, arg.value());
    }
  }
};

// Enum <> Union
template <typename TEnum>
struct JSIConverter<TEnum, std::enable_if_t<std::is_enum<TEnum>::value>> {
  static TEnum fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                       bool outOfBound) {
    std::string string = arg.asString(runtime).utf8(runtime);
    TEnum outEnum;
    EnumMapper::convertJSUnionToEnum(string, &outEnum);
    return outEnum;
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, const TEnum &arg) {
    std::string outUnion;
    EnumMapper::convertEnumToJSUnion(arg, &outUnion);
    return jsi::String::createFromUtf8(runtime, outUnion);
  }
};

// jsi::Function <> Function
template <> struct JSIConverter<jsi::Function> {
  static jsi::Function fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                               bool outOfBound) {
    return arg.asObject(runtime).asFunction(runtime);
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, jsi::Function &&arg) {
    return std::move(arg);
  }
};

// std::map<std::string, T> <> Record<string, T>
template <typename ValueType>
struct JSIConverter<std::map<std::string, ValueType>> {
  static std::map<std::string, ValueType>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBound) {
    jsi::Object object = arg.asObject(runtime);
    jsi::Array propertyNames = object.getPropertyNames(runtime);
    size_t length = propertyNames.size(runtime);

    std::map<std::string, ValueType> map;
    for (size_t i = 0; i < length; ++i) {
      std::string key = propertyNames.getValueAtIndex(runtime, i)
                            .asString(runtime)
                            .utf8(runtime);
      jsi::Value value = object.getProperty(runtime, key.c_str());
      map.emplace(key,
                  JSIConverter<ValueType>::fromJSI(runtime, value, outOfBound));
    }
    return map;
  }
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          const std::map<std::string, ValueType> &map) {
    jsi::Object object(runtime);
    for (const auto &pair : map) {
      jsi::Value value = JSIConverter<ValueType>::toJSI(runtime, pair.second);
      jsi::String key = jsi::String::createFromUtf8(runtime, pair.first);
      object.setProperty(runtime, key, std::move(value));
    }
    return object;
  }
};

// std::vector<T> <> T[]
template <typename ElementType> struct JSIConverter<std::vector<ElementType>> {
  static std::vector<ElementType>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBound) {
    jsi::Array array = arg.asObject(runtime).asArray(runtime);
    size_t length = array.size(runtime);

    std::vector<ElementType> vector;
    vector.reserve(length);
    for (size_t i = 0; i < length; ++i) {
      jsi::Value elementValue = array.getValueAtIndex(runtime, i);
      vector.emplace_back(JSIConverter<ElementType>::fromJSI(
          runtime, elementValue, outOfBound));
    }
    return vector;
  }
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          const std::vector<ElementType> &vector) {
    jsi::Array array(runtime, vector.size());
    for (size_t i = 0; i < vector.size(); i++) {
      jsi::Value value = JSIConverter<ElementType>::toJSI(runtime, vector[i]);
      array.setValueAtIndex(runtime, i, std::move(value));
    }
    return array;
  }
};

// NativeState <> {}
template <typename T> struct is_shared_ptr_to_native_state : std::false_type {};

template <typename T>
struct is_shared_ptr_to_native_state<std::shared_ptr<T>>
    : std::is_base_of<jsi::NativeState, T> {};

template <typename T>
struct JSIConverter<T,
                    std::enable_if_t<is_shared_ptr_to_native_state<T>::value>> {
  using TPointee = typename T::element_type;

#if DEBUG
  inline static std::string getFriendlyTypename() {
    std::string name = std::string(typeid(TPointee).name());
#if __has_include(<cxxabi.h>)
    int status = 0;
    char *demangled_name =
        abi::__cxa_demangle(name.c_str(), NULL, NULL, &status);
    if (status == 0) {
      name = demangled_name;
      std::free(demangled_name);
    }
#endif
    return name;
  }

  inline static std::string
  invalidTypeErrorMessage(const std::string &typeDescription,
                          const std::string &reason) {
    return "Cannot convert \"" + typeDescription + "\" to NativeState<" +
           getFriendlyTypename() + ">! " + reason;
  }
#endif

  static T fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                   bool outOfBound) {
#if DEBUG
    if (arg.isUndefined()) {
      [[unlikely]];
      throw jsi::JSError(
          runtime, invalidTypeErrorMessage("undefined", "It is undefined!"));
    }
    if (!arg.isObject()) {
      [[unlikely]];
      std::string stringRepresentation = arg.toString(runtime).utf8(runtime);
      throw jsi::JSError(runtime,
                         invalidTypeErrorMessage(stringRepresentation,
                                                 "It is not an object!"));
    }
#endif
    jsi::Object object = arg.getObject(runtime);
#if DEBUG
    if (!object.hasNativeState<TPointee>(runtime)) [[unlikely]] {
      // Log instead of throwing: hasNativeState<T>() uses dynamic_cast (RTTI)
      // which can return false across shared-library / JSI-runtime boundaries
      // on iOS (duplicate typeinfo symbols in separate .dylib modules).
      // getNativeState<T>() below uses static_pointer_cast and works correctly
      // even when dynamic_cast fails, so this is not a fatal error.
      std::string stringRepresentation = arg.toString(runtime).utf8(runtime);
      RNSkia::RNSkLogger::logToConsole(
          "NativeState<T> RTTI mismatch for \"%s\" (expected %s) "
          "-- this is likely a false positive from dynamic_cast across JSI "
          "runtime boundaries; continuing with static_pointer_cast.",
          stringRepresentation.c_str(), getFriendlyTypename().c_str());
    }
#endif
    return object.getNativeState<TPointee>(runtime);
  }

private:
  // SFINAE helper to detect if T has a IsNativeObject marker type
  template <typename U, typename = typename U::IsNativeObject>
  static std::true_type hasNativeObjectMarker(int);
  template <typename U> static std::false_type hasNativeObjectMarker(...);

  // Type trait for detection
  static constexpr bool is_native_object =
      decltype(hasNativeObjectMarker<TPointee>(0))::value;

public:
  static jsi::Value toJSI(jsi::Runtime &runtime, const T &arg) {
#if DEBUG
    if (arg == nullptr) {
      [[unlikely]];
      throw jsi::JSError(runtime, "Cannot convert nullptr to NativeState<" +
                                      getFriendlyTypename() + ">!");
    }
#endif
    // Check if the type is a NativeObject (has IsNativeObject marker)
    // Use TPointee::create() if it's a NativeObject, otherwise fall back to
    // plain setNativeState
    if constexpr (is_native_object) {
      return TPointee::create(runtime, arg);
    } else {
      jsi::Object object(runtime);
      object.setNativeState(runtime, arg);
      return object;
    }
  }
};

template <typename O, typename T>
struct JSIConverter<std::variant<std::vector<T>, std::shared_ptr<O>>> {
  using Target = std::variant<std::vector<T>, std::shared_ptr<O>>;

  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isObject()) {
      auto object = arg.getObject(runtime);
      if (object.isArray(runtime)) {
        return Target(
            JSIConverter<std::vector<T>>::fromJSI(runtime, arg, outOfBound));
      }
      throw std::runtime_error("Invalid variant type expected array");
    }
    return Target(
        JSIConverter<std::shared_ptr<O>>::fromJSI(runtime, arg, outOfBound));
  }

  static jsi::Value toJSI(jsi::Runtime &, Target arg) {
    return jsi::Value::null();
  }
};

template <typename O>
struct JSIConverter<std::variant<std::nullptr_t, std::shared_ptr<O>>> {
  using Target = std::variant<std::nullptr_t, std::shared_ptr<O>>;

  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isNull()) {
      return Target(nullptr);
    }
    return Target(
        JSIConverter<std::shared_ptr<O>>::fromJSI(runtime, arg, outOfBound));
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, Target arg) {
    if (std::holds_alternative<std::nullptr_t>(arg)) {
      return jsi::Value::null();
    }
    return JSIConverter<std::shared_ptr<O>>::toJSI(
        runtime, std::get<std::shared_ptr<O>>(arg));
  }
};

template <typename O>
struct JSIConverter<std::variant<std::nullptr_t, O>,
                    std::enable_if_t<std::is_enum_v<O>>> {
  using Target = std::variant<std::nullptr_t, O>;

  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isNull()) {
      return Target(nullptr);
    } else if (arg.isNumber()) {
      return Target(static_cast<O>(arg.asNumber()));
    }
    return Target(JSIConverter<O>::fromJSI(runtime, arg, outOfBound));
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, Target arg) {
    if (std::holds_alternative<std::nullptr_t>(arg)) {
      return jsi::Value::null();
    }
    return JSIConverter<O>::toJSI(runtime, std::get<O>(arg));
  }
};

// TODO: careful std::variant<O, std::nullptr_t> doesn't overload
// std::variant<std::nullptr_t, 0> (order's matter)
// variant<nullptr_t, numeric>
template <typename O>
struct JSIConverter<
    std::variant<O, std::nullptr_t>,
    std::enable_if_t<std::is_arithmetic_v<O> || std::is_enum_v<O>>> {
  using Target = std::variant<O, std::nullptr_t>;
  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isNull()) {
      return Target(nullptr);
    }
    if (arg.isNumber()) {
      return Target(static_cast<O>(arg.asNumber()));
    }
    throw jsi::JSError(runtime, "Expected null or number");
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, Target arg) {
    if (std::holds_alternative<std::nullptr_t>(arg)) {
      return jsi::Value::null();
    }
    return jsi::Value(static_cast<double>(std::get<O>(arg)));
  }
};

template <> struct JSIConverter<std::unordered_set<std::string>> {
  using Target = std::unordered_set<std::string>;
  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    throw jsi::JSError(runtime, "JSIConverter<std::unordered_set<std::string>>:"
                                ":fromJSI not implemented");
  }

  static jsi::Value toJSI(jsi::Runtime &runtime, Target arg) {
    auto setConstructor =
        runtime.global().getPropertyAsFunction(runtime, "Set");
    auto set = setConstructor.callAsConstructor(runtime).asObject(runtime);
    auto add = set.getPropertyAsFunction(runtime, "add");
    for (const auto &value : arg) {
      jsi::Value jsiValue = JSIConverter<std::string>::toJSI(runtime, value);
      add.callWithThis(runtime, set, jsiValue);
    }
    return std::move(set);
  }
};

} // namespace RNJsi
