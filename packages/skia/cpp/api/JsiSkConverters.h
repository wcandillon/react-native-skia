#pragma once

#include <memory>
#include <optional>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

#include "jsi/JSIConverter.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColor.h"
#include "include/core/SkPoint3.h"
#include "include/core/SkRefCnt.h"
#include "include/core/SkSize.h"

#pragma clang diagnostic pop

// Forward declarations of the wrapped Skia types. Only the trait below needs
// them; the converter bodies are templates and are instantiated lazily, at
// which point the classes are complete.
class SkImage;
class SkShader;
class SkTypeface;
class SkColorFilter;
class SkImageFilter;
class SkMaskFilter;
class SkPathEffect;
class SkData;
class SkPicture;
class SkTextBlob;
class SkRuntimeEffect;
class SkRuntimeEffectBuilder;
class SkVertices;
class SkFontMgr;
class SkSVGDOM;
class SkPaint;
class SkFont;
class SkMatrix;
class SkPathBuilder;
struct SkRect;
struct SkPoint;
class SkRRect;
class SkFontStyle;
struct SkImageInfo;
struct SkRSXform;

namespace skia {
namespace textlayout {
class TextStyle;
struct ParagraphStyle;
class TypefaceFontProvider;
} // namespace textlayout
} // namespace skia

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImage;
class JsiSkShader;
class JsiSkTypeface;
class JsiSkColorFilter;
class JsiSkImageFilter;
class JsiSkMaskFilter;
class JsiSkPathEffect;
class JsiSkData;
class JsiSkPicture;
class JsiSkTextBlob;
class JsiSkRuntimeEffect;
class JsiSkRuntimeShaderBuilder;
class JsiSkVertices;
class JsiSkFontMgr;
class JsiSkSVG;
class JsiSkPaint;
class JsiSkFont;
class JsiSkMatrix;
class JsiSkPath;
class JsiSkRect;
class JsiSkPoint;
class JsiSkRRect;
class JsiSkFontStyle;
class JsiSkImageInfo;
class JsiSkRSXform;
class JsiSkTextStyle;
class JsiSkParagraphStyle;
class JsiSkTypefaceFontProvider;

/**
 * Maps a wrapped Skia type to the JsiSk* class whose `fromValue` knows how to
 * read it from a JS value (including the plain-object fallbacks, e.g. SkRect
 * from {x, y, width, height}). The JSIConverter specializations below are
 * enabled for exactly the types listed here.
 */
template <typename T> struct JsiSkWrapperFor;

template <> struct JsiSkWrapperFor<SkImage> {
  using type = JsiSkImage;
};
template <> struct JsiSkWrapperFor<SkShader> {
  using type = JsiSkShader;
};
template <> struct JsiSkWrapperFor<SkTypeface> {
  using type = JsiSkTypeface;
};
template <> struct JsiSkWrapperFor<SkColorFilter> {
  using type = JsiSkColorFilter;
};
template <> struct JsiSkWrapperFor<SkImageFilter> {
  using type = JsiSkImageFilter;
};
template <> struct JsiSkWrapperFor<SkMaskFilter> {
  using type = JsiSkMaskFilter;
};
template <> struct JsiSkWrapperFor<SkPathEffect> {
  using type = JsiSkPathEffect;
};
template <> struct JsiSkWrapperFor<SkData> {
  using type = JsiSkData;
};
template <> struct JsiSkWrapperFor<SkPicture> {
  using type = JsiSkPicture;
};
template <> struct JsiSkWrapperFor<SkTextBlob> {
  using type = JsiSkTextBlob;
};
template <> struct JsiSkWrapperFor<SkRuntimeEffect> {
  using type = JsiSkRuntimeEffect;
};
template <> struct JsiSkWrapperFor<SkRuntimeEffectBuilder> {
  using type = JsiSkRuntimeShaderBuilder;
};
template <> struct JsiSkWrapperFor<SkVertices> {
  using type = JsiSkVertices;
};
template <> struct JsiSkWrapperFor<SkFontMgr> {
  using type = JsiSkFontMgr;
};
template <> struct JsiSkWrapperFor<SkSVGDOM> {
  using type = JsiSkSVG;
};
template <> struct JsiSkWrapperFor<SkPaint> {
  using type = JsiSkPaint;
};
template <> struct JsiSkWrapperFor<SkFont> {
  using type = JsiSkFont;
};
template <> struct JsiSkWrapperFor<SkMatrix> {
  using type = JsiSkMatrix;
};
// Note: JsiSkPath wraps an SkPathBuilder (not an SkPath).
template <> struct JsiSkWrapperFor<SkPathBuilder> {
  using type = JsiSkPath;
};
template <> struct JsiSkWrapperFor<SkRect> {
  using type = JsiSkRect;
};
template <> struct JsiSkWrapperFor<SkPoint> {
  using type = JsiSkPoint;
};
template <> struct JsiSkWrapperFor<SkRRect> {
  using type = JsiSkRRect;
};
template <> struct JsiSkWrapperFor<SkFontStyle> {
  using type = JsiSkFontStyle;
};
template <> struct JsiSkWrapperFor<SkImageInfo> {
  using type = JsiSkImageInfo;
};
template <> struct JsiSkWrapperFor<SkRSXform> {
  using type = JsiSkRSXform;
};
template <> struct JsiSkWrapperFor<skia::textlayout::TextStyle> {
  using type = JsiSkTextStyle;
};
template <> struct JsiSkWrapperFor<skia::textlayout::ParagraphStyle> {
  using type = JsiSkParagraphStyle;
};
template <> struct JsiSkWrapperFor<skia::textlayout::TypefaceFontProvider> {
  using type = JsiSkTypefaceFontProvider;
};

