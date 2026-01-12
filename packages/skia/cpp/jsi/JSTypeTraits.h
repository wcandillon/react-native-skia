#pragma once

#include <jsi/jsi.h>
#include <string>
#include <type_traits>

namespace RNJsi {

namespace jsi = facebook::jsi;

/**
 * Marker type for methods that return "this" for chaining.
 * Methods returning ThisRef will have the JS call return the thisValue.
 */
struct ThisRef {};

/**
 * Primary template for type conversion traits.
 * Specialize this for each type you want to convert between JS and C++.
 */
template <typename T, typename Enable = void>
struct JSTypeTraits {
  // static jsi::Value toJS(jsi::Runtime& rt, const T& value);
  // static T fromJS(jsi::Runtime& rt, const jsi::Value& value);
};

// =============================================================================
// Void - for methods with no return value
// =============================================================================

template <>
struct JSTypeTraits<void> {
  static jsi::Value toJS(jsi::Runtime &) { return jsi::Value::undefined(); }
};

// =============================================================================
// ThisRef - marker for chainable methods
// =============================================================================

template <>
struct JSTypeTraits<ThisRef> {
  // Special handling in JSClass - returns thisValue
};

// =============================================================================
// Boolean
// =============================================================================

template <>
struct JSTypeTraits<bool> {
  static jsi::Value toJS(jsi::Runtime &, bool value) {
    return jsi::Value(value);
  }

  static bool fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isBool()) {
      throw jsi::JSError(rt, "Expected boolean");
    }
    return value.getBool();
  }
};

// =============================================================================
// Integer types
// =============================================================================

template <>
struct JSTypeTraits<int> {
  static jsi::Value toJS(jsi::Runtime &, int value) {
    return jsi::Value(static_cast<double>(value));
  }

  static int fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isNumber()) {
      throw jsi::JSError(rt, "Expected number");
    }
    return static_cast<int>(value.asNumber());
  }
};

template <>
struct JSTypeTraits<size_t> {
  static jsi::Value toJS(jsi::Runtime &, size_t value) {
    return jsi::Value(static_cast<double>(value));
  }

  static size_t fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isNumber()) {
      throw jsi::JSError(rt, "Expected number");
    }
    return static_cast<size_t>(value.asNumber());
  }
};

// =============================================================================
// Floating point types
// =============================================================================

template <>
struct JSTypeTraits<float> {
  static jsi::Value toJS(jsi::Runtime &, float value) {
    return jsi::Value(static_cast<double>(value));
  }

  static float fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isNumber()) {
      throw jsi::JSError(rt, "Expected number");
    }
    return static_cast<float>(value.asNumber());
  }
};

template <>
struct JSTypeTraits<double> {
  static jsi::Value toJS(jsi::Runtime &, double value) {
    return jsi::Value(value);
  }

  static double fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isNumber()) {
      throw jsi::JSError(rt, "Expected number");
    }
    return value.asNumber();
  }
};

// =============================================================================
// String
// =============================================================================

template <>
struct JSTypeTraits<std::string> {
  static jsi::Value toJS(jsi::Runtime &rt, const std::string &value) {
    return jsi::String::createFromUtf8(rt, value);
  }

  static std::string fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isString()) {
      throw jsi::JSError(rt, "Expected string");
    }
    return value.asString(rt).utf8(rt);
  }
};

// =============================================================================
// jsi::Value passthrough (for advanced use cases)
// =============================================================================

template <>
struct JSTypeTraits<jsi::Value> {
  static jsi::Value toJS(jsi::Runtime &rt, const jsi::Value &value) {
    // Note: This creates a copy. For move semantics, use jsi::Value directly.
    return jsi::Value(rt, value);
  }

  static jsi::Value fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    return jsi::Value(rt, value);
  }
};

// =============================================================================
// jsi::Object passthrough
// =============================================================================

template <>
struct JSTypeTraits<jsi::Object> {
  static jsi::Value toJS(jsi::Runtime &rt, const jsi::Object &value) {
    return jsi::Value(rt, value);
  }

  static jsi::Object fromJS(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
      throw jsi::JSError(rt, "Expected object");
    }
    return value.asObject(rt);
  }
};

} // namespace RNJsi
