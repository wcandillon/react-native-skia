#pragma once

#include <functional>
#include <map>
#include <optional>
#include <variant>
#include <vector>

#include <include/core/SkBlurTypes.h>
#include <include/core/SkPaint.h>
#include <include/core/SkPathEffect.h>
#include <include/core/SkPoint.h>
#include <include/effects/SkRuntimeEffect.h>
#include <modules/skparagraph/include/Paragraph.h>
#include <modules/skparagraph/include/ParagraphBuilder.h>
#include <modules/skparagraph/include/ParagraphStyle.h>

#include "../CustomBlendModes.h"
#include "api/third_party/CSSColorParser.h"

#include "DataTypes.h"

#include <jsi/jsi.h>

namespace RNSkia {

struct Radius {
  float rX;
  float rY;
};

using ConversionFunction =
    std::function<void(jsi::Runtime &runtime, const jsi::Object &object)>;
using Variables = std::map<std::string, std::vector<ConversionFunction>>;

using Patch = std::array<SkPoint, 12>;

struct GlyphData {
  std::vector<SkGlyphID> glyphIds;
  std::vector<SkPoint> positions;
};

bool isSharedValue(jsi::Runtime &runtime, const jsi::Value &value) {
  return value.isObject() &&
         value.asObject(runtime).hasProperty(runtime,
                                             "_isReanimatedSharedValue") &&
         value.asObject(runtime)
             .getProperty(runtime, "_isReanimatedSharedValue")
             .isBool() &&
         value.asObject(runtime)
                 .getProperty(runtime, "_isReanimatedSharedValue")
                 .asBool() == true;
}

// Helper type traits
template <typename T> struct is_optional : std::false_type {};

template <typename T> struct is_optional<std::optional<T>> : std::true_type {};

template <typename T> struct unwrap_optional {
  using type = T;
};

template <typename T> struct unwrap_optional<std::optional<T>> {
  using type = T;
};

// Property value getter declarations
template <typename T>
T getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value);

template <typename T, typename Target>
bool convertSelectorProperty(jsi::Runtime &runtime, const jsi::Value &prop,
                             Target &target, Variables &variables) {
  if (!prop.isObject()) {
    return false;
  }
  auto wrapper = prop.asObject(runtime);
  if (!wrapper.hasProperty(runtime, "__sv") ||
      !wrapper.hasProperty(runtime, "__key")) {
    return false;
  }
  auto svVal = wrapper.getProperty(runtime, "__sv");
  auto keyVal = wrapper.getProperty(runtime, "__key");
  if (!isSharedValue(runtime, svVal) || !keyVal.isString()) {
    return false;
  }
  auto sharedValue = svVal.asObject(runtime);
  auto key = keyVal.asString(runtime).utf8(runtime);
  auto name =
      sharedValue.getProperty(runtime, "name").asString(runtime).utf8(runtime);

  auto conv = [target = &target, key](jsi::Runtime &runtime,
                                      const jsi::Object &val) {
    auto value = val.getProperty(runtime, "value");
    if (!value.isObject()) {
      return;
    }
    auto values = value.asObject(runtime);
    if (!values.hasProperty(runtime, key.c_str())) {
      return;
    }

    auto selected = values.getProperty(runtime, key.c_str());
    if (selected.isUndefined() || selected.isNull() ||
        (selected.isObject() && selected.asObject(runtime).isFunction(runtime))) {
      return;
    }
    *target = getPropertyValue<T>(runtime, selected);
  };

  variables[name].push_back(conv);
  conv(runtime, sharedValue);
  return true;
}

template <typename T, typename Target>
void convertPropertyImpl(jsi::Runtime &runtime, const jsi::Object &object,
                         const std::string &propertyName, Target &target,
                         Variables &variables) {
  if (!object.hasProperty(runtime, propertyName.c_str())) {
    return;
  }

  auto prop = object.getProperty(runtime, propertyName.c_str());

  if (convertSelectorProperty<T>(runtime, prop, target, variables)) {
    return;
  }

  if (isSharedValue(runtime, prop)) {
    auto sharedValue = prop.asObject(runtime);
    auto name =
        sharedValue.getProperty(runtime, "name").asString(runtime).utf8(runtime);
    auto conv = [target = &target](jsi::Runtime &runtime,
                                   const jsi::Object &val) {
      auto value = val.getProperty(runtime, "value");
      *target = getPropertyValue<T>(runtime, value);
    };
    variables[name].push_back(conv);
    conv(runtime, sharedValue);
    return;
  }

  target = getPropertyValue<T>(runtime, prop);
}

// Main convertProperty template
template <typename T>
void convertProperty(jsi::Runtime &runtime, const jsi::Object &object,
                     const std::string &propertyName, T &target,
                     Variables &variables) {
  convertPropertyImpl<T>(runtime, object, propertyName, target, variables);
}

// Base property value getter implementations
template <>
float getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isNumber()) {
    return static_cast<float>(value.asNumber());
  }
  throw std::runtime_error("Invalid float prop value received");
}

template <>
int getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isNumber()) {
    return static_cast<int>(value.asNumber());
  }
  throw std::runtime_error("Invalid int prop value received");
}

template <>
std::string getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isString()) {
    return value.asString(runtime).utf8(runtime);
  }
  throw std::runtime_error("Invalid string prop value received");
}

template <>
SkPoint getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto x = value.asObject(runtime).getProperty(runtime, "x").asNumber();
    auto y = value.asObject(runtime).getProperty(runtime, "y").asNumber();
    return SkPoint::Make(x, y);
  }
  throw std::runtime_error("Invalid prop value for SkPoint received");
}