template <typename T>
using JsiSkWrapperFor_t = typename JsiSkWrapperFor<T>::type;

class JsiSkColor;

/**
 * SkColor is a typedef of uint32_t, which already has a JSIConverter, so
 * color arguments use this strong typedef to route through
 * JsiSkColor::fromValue (array | Float32Array) instead.
 */
struct JsiColor {
  SkColor color;
  operator SkColor() const { return color; }
};

template <> struct JsiSkWrapperFor<JsiColor> {
  using type = JsiSkColor;
};

/**
 * An argument the JS API treats as absent when it is omitted, undefined, or
 * null. This matches the pervasive `hasOptionalArgument` pattern of the raw
 * bindings. Use std::optional instead when null must be distinguished from
 * undefined (it treats only omitted/undefined as absent).
 */
template <typename T> struct JsiOptional : std::optional<T> {
  using std::optional<T>::optional;
};

} // namespace RNSkia

namespace RNJsi {

/**
 * sk_sp<T> arguments (SkImage, SkShader, ...). Delegates to the wrapper
 * class's fromValue, so wrapper objects and any legacy fallback shapes keep
 * working. Conversion is strict: null/undefined throw, matching the previous
 * raw JSI_HOST_FUNCTION bodies. Arguments that explicitly accept null use
 * std::variant<std::nullptr_t, sk_sp<T>> (see below); arguments that may be
 * omitted use std::optional.
 *
 * There is intentionally no toJSI: building a wrapper requires the platform
 * context, so methods return std::shared_ptr<JsiSkFoo> built with
 * getContext() instead (handled by the NativeObject converter).
 */
template <typename T>
struct JSIConverter<sk_sp<T>,
                    std::void_t<typename RNSkia::JsiSkWrapperFor<T>::type>> {
  static sk_sp<T> fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                          bool outOfBound) {
    return RNSkia::JsiSkWrapperFor_t<T>::fromValue(runtime, arg);
  }
};

/**
 * std::shared_ptr<T> arguments for the wrapped non-refcounted Skia types
 * (SkPaint, SkFont, SkMatrix, SkRect, ...). Same rules as sk_sp above.
 */
template <typename T>
struct JSIConverter<std::shared_ptr<T>,
                    std::void_t<typename RNSkia::JsiSkWrapperFor<T>::type>> {
  static std::shared_ptr<T> fromJSI(jsi::Runtime &runtime,
                                    const jsi::Value &arg, bool outOfBound) {
    return RNSkia::JsiSkWrapperFor_t<T>::fromValue(runtime, arg);
  }
};

/**
 * Nullable sk_sp<T> arguments: JS null maps to the std::nullptr_t
 * alternative, anything else goes through the strict converter above.
 */
template <typename T>
struct JSIConverter<std::variant<std::nullptr_t, sk_sp<T>>,
                    std::void_t<typename RNSkia::JsiSkWrapperFor<T>::type>> {
  using Target = std::variant<std::nullptr_t, sk_sp<T>>;

  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isNull()) {
      return Target(nullptr);
    }
    return Target(JSIConverter<sk_sp<T>>::fromJSI(runtime, arg, outOfBound));
  }
};

/**
 * SkRect / SkPoint / SkMatrix / SkRSXform by value — the wrapper's fromValue
 * provides the plain-object/array fallbacks. fromJSI only; returning these
 * types is done through std::shared_ptr<JsiSkRect> etc. (see above).
 *
 * All bodies below reach the wrapper through JsiSkWrapperFor_t<T> so the
 * name stays dependent on T and is only looked up at instantiation, when the
 * wrapper class is complete (two-phase lookup would otherwise bind — and
 * reject — the incomplete forward declaration at definition time).
 */
template <typename T>
struct JSIConverter<T, std::enable_if_t<std::is_same_v<T, SkRect> ||
                                        std::is_same_v<T, SkMatrix> ||
                                        std::is_same_v<T, SkRSXform>>> {
  static T fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                   bool outOfBound) {
    return *RNSkia::JsiSkWrapperFor_t<T>::fromValue(runtime, arg);
  }
};

