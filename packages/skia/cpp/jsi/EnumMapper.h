#pragma once

#include <stdexcept>
#include <string>

namespace RNJsi {

namespace EnumMapper {
// Add these two methods in namespace "EnumMapper" to allow parsing a custom
// enum:
// 1. `static void convertJSUnionToEnum(const std::string& inUnion, Enum*
// outEnum)`
// 2. `static void convertEnumToJSUnion(Enum inEnum, std::string* outUnion)`

// inline (not static): this header is now included by every TU via
// NativeObject.h, and an unused file-scope static would trip
// -Werror=unused-function in non-Graphite builds.
inline std::runtime_error invalidUnion(const std::string &passedUnion) {
  return std::runtime_error(
      "Cannot convert JS Value to Enum: Invalid Union value passed! (\"" +
      std::string(passedUnion) + "\")");
}

template <typename T> static std::runtime_error invalidEnum(T passedEnum) {
  return std::runtime_error(
      "Cannot convert Enum to JS Value: Invalid Enum passed! (Value #" +
      std::to_string(static_cast<int>(passedEnum)) + ")");
}

// Trait to check if a convertJSUnionToEnum function for enum type T exists
template <typename T, typename = void>
struct has_js_union_to_enum : std::false_type {};
template <typename T>
struct has_js_union_to_enum<
    T, std::void_t<decltype(convertJSUnionToEnum(std::declval<std::string>(),
                                                 std::declval<T *>()))>>
    : std::true_type {};

// Trait to check if a convertEnumToJSUnion function for enum type T exists
template <typename T, typename = void>
struct has_enum_to_js_union : std::false_type {};
template <typename T>
struct has_enum_to_js_union<
    T, std::void_t<decltype(convertEnumToJSUnion(
           std::declval<T>(), std::declval<std::string *>()))>>
    : std::true_type {};

template <typename TEnum>
static void convertJSUnionToEnum(const std::string &, TEnum *) {
  static_assert(has_js_union_to_enum<TEnum>::value,
                "Cannot convert a JS union to this enum type. Did you "
                "implement EnumMapper::convertJSUnionToEnum(...)?");
}

template <typename TEnum>
static void convertEnumToJSUnion(TEnum, std::string *) {
  static_assert(has_enum_to_js_union<TEnum>::value,
                "Cannot convert this enum type to a JS union. Did you "
                "implement EnumMapper::convertEnumToJSUnion(...)?");
}
} // namespace EnumMapper

} // namespace RNJsi