template <>
SkColor getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isNumber()) {
    return static_cast<SkColor>(value.asNumber());
  } else if (value.isString()) {
    auto text = value.asString(runtime).utf8(runtime);
    auto color = CSSColorParser::parse(text);
    if (color.a == -1.0f) {
      return SK_ColorBLACK;
    }
    return SkColorSetARGB(color.a * 255, color.r, color.g, color.b);
  } else if (value.isObject()) {
    const auto &object = value.asObject(runtime);
    if (object.isArray(runtime)) {
      auto array = object.asArray(runtime);
      auto r = array.getValueAtIndex(runtime, 0).asNumber();
      auto g = array.getValueAtIndex(runtime, 1).asNumber();
      auto b = array.getValueAtIndex(runtime, 2).asNumber();
      auto a = array.getValueAtIndex(runtime, 3).asNumber();
      return SkColorSetARGB(a * 255, r * 255, g * 255, b * 255);
    }

    // Check for properties "0", "1", "2", "3" (even if not an array)
    auto prop0 = jsi::PropNameID::forAscii(runtime, "0");
    auto prop1 = jsi::PropNameID::forAscii(runtime, "1");
    auto prop2 = jsi::PropNameID::forAscii(runtime, "2");
    auto prop3 = jsi::PropNameID::forAscii(runtime, "3");
    if (object.hasProperty(runtime, prop0) &&
        object.hasProperty(runtime, prop1) &&
        object.hasProperty(runtime, prop2) &&
        object.hasProperty(runtime, prop3)) {
      auto r = object.getProperty(runtime, prop0).asNumber();
      auto g = object.getProperty(runtime, prop1).asNumber();
      auto b = object.getProperty(runtime, prop2).asNumber();
      auto a = object.getProperty(runtime, prop3).asNumber();
      return SkColorSetARGB(a * 255, r * 255, g * 255, b * 255);
    }
    jsi::ArrayBuffer buffer =
        object
            .getProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            .asObject(runtime)
            .getArrayBuffer(runtime);
    auto bfrPtr = reinterpret_cast<float *>(buffer.data(runtime));
    if (bfrPtr[0] > 1 || bfrPtr[1] > 1 || bfrPtr[2] > 1 || bfrPtr[3] > 1) {
      return SK_ColorBLACK;
    }
    return SkColorSetARGB(bfrPtr[3] * 255, bfrPtr[0] * 255, bfrPtr[1] * 255,
                          bfrPtr[2] * 255);
  }
  throw std::runtime_error("Invalid prop value for SkColor received");
}

template <>
std::vector<SkColor> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  std::vector<SkColor> result;
  if (value.isObject() && value.asObject(runtime).isArray(runtime)) {
    auto array = value.asObject(runtime).asArray(runtime);
    size_t size = array.size(runtime);
    result.reserve(size);

    for (size_t i = 0; i < size; i++) {
      result.push_back(getPropertyValue<SkColor>(
          runtime, array.getValueAtIndex(runtime, i)));
    }
  }
  return result;
}

template <>
SkTileMode getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "clamp") {
      return SkTileMode::kClamp;
    } else if (value == "repeat") {
      return SkTileMode::kRepeat;
    } else if (value == "mirror") {
      return SkTileMode::kMirror;
    } else if (value == "decal") {
      return SkTileMode::kDecal;
    }
  }
  throw std::runtime_error("Invalid value for SkTileMode received");
}

template <>
SkColorChannel getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "r") {
      return SkColorChannel::kR;
    } else if (value == "b") {
      return SkColorChannel::kB;
    } else if (value == "g") {
      return SkColorChannel::kG;
    } else if (value == "a") {
      return SkColorChannel::kA;
    }
  }
  throw std::runtime_error("Invalid value for SkTileMode received");
}

template <>
SkVertices::VertexMode getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "triangles") {
      return SkVertices::VertexMode::kTriangles_VertexMode;
    } else if (value == "triangleStrip") {
      return SkVertices::VertexMode::kTriangleStrip_VertexMode;
    } else if (value == "triangleFan") {
      return SkVertices::VertexMode::kTriangleFan_VertexMode;
    }
  }
  throw std::runtime_error("Invalid value for VertexMode received");
}

