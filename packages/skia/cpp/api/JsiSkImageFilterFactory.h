#pragma once

#include <memory>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "JsiSkColor.h"
#include "JsiSkColorFilter.h"
#include "JsiSkConverters.h"
#include "JsiSkImage.h"
#include "JsiSkImageFilter.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPicture.h"
#include "JsiSkRect.h"
#include "JsiSkRuntimeShaderBuilder.h"
#include "JsiSkShader.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImageFilter.h"
#include "include/core/SkPoint3.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkImageFilterFactory
    : public JsiSkNativeObject<JsiSkImageFilterFactory> {
public:
  static constexpr const char *CLASS_NAME = "ImageFilterFactory";

  std::shared_ptr<JsiSkImageFilter>
  MakeBlur(float sigmaX, float sigmaY, int tileMode,
           JsiOptional<sk_sp<SkImageFilter>> input,
           JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Blur(sigmaX, sigmaY, static_cast<SkTileMode>(tileMode),
                             orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeColorFilter(sk_sp<SkColorFilter> cf,
                  JsiOptional<sk_sp<SkImageFilter>> input,
                  JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::ColorFilter(std::move(cf), orNull(std::move(input)),
                                    toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeOffset(double x, double y, JsiOptional<sk_sp<SkImageFilter>> input,
             JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::Offset(x, y, orNull(std::move(input)),
                                             toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeDisplacementMap(double xChannelSelector, double yChannelSelector,
                      double scale, sk_sp<SkImageFilter> in2,
                      JsiOptional<sk_sp<SkImageFilter>> input,
                      JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::DisplacementMap(
            static_cast<SkColorChannel>(xChannelSelector),
            static_cast<SkColorChannel>(yChannelSelector), scale,
            std::move(in2), orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter> MakeShader(sk_sp<SkShader> shader,
                                               JsiOptional<bool> dither,
                                               JsiOptional<SkRect> crop) {
    auto ditherMode = dither.has_value() && *dither
                          ? SkImageFilters::Dither::kYes
                          : SkImageFilters::Dither::kNo;
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Shader(std::move(shader), ditherMode, toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeCompose(JsiOptional<sk_sp<SkImageFilter>> outer,
              JsiOptional<sk_sp<SkImageFilter>> inner) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::Compose(orNull(std::move(outer)),
                                              orNull(std::move(inner))));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeBlend(double mode, sk_sp<SkImageFilter> background,
            JsiOptional<sk_sp<SkImageFilter>> foreground,
            JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Blend(static_cast<SkBlendMode>(mode),
                              std::move(background),
                              orNull(std::move(foreground)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeDropShadow(double dx, double dy, double sigmaX, double sigmaY,
                 JsiColor color, JsiOptional<sk_sp<SkImageFilter>> input,
                 JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::DropShadow(dx, dy, sigmaX, sigmaY, color,
                                   orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeDropShadowOnly(double dx, double dy, double sigmaX, double sigmaY,
                     JsiColor color, JsiOptional<sk_sp<SkImageFilter>> input,
                     JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::DropShadowOnly(
                          dx, dy, sigmaX, sigmaY, color,
                          orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeErode(double rx, double ry, JsiOptional<sk_sp<SkImageFilter>> input,
            JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::Erode(rx, ry, orNull(std::move(input)),
                                            toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeDilate(double rx, double ry, JsiOptional<sk_sp<SkImageFilter>> input,
             JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::Dilate(rx, ry, orNull(std::move(input)),
                                             toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeRuntimeShader(std::shared_ptr<SkRuntimeShaderBuilder> rtb,
                    JsiOptional<std::string> childName,
                    JsiOptional<sk_sp<SkImageFilter>> input) {
    std::string childNameStr = childName.value_or("");
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::RuntimeShader(*rtb, childNameStr.c_str(),
                                      orNull(std::move(input))));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeArithmetic(float k1, float k2, float k3, float k4, bool enforcePMColor,
                 JsiOptional<sk_sp<SkImageFilter>> background,
                 JsiOptional<sk_sp<SkImageFilter>> foreground,
                 JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Arithmetic(k1, k2, k3, k4, enforcePMColor,
                                   orNull(std::move(background)),
                                   orNull(std::move(foreground)),
                                   toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeCrop(SkRect rect, JsiOptional<double> tileMode,
           JsiOptional<sk_sp<SkImageFilter>> imageFilter) {
    auto mode = tileMode.has_value() ? static_cast<SkTileMode>(*tileMode)
                                     : SkTileMode::kDecal;
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Crop(rect, mode, orNull(std::move(imageFilter))));
  }

  std::shared_ptr<JsiSkImageFilter> MakeEmpty() {
    return std::make_shared<JsiSkImageFilter>(getContext(),
                                              SkImageFilters::Empty());
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeDistantLitDiffuse(SkPoint3 direction, JsiColor lightColor,
                        float surfaceScale, float kd,
                        JsiOptional<sk_sp<SkImageFilter>> input,
                        JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::DistantLitDiffuse(
                          direction, lightColor, surfaceScale, kd,
                          orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakePointLitDiffuse(SkPoint3 location, JsiColor lightColor,
                      float surfaceScale, float kd,
                      JsiOptional<sk_sp<SkImageFilter>> input,
                      JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::PointLitDiffuse(
                          location, lightColor, surfaceScale, kd,
                          orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeSpotLitDiffuse(SkPoint3 location, SkPoint3 target, float falloffExponent,
                     float cutoffAngle, JsiColor lightColor, float surfaceScale,
                     float kd, JsiOptional<sk_sp<SkImageFilter>> input,
                     JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::SpotLitDiffuse(
                          location, target, falloffExponent, cutoffAngle,
                          lightColor, surfaceScale, kd,
                          orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeDistantLitSpecular(SkPoint3 direction, JsiColor lightColor,
                         float surfaceScale, float ks, float shininess,
                         JsiOptional<sk_sp<SkImageFilter>> input,
                         JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::DistantLitSpecular(
                          direction, lightColor, surfaceScale, ks, shininess,
                          orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakePointLitSpecular(SkPoint3 location, JsiColor lightColor,
                       float surfaceScale, float ks, float shininess,
                       JsiOptional<sk_sp<SkImageFilter>> input,
                       JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::PointLitSpecular(
                          location, lightColor, surfaceScale, ks, shininess,
                          orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeSpotLitSpecular(SkPoint3 location, SkPoint3 target,
                      float falloffExponent, float cutoffAngle,
                      JsiColor lightColor, float surfaceScale, float ks,
                      float shininess, JsiOptional<sk_sp<SkImageFilter>> input,
                      JsiOptional<SkRect> crop) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::SpotLitSpecular(location, target, falloffExponent,
                                        cutoffAngle, lightColor, surfaceScale,
                                        ks, shininess, orNull(std::move(input)),
                                        toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeImage(sk_sp<SkImage> image, JsiOptional<SkRect> src,
            JsiOptional<SkRect> dst, JsiOptional<double> filterMode,
            JsiOptional<double> mipmap) {
    SkRect srcRect = src.has_value() ? *src : SkRect::Make(image->bounds());
    SkRect dstRect = dst.has_value() ? *dst : srcRect;
    auto sampling = SkSamplingOptions(toFilterMode(filterMode),
                                      toMipmapMode(mipmap));
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Image(std::move(image), srcRect, dstRect, sampling));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeMagnifier(SkRect lensBounds, float zoomAmount, float inset,
                JsiOptional<double> filterMode, JsiOptional<double> mipmap,
                JsiOptional<sk_sp<SkImageFilter>> input,
                JsiOptional<SkRect> crop) {
    auto sampling = SkSamplingOptions(toFilterMode(filterMode),
                                      toMipmapMode(mipmap));
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Magnifier(lensBounds, zoomAmount, inset, sampling,
                                  orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter> MakeMatrixConvolution(
      int kernelSizeX, int kernelSizeY, std::vector<float> kernel, double gain,
      double bias, int kernelOffsetX, int kernelOffsetY, double tileMode,
      bool convolveAlpha, JsiOptional<sk_sp<SkImageFilter>> input,
      JsiOptional<SkRect> crop) {
    auto kernelSize = SkISize::Make(kernelSizeX, kernelSizeY);
    auto kernelOffset = SkIPoint::Make(kernelOffsetX, kernelOffsetY);
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::MatrixConvolution(
            kernelSize, kernel.data(), gain, bias, kernelOffset,
            static_cast<SkTileMode>(tileMode), convolveAlpha,
            orNull(std::move(input)), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeMatrixTransform(SkMatrix matrix, JsiOptional<double> filterMode,
                      JsiOptional<double> mipmap,
                      JsiOptional<sk_sp<SkImageFilter>> input) {
    auto sampling = SkSamplingOptions(toFilterMode(filterMode),
                                      toMipmapMode(mipmap));
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::MatrixTransform(
                          matrix, sampling, orNull(std::move(input))));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeMerge(std::vector<JsiOptional<sk_sp<SkImageFilter>>> jsiFilters,
            JsiOptional<SkRect> crop) {
    std::vector<sk_sp<SkImageFilter>> filters;
    filters.reserve(jsiFilters.size());
    for (auto &filter : jsiFilters) {
      filters.push_back(orNull(std::move(filter)));
    }
    return std::make_shared<JsiSkImageFilter>(
        getContext(),
        SkImageFilters::Merge(filters.data(), filters.size(), toCropRect(crop)));
  }

  std::shared_ptr<JsiSkImageFilter> MakePicture(sk_sp<SkPicture> picture,
                                                JsiOptional<SkRect> target) {
    SkRect targetRect = target.has_value()
                            ? *target
                            : (picture ? picture->cullRect()
                                       : SkRect::MakeEmpty());
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::Picture(std::move(picture), targetRect));
  }

  std::variant<std::nullptr_t, std::shared_ptr<JsiSkImageFilter>>
  MakeRuntimeShaderWithChildren(
      std::shared_ptr<SkRuntimeShaderBuilder> rtb, float maxSampleRadius,
      std::vector<std::string> childNames,
      std::vector<JsiOptional<sk_sp<SkImageFilter>>> jsiInputs) {
    if (jsiInputs.size() != childNames.size()) {
      return nullptr;
    }
    std::vector<std::string_view> childNamesStringView;
    childNamesStringView.reserve(childNames.size());
    for (const auto &name : childNames) {
      childNamesStringView.push_back(std::string_view(name));
    }
    std::vector<sk_sp<SkImageFilter>> inputs;
    inputs.reserve(jsiInputs.size());
    for (auto &input : jsiInputs) {
      inputs.push_back(orNull(std::move(input)));
    }
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::RuntimeShader(
                          *rtb, maxSampleRadius, childNamesStringView.data(),
                          inputs.data(), inputs.size()));
  }

  std::shared_ptr<JsiSkImageFilter>
  MakeTile(SkRect src, SkRect dst, JsiOptional<sk_sp<SkImageFilter>> input) {
    return std::make_shared<JsiSkImageFilter>(
        getContext(), SkImageFilters::Tile(src, dst, orNull(std::move(input))));
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installMethod(runtime, prototype, "MakeBlur",
                  &JsiSkImageFilterFactory::MakeBlur);
    installMethod(runtime, prototype, "MakeOffset",
                  &JsiSkImageFilterFactory::MakeOffset);
    installMethod(runtime, prototype, "MakeColorFilter",
                  &JsiSkImageFilterFactory::MakeColorFilter);
    installMethod(runtime, prototype, "MakeShader",
                  &JsiSkImageFilterFactory::MakeShader);
    installMethod(runtime, prototype, "MakeDisplacementMap",
                  &JsiSkImageFilterFactory::MakeDisplacementMap);
    installMethod(runtime, prototype, "MakeCompose",
                  &JsiSkImageFilterFactory::MakeCompose);
    installMethod(runtime, prototype, "MakeErode",
                  &JsiSkImageFilterFactory::MakeErode);
    installMethod(runtime, prototype, "MakeDilate",
                  &JsiSkImageFilterFactory::MakeDilate);
    installMethod(runtime, prototype, "MakeBlend",
                  &JsiSkImageFilterFactory::MakeBlend);
    installMethod(runtime, prototype, "MakeDropShadow",
                  &JsiSkImageFilterFactory::MakeDropShadow);
    installMethod(runtime, prototype, "MakeDropShadowOnly",
                  &JsiSkImageFilterFactory::MakeDropShadowOnly);
    installMethod(runtime, prototype, "MakeRuntimeShader",
                  &JsiSkImageFilterFactory::MakeRuntimeShader);
    installMethod(runtime, prototype, "MakeArithmetic",
                  &JsiSkImageFilterFactory::MakeArithmetic);
    installMethod(runtime, prototype, "MakeCrop",
                  &JsiSkImageFilterFactory::MakeCrop);
    installMethod(runtime, prototype, "MakeEmpty",
                  &JsiSkImageFilterFactory::MakeEmpty);
    installMethod(runtime, prototype, "MakeImage",
                  &JsiSkImageFilterFactory::MakeImage);
    installMethod(runtime, prototype, "MakeMagnifier",
                  &JsiSkImageFilterFactory::MakeMagnifier);
    installMethod(runtime, prototype, "MakeMatrixConvolution",
                  &JsiSkImageFilterFactory::MakeMatrixConvolution);
    installMethod(runtime, prototype, "MakeMatrixTransform",
                  &JsiSkImageFilterFactory::MakeMatrixTransform);
    installMethod(runtime, prototype, "MakeMerge",
                  &JsiSkImageFilterFactory::MakeMerge);
    installMethod(runtime, prototype, "MakePicture",
                  &JsiSkImageFilterFactory::MakePicture);
    installMethod(runtime, prototype, "MakeRuntimeShaderWithChildren",
                  &JsiSkImageFilterFactory::MakeRuntimeShaderWithChildren);
    installMethod(runtime, prototype, "MakeTile",
                  &JsiSkImageFilterFactory::MakeTile);
    installMethod(runtime, prototype, "MakeDistantLitDiffuse",
                  &JsiSkImageFilterFactory::MakeDistantLitDiffuse);
    installMethod(runtime, prototype, "MakePointLitDiffuse",
                  &JsiSkImageFilterFactory::MakePointLitDiffuse);
    installMethod(runtime, prototype, "MakeSpotLitDiffuse",
                  &JsiSkImageFilterFactory::MakeSpotLitDiffuse);
    installMethod(runtime, prototype, "MakeDistantLitSpecular",
                  &JsiSkImageFilterFactory::MakeDistantLitSpecular);
    installMethod(runtime, prototype, "MakePointLitSpecular",
                  &JsiSkImageFilterFactory::MakePointLitSpecular);
    installMethod(runtime, prototype, "MakeSpotLitSpecular",
                  &JsiSkImageFilterFactory::MakeSpotLitSpecular);
  }

  size_t getMemoryPressure() override { return 2048; }

  explicit JsiSkImageFilterFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkImageFilterFactory>(std::move(context)) {}

private:
  static sk_sp<SkImageFilter> orNull(JsiOptional<sk_sp<SkImageFilter>> filter) {
    return filter.has_value() ? std::move(*filter) : nullptr;
  }

  static SkImageFilters::CropRect toCropRect(const JsiOptional<SkRect> &rect) {
    return rect.has_value() ? SkImageFilters::CropRect(*rect)
                            : SkImageFilters::CropRect{};
  }

  static SkFilterMode toFilterMode(const JsiOptional<double> &mode) {
    return mode.has_value() ? static_cast<SkFilterMode>(*mode)
                            : SkFilterMode::kNearest;
  }

  static SkMipmapMode toMipmapMode(const JsiOptional<double> &mode) {
    return mode.has_value() ? static_cast<SkMipmapMode>(*mode)
                            : SkMipmapMode::kNone;
  }
};

} // namespace RNSkia