// SkPoint additionally converts back to a plain {x, y} object — this is what
// the raw bindings returned for point results (e.g. getLastPt), NOT a Point
// wrapper. Methods that should return a wrapper use
// std::shared_ptr<JsiSkPoint> instead.
template <typename T>
struct JSIConverter<T, std::enable_if_t<std::is_same_v<T, SkPoint>>> {
  static T fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                   bool outOfBound) {
    return *RNSkia::JsiSkWrapperFor_t<T>::fromValue(runtime, arg);
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, const T &point) {
    jsi::Object result(runtime);
    result.setProperty(runtime, "x", static_cast<double>(point.x()));
    result.setProperty(runtime, "y", static_cast<double>(point.y()));
    return result;
  }
};

// Paragraph style values — their fromValue helpers return by value and read
// plain JS style objects.
template <typename T>
struct JSIConverter<
    T, std::enable_if_t<std::is_same_v<T, skia::textlayout::TextStyle> ||
                        std::is_same_v<T, skia::textlayout::ParagraphStyle>>> {
  static T fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                   bool outOfBound) {
    return RNSkia::JsiSkWrapperFor_t<T>::fromValue(runtime, arg);
  }
};

// Colors via the JsiColor strong typedef (see above).
template <typename T>
struct JSIConverter<T, std::enable_if_t<std::is_same_v<T, RNSkia::JsiColor>>> {
  static T fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                   bool outOfBound) {
    return {RNSkia::JsiSkWrapperFor_t<T>::fromValue(runtime, arg)};
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, const T &arg) {
    return RNSkia::JsiSkWrapperFor_t<T>::toValue(runtime, arg.color);
  }
};

// JsiOptional<T>: omitted | undefined | null -> absent
template <typename T> struct JSIConverter<RNSkia::JsiOptional<T>> {
  static RNSkia::JsiOptional<T> fromJSI(jsi::Runtime &runtime,
                                        const jsi::Value &arg,
                                        bool outOfBound) {
    if (outOfBound || arg.isUndefined() || arg.isNull()) {
      return {};
    }
    return {JSIConverter<T>::fromJSI(runtime, arg, outOfBound)};
  }
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          const RNSkia::JsiOptional<T> &arg) {
    if (!arg.has_value()) {
      return jsi::Value::null();
    }
    return JSIConverter<T>::toJSI(runtime, arg.value());
  }
};

// SkPoint3 <- {x, y, z}
template <> struct JSIConverter<SkPoint3> {
  static SkPoint3 fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                          bool outOfBound) {
    auto object = arg.asObject(runtime);
    auto x = object.getProperty(runtime, "x").asNumber();
    auto y = object.getProperty(runtime, "y").asNumber();
    auto z = object.getProperty(runtime, "z").asNumber();
    return SkPoint3::Make(x, y, z);
  }
};

// std::string | null (nullable string results)
template <> struct JSIConverter<std::variant<std::nullptr_t, std::string>> {
  using Target = std::variant<std::nullptr_t, std::string>;
  static Target fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                        bool outOfBound) {
    if (arg.isNull()) {
      return Target(nullptr);
    }
    return Target(JSIConverter<std::string>::fromJSI(runtime, arg, outOfBound));
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, const Target &arg) {
    if (std::holds_alternative<std::nullptr_t>(arg)) {
      return jsi::Value::null();
    }
    return JSIConverter<std::string>::toJSI(runtime, std::get<std::string>(arg));
  }
};

// SkSize -> {width, height} (fractional)
template <> struct JSIConverter<SkSize> {
  static jsi::Value toJSI(jsi::Runtime &runtime, const SkSize &size) {
    jsi::Object result(runtime);
    result.setProperty(runtime, "width", static_cast<double>(size.width()));
    result.setProperty(runtime, "height", static_cast<double>(size.height()));
    return result;
  }
};

// SkISize <> {width, height}
template <> struct JSIConverter<SkISize> {
  static SkISize fromJSI(jsi::Runtime &runtime, const jsi::Value &arg,
                         bool outOfBound) {
    auto object = arg.asObject(runtime);
    auto width = object.getProperty(runtime, "width").asNumber();
    auto height = object.getProperty(runtime, "height").asNumber();
    return SkISize::Make(static_cast<int32_t>(width),
                         static_cast<int32_t>(height));
  }
  static jsi::Value toJSI(jsi::Runtime &runtime, const SkISize &size) {
    jsi::Object result(runtime);
    result.setProperty(runtime, "width", static_cast<double>(size.width()));
    result.setProperty(runtime, "height", static_cast<double>(size.height()));
    return result;
  }
};

} // namespace RNJsi