template <>
SkM44 getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto object = value.asObject(runtime);
    // Get array of property names
    auto array = object.asArray(runtime);
    auto size = array.size(runtime);
    SkM44 m4;
    for (int i = 0; i < size; i++) {
      auto value = array.getValueAtIndex(runtime, i).asObject(runtime);
      auto propNames = value.getPropertyNames(runtime);
      if (propNames.size(runtime) == 0) {
        throw std::runtime_error(
            "Empty value in transform. Expected translateX, translateY, "
            "scale, "
            "scaleX, scaleY, skewX, skewY, rotate or rotateZ.");
      }
      auto key =
          propNames.getValueAtIndex(runtime, 0).asString(runtime).utf8(runtime);
      if (key == "translateX") {
        auto x = value.getProperty(runtime, key.c_str()).asNumber();
        m4.preTranslate(x, 0, 0);
      } else if (key == "translateY") {
        auto y = value.getProperty(runtime, key.c_str()).asNumber();
        m4.preTranslate(0, y, 0);
      } else if (key == "translateZ") {
        auto z = value.getProperty(runtime, key.c_str()).asNumber();
        m4.preTranslate(0, 0, z);
      } else if (key == "translate") {
        auto arr = value.getProperty(runtime, key.c_str())
                       .asObject(runtime)
                       .asArray(runtime);
        double x = 0, y = 0, z = 0;
        for (int i = 0; i < arr.size(runtime); i++) {
          if (i == 0) {
            x = arr.getValueAtIndex(runtime, i).asNumber();
          } else if (i == 1) {
            y = arr.getValueAtIndex(runtime, i).asNumber();
          } else if (i == 2) {
            z = arr.getValueAtIndex(runtime, i).asNumber();
          }
        }
        m4.preTranslate(x, y, z);
      } else if (key == "scale") {
        auto s = value.getProperty(runtime, key.c_str()).asNumber();
        m4.preScale(s, s);
      } else if (key == "scaleX") {
        auto s = value.getProperty(runtime, key.c_str()).asNumber();
        m4.preScale(s, 1);
      } else if (key == "scaleY") {
        auto s = value.getProperty(runtime, key.c_str()).asNumber();
        m4.preScale(1, s);
      } else if (key == "skewX") {
        auto angle = value.getProperty(runtime, key.c_str()).asNumber();
        // The SkM44 constructor takes its arguments in row-major reading
        // order, so the shear factor of a horizontal skew belongs in row 0,
        // where it scales y into x.
        SkM44 skewX(1, std::tan(angle), 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0,
                    1);
        m4.preConcat(skewX);

      } else if (key == "skewY") {
        auto angle = value.getProperty(runtime, key.c_str()).asNumber();
        SkM44 skewY(1, 0, 0, 0, std::tan(angle), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0,
                    1);
        m4.preConcat(skewY);
      } else if (key == "rotate" || key == "rotateZ") {
        auto angle = value.getProperty(runtime, key.c_str()).asNumber();
        SkM44 rotate;
        rotate.setRotateUnit({0, 0, 1}, angle);
        m4.preConcat(rotate);
      } else if (key == "rotateY") {
        auto angle = value.getProperty(runtime, key.c_str()).asNumber();
        SkM44 rotate;
        rotate.setRotateUnit({0, 1, 0}, angle);
        m4.preConcat(rotate);
      } else if (key == "rotateX") {
        auto angle = value.getProperty(runtime, key.c_str()).asNumber();
        SkM44 rotate;
        rotate.setRotateUnit({1, 0, 0}, angle);
        m4.preConcat(rotate);
      } else if (key == "perspective") {
        auto p = value.getProperty(runtime, key.c_str()).asNumber();
        SkM44 perspective(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / p, 1);
        m4.preConcat(perspective);
      } else if (key == "matrix") {
        auto arr = value.getProperty(runtime, key.c_str())
                       .asObject(runtime)
                       .asArray(runtime);
        SkM44 m44;
        for (size_t i = 0; i < arr.size(runtime); ++i) {
          auto obj = arr.getValueAtIndex(runtime, i);
          m44.setRC(i / 4, i % 4, obj.asNumber());
        }
        m4.preConcat(m44);
      } else {
        throw std::runtime_error(
            "Unknown key in transform. Expected translateX, translateY, "
            "scale, "
            "scaleX, scaleY, skewX, skewY, rotate or rotateZ - got " +
            std::string(key) + ".");
      }
    }
    return m4;
  }
  throw std::runtime_error("Invalid prop value for SkM44 received");
}

template <>
SkSamplingOptions getPropertyValue(jsi::Runtime &runtime,
                                   const jsi::Value &value) {
  if (value.isObject()) {
    SkSamplingOptions samplingOptions(SkFilterMode::kLinear);
    auto object = value.asObject(runtime);
    if (object.hasProperty(runtime, "B") && object.hasProperty(runtime, "C")) {
      auto B = static_cast<float>(object.getProperty(runtime, "B").asNumber());
      auto C = static_cast<float>(object.getProperty(runtime, "C").asNumber());
      samplingOptions = SkSamplingOptions({B, C});
    } else if (object.hasProperty(runtime, "filter")) {
      auto filter = static_cast<SkFilterMode>(
          object.getProperty(runtime, "filter").asNumber());
      if (object.hasProperty(runtime, "mipmap")) {
        auto mipmap = static_cast<SkMipmapMode>(
            object.getProperty(runtime, "mipmap").asNumber());
        samplingOptions = SkSamplingOptions(filter, mipmap);
      } else {
        samplingOptions = SkSamplingOptions(filter);
      }
    }
    return samplingOptions;
  }

  throw std::runtime_error("Invalid prop value for SkSamplingOptions received");
}

template <>
SkFont getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto font = getJsiObject<JsiSkFont>(runtime, value)->getObject();
    return SkFont(*font);
  }
  throw std::runtime_error("Invalid prop value for SkFont received");
}

template <>
GlyphData getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  GlyphData result;
  if (value.isObject() && value.asObject(runtime).isArray(runtime)) {
    auto array = value.asObject(runtime).asArray(runtime);
    size_t size = array.size(runtime);
    result.glyphIds.reserve(size);
    result.positions.reserve(size);

    for (size_t i = 0; i < size; i++) {
      auto glyph = array.getValueAtIndex(runtime, i).asObject(runtime);
      // Get the glyph id
      result.glyphIds.push_back(
          static_cast<SkGlyphID>(glyph.getProperty(runtime, "id").asNumber()));
      // Get the position
      result.positions.push_back(
          processPoint(runtime, glyph.getProperty(runtime, "pos")));
    }
    return result;
  }
  throw std::runtime_error("Invalid prop value for GlyphData received");
}

template <>
SkRSXform getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto form = getJsiObject<JsiSkRSXform>(runtime, value)->getObject();
    return SkRSXform::Make(form->fSCos, form->fSSin, form->fTx, form->fTy);
  }
  throw std::runtime_error("Invalid prop value for SkRSXform received");
}

template <>
sk_sp<SkSVGDOM> getPropertyValue(jsi::Runtime &runtime,
                                 const jsi::Value &value) {
  auto ptr = tryGetJsiObject<JsiSkSVG>(runtime, value);
  if (ptr != nullptr) {
    return ptr->getObject();
  }
  if (value.isNull()) {
    return nullptr;
  }
  throw std::runtime_error(
      "Expected SkSvgDom object or null for the svg property.");
}

