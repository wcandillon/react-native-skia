#pragma once

#include <stdexcept>
#include <string>

#include "include/core/SkBlender.h"
#include "include/core/SkPaint.h"
#include "include/core/SkString.h"
#include "include/effects/SkRuntimeEffect.h"

namespace RNSkia {

// Custom blend mode values (must match TypeScript BlendMode enum)
constexpr int kBlendModePlusDarker = 1001;
constexpr int kBlendModePlusLighter = 1002;

// SkSL for PlusDarker blend mode
// Formula: rc = max(0, ra - ((da - dst) + (sa - src))), ra = sa + da - sa * da
// On premultiplied colors, so a translucent source darkens proportionally
inline const char *kPlusDarkerSkSL = R"(
    vec4 main(vec4 src, vec4 dst) {
        float outAlpha = src.a + dst.a - src.a * dst.a;
        vec3 c = max(vec3(0.0), outAlpha - ((dst.a - dst.rgb) + (src.a - src.rgb)));
        return vec4(c, outAlpha);
    }
)";

// SkSL for PlusLighter blend mode
// Formula: rc = min(1, dst + src)
// On premultiplied colors, so a translucent source lightens proportionally
inline const char *kPlusLighterSkSL = R"(
    vec4 main(vec4 src, vec4 dst) {
        return min(src + dst, vec4(1.0));
    }
)";

// Singleton class to cache custom blenders
class CustomBlenders {
public:
  static CustomBlenders &getInstance() {
    static CustomBlenders instance;
    return instance;
  }

  sk_sp<SkBlender> getPlusDarkerBlender() {
    if (!_plusDarkerBlender) {
      auto [effect, err] =
          SkRuntimeEffect::MakeForBlender(SkString(kPlusDarkerSkSL));
      if (effect) {
        _plusDarkerBlender = effect->makeBlender(nullptr);
      }
    }
    return _plusDarkerBlender;
  }

  sk_sp<SkBlender> getPlusLighterBlender() {
    if (!_plusLighterBlender) {
      auto [effect, err] =
          SkRuntimeEffect::MakeForBlender(SkString(kPlusLighterSkSL));
      if (effect) {
        _plusLighterBlender = effect->makeBlender(nullptr);
      }
    }
    return _plusLighterBlender;
  }

private:
  CustomBlenders() = default;
  ~CustomBlenders() = default;
  CustomBlenders(const CustomBlenders &) = delete;
  CustomBlenders &operator=(const CustomBlenders &) = delete;

  sk_sp<SkBlender> _plusDarkerBlender;
  sk_sp<SkBlender> _plusLighterBlender;
};

// Helper function to apply custom blend mode to a paint
inline void applyBlendMode(SkPaint &paint, int blendModeValue) {
  if (blendModeValue == kBlendModePlusDarker) {
    auto blender = CustomBlenders::getInstance().getPlusDarkerBlender();
    if (blender) {
      paint.setBlender(blender);
    }
  } else if (blendModeValue == kBlendModePlusLighter) {
    auto blender = CustomBlenders::getInstance().getPlusLighterBlender();
    if (blender) {
      paint.setBlender(blender);
    }
  } else {
    paint.setBlendMode(static_cast<SkBlendMode>(blendModeValue));
  }
}

// Converts a JS blend mode value to an SkBlendMode for the Skia entry points
// that take a plain SkBlendMode rather than a paint (drawPatch, drawVertices,
// drawAtlas, drawColor). The custom blend modes above are implemented as
// blenders on an SkPaint and have no SkBlendMode equivalent, so they - and any
// other out of range value - are rejected instead of being cast blindly.
inline SkBlendMode toBlendMode(double blendModeValue) {
  auto value = static_cast<int>(blendModeValue);
  if (value < 0 || value > static_cast<int>(SkBlendMode::kLastMode)) {
    throw std::invalid_argument("Unsupported blend mode: " +
                                std::to_string(value));
  }
  return static_cast<SkBlendMode>(value);
}

} // namespace RNSkia