template <>
sk_sp<skottie::Animation> getPropertyValue(jsi::Runtime &runtime,
                                           const jsi::Value &value) {
  auto ptr = tryGetJsiObject<JsiSkSkottie>(runtime, value);
  if (ptr != nullptr) {
    return ptr->getObject()->_animation;
  }
  if (value.isNull()) {
    return nullptr;
  }
  throw std::runtime_error(
      "Expected JsiSkSkottie object or null for the svg property.");
}

template <>
sk_sp<SkImageFilter> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  auto ptr = tryGetJsiObject<JsiSkImageFilter>(runtime, value);
  if (ptr != nullptr) {
    return ptr->getObject();
  }
  if (value.isNull()) {
    return nullptr;
  }
  throw std::runtime_error(
      "Expected JsiSkImageFilter object or null for the imageFilter property.");
}

template <>
sk_sp<SkPicture> getPropertyValue(jsi::Runtime &runtime,
                                  const jsi::Value &value) {
  if (value.isObject()) {
    auto picture = getJsiObject<JsiSkPicture>(runtime, value)->getObject();
    return picture;
  }
  throw std::runtime_error("Invalid prop value for SkTextBlob received");
}

template <>
SkPaint getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto paint = getJsiObject<JsiSkPaint>(runtime, value)->getObject();
    return SkPaint(*paint);
  }
  throw std::runtime_error("Invalid prop value for SkPaint received");
}

template <>
std::shared_ptr<JsiSkParagraph> getPropertyValue(jsi::Runtime &runtime,
                                                 const jsi::Value &value) {
  // Return a shared_ptr instead of raw pointer
  return tryGetJsiObject<JsiSkParagraph>(runtime, value);
}

template <>
sk_sp<SkTextBlob> getPropertyValue(jsi::Runtime &runtime,
                                   const jsi::Value &value) {
  if (value.isObject()) {
    auto blob = getJsiObject<JsiSkTextBlob>(runtime, value)->getObject();
    return blob;
  }
  throw std::runtime_error("Invalid prop value for SkTextBlob received");
}

template <>
sk_sp<SkRuntimeEffect> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  if (value.isObject()) {
    auto effect = getJsiObject<JsiSkRuntimeEffect>(runtime, value)->getObject();
    return effect;
  }
  throw std::runtime_error("Invalid prop value for SkRuntimeEffect received");
}

template <>
sk_sp<SkImage> getPropertyValue(jsi::Runtime &runtime,
                                const jsi::Value &value) {

  if (value.isObject()) {
    auto effect = getJsiObject<JsiSkImage>(runtime, value)->getObject();
    return effect;
  } else if (value.isNull()) {
    return nullptr;
  }
  throw std::runtime_error("Invalid prop value for SkImage received");
}

template <>
SkMatrix getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto ptr = tryGetJsiObject<JsiSkMatrix>(runtime, value);
    if (ptr != nullptr) {
      auto matrix = ptr->getObject().get();
      return SkMatrix(*matrix);
    } else {
      return JsiSkMatrix::getMatrix(runtime, value);
    }
  }
  throw std::runtime_error("Invalid prop value for SkMatrix received");
}

template <>
Radius getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto object = value.asObject(runtime);
    auto rX = static_cast<float>(object.getProperty(runtime, "x").asNumber());
    auto rY = static_cast<float>(object.getProperty(runtime, "y").asNumber());
    return {rX, rY};
  } else if (value.isNumber()) {
    auto r = static_cast<float>(value.asNumber());
    return {r, r};
  }
  throw std::runtime_error("Invalid prop value for Radius received");
}

template <>
SkCanvas::PointMode getPropertyValue(jsi::Runtime &runtime,
                                     const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "points") {
      return SkCanvas::PointMode::kPoints_PointMode;
    } else if (value == "lines") {
      return SkCanvas::PointMode::kLines_PointMode;
    } else if (value == "polygon") {
      return SkCanvas::PointMode::kPolygon_PointMode;
    }
  }
  throw std::runtime_error(
      "Invalid prop value for SkCanvas::PointMode received");
}

template <>
SkPaint::Style getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "fill") {
      return SkPaint::kFill_Style;
    } else if (value == "stroke") {
      return SkPaint::kStroke_Style;
    }
  }
  throw std::runtime_error("Invalid prop value for SkPaint::Style received");
}

template <>
SkPaint::Join getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "miter") {
      return SkPaint::kMiter_Join;
    } else if (value == "round") {
      return SkPaint::kRound_Join;
    } else if (value == "bevel") {
      return SkPaint::kBevel_Join;
    }
  }
  throw std::runtime_error("Invalid prop value for SkPaint::Join received");
}

template <>
SkPaint::Cap getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "butt") {
      return SkPaint::kButt_Cap;
    } else if (value == "round") {
      return SkPaint::kRound_Cap;
    } else if (value == "square") {
      return SkPaint::kSquare_Cap;
    }
  }
  throw std::runtime_error("Invalid prop value for SkPaint::Cap received");
}

template <>
SkPath1DPathEffect::Style getPropertyValue(jsi::Runtime &runtime,
                                           const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "translate") {
      return SkPath1DPathEffect::Style::kTranslate_Style;
    } else if (value == "rotate") {
      return SkPath1DPathEffect::Style::kRotate_Style;
    } else if (value == "morph") {
      return SkPath1DPathEffect::Style::kMorph_Style;
    }
  }
  throw std::runtime_error("Invalid prop value for Path1DEffectStyle received");
}

// Wrapper type for blend mode to avoid conflict with int template
// specialization
struct BlendModeValue {
  int value;
  BlendModeValue(int v = 0) : value(v) {}
  operator int() const { return value; }
};

template <>
BlendModeValue getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "clear") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kClear));
    } else if (value == "src") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSrc));
    } else if (value == "dst") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDst));
    } else if (value == "srcOver") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSrcOver));
    } else if (value == "dstOver") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDstOver));
    } else if (value == "srcIn") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSrcIn));
    } else if (value == "dstIn") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDstIn));
    } else if (value == "srcOut") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSrcOut));
    } else if (value == "dstOut") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDstOut));
    } else if (value == "srcATop") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSrcATop));
    } else if (value == "dstATop") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDstATop));
    } else if (value == "xor") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kXor));
    } else if (value == "plus") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kPlus));
    } else if (value == "modulate") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kModulate));
    } else if (value == "screen") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kScreen));
    } else if (value == "overlay") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kOverlay));
    } else if (value == "darken") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDarken));
    } else if (value == "lighten") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kLighten));
    } else if (value == "colorDodge") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kColorDodge));
    } else if (value == "colorBurn") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kColorBurn));
    } else if (value == "hardLight") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kHardLight));
    } else if (value == "softLight") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSoftLight));
    } else if (value == "difference") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kDifference));
    } else if (value == "exclusion") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kExclusion));
    } else if (value == "multiply") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kMultiply));
    } else if (value == "hue") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kHue));
    } else if (value == "saturation") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kSaturation));
    } else if (value == "color") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kColor));
    } else if (value == "luminosity") {
      return BlendModeValue(static_cast<int>(SkBlendMode::kLuminosity));
    } else if (value == "plusDarker") {
      return BlendModeValue(kBlendModePlusDarker);
    } else if (value == "plusLighter") {
      return BlendModeValue(kBlendModePlusLighter);
    }
  }
  throw std::runtime_error("Invalid prop value for BlendMode received");
}

// Keep SkBlendMode specialization for other usages (Shaders, ImageFilters,
// ColorFilters, Drawings)
template <>
SkBlendMode getPropertyValue(jsi::Runtime &runtime, const jsi::Value &val) {
  if (val.isString()) {
    auto value = val.asString(runtime).utf8(runtime);
    if (value == "clear") {
      return SkBlendMode::kClear;
    } else if (value == "src") {
      return SkBlendMode::kSrc;
    } else if (value == "dst") {
      return SkBlendMode::kDst;
    } else if (value == "srcOver") {
      return SkBlendMode::kSrcOver;
    } else if (value == "dstOver") {
      return SkBlendMode::kDstOver;
    } else if (value == "srcIn") {
      return SkBlendMode::kSrcIn;
    } else if (value == "dstIn") {
      return SkBlendMode::kDstIn;
    } else if (value == "srcOut") {
      return SkBlendMode::kSrcOut;
    } else if (value == "dstOut") {
      return SkBlendMode::kDstOut;
    } else if (value == "srcATop") {
      return SkBlendMode::kSrcATop;
    } else if (value == "dstATop") {
      return SkBlendMode::kDstATop;
    } else if (value == "xor") {
      return SkBlendMode::kXor;
    } else if (value == "plus") {
      return SkBlendMode::kPlus;
    } else if (value == "modulate") {
      return SkBlendMode::kModulate;
    } else if (value == "screen") {
      return SkBlendMode::kScreen;
    } else if (value == "overlay") {
      return SkBlendMode::kOverlay;
    } else if (value == "darken") {
      return SkBlendMode::kDarken;
    } else if (value == "lighten") {
      return SkBlendMode::kLighten;
    } else if (value == "colorDodge") {
      return SkBlendMode::kColorDodge;
    } else if (value == "colorBurn") {
      return SkBlendMode::kColorBurn;
    } else if (value == "hardLight") {
      return SkBlendMode::kHardLight;
    } else if (value == "softLight") {
      return SkBlendMode::kSoftLight;
    } else if (value == "difference") {
      return SkBlendMode::kDifference;
    } else if (value == "exclusion") {
      return SkBlendMode::kExclusion;
    } else if (value == "multiply") {
      return SkBlendMode::kMultiply;
    } else if (value == "hue") {
      return SkBlendMode::kHue;
    } else if (value == "saturation") {
      return SkBlendMode::kSaturation;
    } else if (value == "color") {
      return SkBlendMode::kColor;
    } else if (value == "luminosity") {
      return SkBlendMode::kLuminosity;
    }
  }
  throw std::runtime_error("Invalid prop value for SkBlendMode received");
}

using ClipDef = std::variant<SkPath, SkRRect, SkRect, std::string>;
using Layer = std::variant<SkPaint, bool>;

template <>
Uniforms getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    Uniforms result;
    auto obj = value.asObject(runtime);
    auto names = obj.getPropertyNames(runtime);

    for (size_t i = 0; i < names.length(runtime); i++) {
      std::string propName =
          names.getValueAtIndex(runtime, i).toString(runtime).utf8(runtime);
      jsi::Value propValue = obj.getProperty(runtime, propName.c_str());

      if (propValue.isNumber()) {
        result[propName] =
            std::vector<float>{static_cast<float>(propValue.asNumber())};
      } else if (propValue.isObject() &&
                 propValue.asObject(runtime).isArray(runtime)) {
        result[propName] =
            processArray(runtime, propValue.asObject(runtime).asArray(runtime));
      } else if (propValue.isObject() && isJSPoint(runtime, propValue)) {
        result[propName] = {static_cast<float>(propValue.asObject(runtime)
                                                   .getProperty(runtime, "x")
                                                   .asNumber()),
                            static_cast<float>(propValue.asObject(runtime)
                                                   .getProperty(runtime, "y")
                                                   .asNumber())};
      } else if (propValue.isObject() && isIndexable(runtime, propValue)) {
        auto indexableObj = propValue.asObject(runtime);
        std::vector<float> values;
        values.reserve(4);
        for (int i = 0; i < 4; i++) {
          if (indexableObj.hasProperty(runtime, std::to_string(i).c_str())) {
            values.push_back(static_cast<float>(
                indexableObj.getProperty(runtime, std::to_string(i).c_str())
                    .asNumber()));
          }
        }
        result[propName] = values;
      }
    }
    return result;
  }

  throw std::runtime_error("Invalid prop value for Uniforms received");
}

template <>
SkBlurStyle getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isString()) {
    auto valueStr = value.asString(runtime).utf8(runtime);
    if (valueStr == "normal") {
      return SkBlurStyle::kNormal_SkBlurStyle;
    } else if (valueStr == "solid") {
      return SkBlurStyle::kSolid_SkBlurStyle;
    } else if (valueStr == "outer") {
      return SkBlurStyle::kOuter_SkBlurStyle;
    } else if (valueStr == "inner") {
      return SkBlurStyle::kInner_SkBlurStyle;
    }
  }
  throw std::runtime_error("Invalid prop value for SkBlurStyle received");
}

template <>
SkPathFillType getPropertyValue(jsi::Runtime &runtime,
                                const jsi::Value &value) {
  if (value.isString()) {
    auto valueStr = value.asString(runtime).utf8(runtime);
    if (valueStr == "winding") {
      return SkPathFillType::kWinding;
    } else if (valueStr == "evenOdd") {
      return SkPathFillType::kEvenOdd;
    } else if (valueStr == "inverseWinding") {
      return SkPathFillType::kInverseWinding;
    } else if (valueStr == "inverseEvenOdd") {
      return SkPathFillType::kInverseEvenOdd;
    }
  }
  throw std::runtime_error("Invalid prop value for SkPathFillType received");
}

struct StrokeOpts {
  std::optional<float> width;
  std::optional<float> miter_limit;
  std::optional<float> precision;
  std::optional<SkPaint::Join> join;
  std::optional<SkPaint::Cap> cap;
};

template <>
StrokeOpts getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    StrokeOpts opts;
    auto object = value.asObject(runtime);
    if (object.hasProperty(runtime, "width")) {
      opts.width = object.getProperty(runtime, "width").asNumber();
    }
    if (object.hasProperty(runtime, "miterLimit")) {
      opts.miter_limit = object.getProperty(runtime, "miterLimit").asNumber();
    }
    if (object.hasProperty(runtime, "precision")) {
      opts.precision = object.getProperty(runtime, "precision").asNumber();
    }
    if (object.hasProperty(runtime, "join")) {
      opts.join = getPropertyValue<SkPaint::Join>(
          runtime, object.getProperty(runtime, "join"));
    }
    if (object.hasProperty(runtime, "cap")) {
      opts.cap = getPropertyValue<SkPaint::Cap>(
          runtime, object.getProperty(runtime, "cap"));
    }
    return opts;
  }
  throw std::runtime_error("Invalid prop value for StrokeOpts received");
}

template <>
SkRRect getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto rect = processRRect(runtime, value);
    if (!rect) {
      throw std::runtime_error("Invalid prop value for SkRRect received");
    }
    return SkRRect(*rect);
  }
  throw std::runtime_error("Invalid prop value for SkRRect received");
}

template <>
SkRect getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject()) {
    auto rect = processRect(runtime, value);
    if (!rect) {
      throw std::runtime_error("Invalid prop value for SkRect received");
    }
    return SkRect(*rect);
  }
  throw std::runtime_error("Invalid prop value for SkRect received");
}

template <>
std::variant<SkRect, SkRRect> getPropertyValue(jsi::Runtime &runtime,
                                               const jsi::Value &value) {
  if (value.isObject()) {
    auto rect = processRect(runtime, value);
    if (rect) {
      return SkRect(*rect);
    }
    auto rrect = processRRect(runtime, value);
    if (rrect) {
      return SkRRect(*rrect);
    }
  }
  throw std::runtime_error("Invalid prop value for SkRect received");
}

template <>
SkPath getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  auto path = processPath(runtime, value);
  if (!path) {
    throw std::runtime_error("Invalid prop value for SkPath received");
  }
  return SkPath(*path);
}

template <>
ClipDef getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  auto path = processPath(runtime, value);
  if (path) {
    ClipDef def = SkPath(*path);
    return def;
  }
  auto rect = processRect(runtime, value);
  if (rect) {
    ClipDef def = SkRect(*rect);
    return def;
  }
  auto rrect = processRRect(runtime, value);
  if (rrect) {
    ClipDef def = SkRRect(*rrect);
    return def;
  }
  throw std::runtime_error("Invalid prop value for ClipDef received");
}

template <>
Layer getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isBool()) {
    Layer layer = value.asBool();
    return layer;
  }
  auto ptr = tryGetJsiObject<JsiSkPaint>(runtime, value);
  if (ptr != nullptr) {
    auto paint = ptr->getObject();
    Layer layer = SkPaint(*paint);
    return layer;
  }
  throw std::runtime_error("Invalid prop value for Layer received");
}

template <>
Patch getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isObject() && value.asObject(runtime).isArray(runtime)) {
    auto array = value.asObject(runtime).asArray(runtime);
    if (array.size(runtime) != 4) {
      throw std::runtime_error("Patch must contain exactly 4 bezier handles");
    }

    // Patch requires points in the following order:
    // M tl
    // C c1 c2 br
    // C c1 c2 bl
    // C c1 c2 tl (the redundant point in the last command is removed)

    Patch result;

    result[0] = processPoint(runtime, array.getValueAtIndex(runtime, 0)
                                          .asObject(runtime)
                                          .getProperty(runtime, "pos"));
    result[1] = processPoint(runtime, array.getValueAtIndex(runtime, 0)
                                          .asObject(runtime)
                                          .getProperty(runtime, "c2"));
    result[2] = processPoint(runtime, array.getValueAtIndex(runtime, 1)
                                          .asObject(runtime)
                                          .getProperty(runtime, "c1"));
    result[3] = processPoint(runtime, array.getValueAtIndex(runtime, 1)
                                          .asObject(runtime)
                                          .getProperty(runtime, "pos"));
    result[4] = processPoint(runtime, array.getValueAtIndex(runtime, 1)
                                          .asObject(runtime)
                                          .getProperty(runtime, "c2"));
    result[5] = processPoint(runtime, array.getValueAtIndex(runtime, 2)
                                          .asObject(runtime)
                                          .getProperty(runtime, "c1"));
    result[6] = processPoint(runtime, array.getValueAtIndex(runtime, 2)
                                          .asObject(runtime)
                                          .getProperty(runtime, "pos"));
    result[7] = processPoint(runtime, array.getValueAtIndex(runtime, 2)
                                          .asObject(runtime)
                                          .getProperty(runtime, "c2"));
    result[8] = processPoint(runtime, array.getValueAtIndex(runtime, 3)
                                          .asObject(runtime)
                                          .getProperty(runtime, "c1"));
    result[9] = processPoint(runtime, array.getValueAtIndex(runtime, 3)
                                          .asObject(runtime)
                                          .getProperty(runtime, "pos"));
    result[10] = processPoint(runtime, array.getValueAtIndex(runtime, 3)
                                           .asObject(runtime)
                                           .getProperty(runtime, "c2"));
    result[11] = processPoint(runtime, array.getValueAtIndex(runtime, 0)
                                           .asObject(runtime)
                                           .getProperty(runtime, "c1"));

    return result;
  }
  throw std::runtime_error("Invalid prop value for Patch received");
}

template <>
std::vector<SkRSXform> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  std::vector<SkRSXform> result;
  if (value.isObject() && value.asObject(runtime).isArray(runtime)) {
    auto array = value.asObject(runtime).asArray(runtime);
    size_t size = array.size(runtime);
    result.reserve(size);

    for (size_t i = 0; i < size; i++) {
      result.push_back(getPropertyValue<SkRSXform>(
          runtime, array.getValueAtIndex(runtime, i)));
    }
  }
  return result;
}

template <>
std::vector<SkPoint> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  std::vector<SkPoint> result;
  if (value.isObject() && value.asObject(runtime).isArray(runtime)) {
    auto array = value.asObject(runtime).asArray(runtime);
    size_t size = array.size(runtime);
    result.reserve(size);

    for (size_t i = 0; i < size; i++) {
      auto point = processPoint(runtime, array.getValueAtIndex(runtime, i));
      result.push_back(point);
    }
  }
  return result;
}

template <>
std::vector<SkRect> getPropertyValue(jsi::Runtime &runtime,
                                     const jsi::Value &value) {
  std::vector<SkRect> result;
  if (value.isObject() && value.asObject(runtime).isArray(runtime)) {
    auto array = value.asObject(runtime).asArray(runtime);
    size_t size = array.size(runtime);
    result.reserve(size);

    for (size_t i = 0; i < size; i++) {
      auto rect = processRect(runtime, array.getValueAtIndex(runtime, i));
      if (rect) {
        result.push_back(*rect);
      } else {
        throw std::runtime_error("Invalid rect in array at index " +
                                 std::to_string(i));
      }
    }
  }
  return result;
}

template <>
std::vector<float> getPropertyValue(jsi::Runtime &runtime,
                                    const jsi::Value &value) {
  std::vector<float> result;

  if (value.isNumber()) {
    // If single number, create a vector with one element
    result.push_back(static_cast<float>(value.asNumber()));
  } else if (value.isObject()) {
    auto obj = value.asObject(runtime);
    if (obj.isArray(runtime)) {
      auto array = obj.asArray(runtime);
      size_t size = array.size(runtime);
      result.reserve(size);

      for (size_t i = 0; i < size; i++) {
        jsi::Value element = array.getValueAtIndex(runtime, i);
        if (element.isNumber()) {
          result.push_back(static_cast<float>(element.asNumber()));
        } else {
          throw std::runtime_error("Array elements must be numbers");
        }
      }
    } else {
      throw std::runtime_error("Expected array or number for vector<float>");
    }
  } else {
    throw std::runtime_error("Invalid value type for vector<float>");
  }

  return result;
}

template <>
std::vector<uint16_t> getPropertyValue(jsi::Runtime &runtime,
                                       const jsi::Value &value) {
  std::vector<uint16_t> result;

  if (value.isNumber()) {
    // If single number, create a vector with one element
    result.push_back(static_cast<float>(value.asNumber()));
  } else if (value.isObject()) {
    auto obj = value.asObject(runtime);
    if (obj.isArray(runtime)) {
      auto array = obj.asArray(runtime);
      size_t size = array.size(runtime);
      result.reserve(size);

      for (size_t i = 0; i < size; i++) {
        jsi::Value element = array.getValueAtIndex(runtime, i);
        if (element.isNumber()) {
          result.push_back(static_cast<uint16_t>(element.asNumber()));
        } else {
          throw std::runtime_error("Array elements must be numbers");
        }
      }
    } else {
      throw std::runtime_error("Expected array or number for vector<uint16_t>");
    }
  } else {
    throw std::runtime_error("Invalid value type for vector<uint16_t>");
  }

  return result;
}

template <>
bool getPropertyValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isBool()) {
    return value.asBool();
  }
  throw std::runtime_error("Invalid prop value for bool received");
}

//
template <typename T>
std::optional<T> makeOptionalPropertyValue(jsi::Runtime &runtime,
                                           const jsi::Value &value) {
  if (value.isNull() || value.isUndefined()) {
    return std::nullopt;
  }
  try {
    return getPropertyValue<T>(runtime, value);
  } catch (const std::runtime_error &) {
    return std::nullopt;
  }
}

template <>
std::optional<float> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  return makeOptionalPropertyValue<float>(runtime, value);
}

template <>
std::optional<SkPoint> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  return makeOptionalPropertyValue<SkPoint>(runtime, value);
}

template <>
std::optional<SkColor> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  return makeOptionalPropertyValue<SkColor>(runtime, value);
}

template <>
std::optional<BlendModeValue> getPropertyValue(jsi::Runtime &runtime,
                                               const jsi::Value &value) {
  return makeOptionalPropertyValue<BlendModeValue>(runtime, value);
}

template <>
std::optional<SkBlendMode> getPropertyValue(jsi::Runtime &runtime,
                                            const jsi::Value &value) {
  return makeOptionalPropertyValue<SkBlendMode>(runtime, value);
}

template <>
std::optional<SkMatrix> getPropertyValue(jsi::Runtime &runtime,
                                         const jsi::Value &value) {
  return makeOptionalPropertyValue<SkMatrix>(runtime, value);
}

template <>
std::optional<SkM44> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  return makeOptionalPropertyValue<SkM44>(runtime, value);
}

template <>
std::optional<bool> getPropertyValue(jsi::Runtime &runtime,
                                     const jsi::Value &value) {
  return makeOptionalPropertyValue<bool>(runtime, value);
}

template <>
std::optional<ClipDef> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  return makeOptionalPropertyValue<ClipDef>(runtime, value);
}

template <>
std::optional<Layer> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  return makeOptionalPropertyValue<Layer>(runtime, value);
}

template <>
std::optional<SkFont> getPropertyValue(jsi::Runtime &runtime,
                                       const jsi::Value &value) {
  return makeOptionalPropertyValue<SkFont>(runtime, value);
}

template <>
std::optional<SkPaint::Style> getPropertyValue(jsi::Runtime &runtime,
                                               const jsi::Value &value) {
  return makeOptionalPropertyValue<SkPaint::Style>(runtime, value);
}

template <>
std::optional<SkPaint::Join> getPropertyValue(jsi::Runtime &runtime,
                                              const jsi::Value &value) {
  return makeOptionalPropertyValue<SkPaint::Join>(runtime, value);
}

template <>
std::optional<SkPaint::Cap> getPropertyValue(jsi::Runtime &runtime,
                                             const jsi::Value &value) {
  return makeOptionalPropertyValue<SkPaint::Cap>(runtime, value);
}

template <>
std::optional<SkRect> getPropertyValue(jsi::Runtime &runtime,
                                       const jsi::Value &value) {
  return makeOptionalPropertyValue<SkRect>(runtime, value);
}

template <>
std::optional<sk_sp<SkImage>> getPropertyValue(jsi::Runtime &runtime,
                                               const jsi::Value &value) {
  return makeOptionalPropertyValue<sk_sp<SkImage>>(runtime, value);
}

template <>
std::optional<SkSamplingOptions> getPropertyValue(jsi::Runtime &runtime,
                                                  const jsi::Value &value) {
  return makeOptionalPropertyValue<SkSamplingOptions>(runtime, value);
}

template <>
std::optional<StrokeOpts> getPropertyValue(jsi::Runtime &runtime,
                                           const jsi::Value &value) {
  return makeOptionalPropertyValue<StrokeOpts>(runtime, value);
}

template <>
std::optional<std::vector<SkColor>> getPropertyValue(jsi::Runtime &runtime,
                                                     const jsi::Value &value) {
  return makeOptionalPropertyValue<std::vector<SkColor>>(runtime, value);
}

template <>
std::optional<std::vector<float>> getPropertyValue(jsi::Runtime &runtime,
                                                   const jsi::Value &value) {
  return makeOptionalPropertyValue<std::vector<float>>(runtime, value);
}

template <>
std::optional<SkTileMode> getPropertyValue(jsi::Runtime &runtime,
                                           const jsi::Value &value) {
  return makeOptionalPropertyValue<SkTileMode>(runtime, value);
}

template <>
std::optional<SkPathFillType> getPropertyValue(jsi::Runtime &runtime,
                                               const jsi::Value &value) {
  return makeOptionalPropertyValue<SkPathFillType>(runtime, value);
}

template <>
std::optional<SkColorChannel> getPropertyValue(jsi::Runtime &runtime,
                                               const jsi::Value &value) {
  return makeOptionalPropertyValue<SkColorChannel>(runtime, value);
}

template <>
std::optional<Uniforms> getPropertyValue(jsi::Runtime &runtime,
                                         const jsi::Value &value) {
  return makeOptionalPropertyValue<Uniforms>(runtime, value);
}

template <>
std::optional<Radius> getPropertyValue(jsi::Runtime &runtime,
                                       const jsi::Value &value) {
  return makeOptionalPropertyValue<Radius>(runtime, value);
}

template <>
std::optional<SkRRect> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  return makeOptionalPropertyValue<SkRRect>(runtime, value);
}

template <>
std::optional<SkPaint> getPropertyValue(jsi::Runtime &runtime,
                                        const jsi::Value &value) {
  return makeOptionalPropertyValue<SkPaint>(runtime, value);
}

template <>
std::optional<std::vector<SkPoint>> getPropertyValue(jsi::Runtime &runtime,
                                                     const jsi::Value &value) {
  return makeOptionalPropertyValue<std::vector<SkPoint>>(runtime, value);
}

template <>
std::optional<std::vector<uint16_t>> getPropertyValue(jsi::Runtime &runtime,
                                                      const jsi::Value &value) {
  return makeOptionalPropertyValue<std::vector<uint16_t>>(runtime, value);
}

} // namespace RNSkia
