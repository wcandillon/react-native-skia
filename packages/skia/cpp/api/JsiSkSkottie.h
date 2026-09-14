#pragma once

#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <variant>

#include <jsi/jsi.h>

#include "JsiSkCanvas.h"
#include "JsiSkColor.h"
#include "JsiSkConverters.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkPoint.h"
#include "JsiSkRect.h"
#include "api/third_party/SkottieUtils.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/codec/SkJpegDecoder.h"
#include "include/codec/SkPngDecoder.h"
#include "include/codec/SkWebpDecoder.h"

#include "modules/skottie/include/Skottie.h"
#include "modules/skottie/include/SkottieProperty.h"
#include "modules/skottie/include/SlotManager.h"
#include "modules/sksg/include/SkSGInvalidationController.h"

#pragma clang diagnostic pop

namespace RNSkia {
using namespace facebook;

std::unique_ptr<SkCodec> DecodeImageData(sk_sp<SkData> data) {
  if (data == nullptr) {
    return nullptr;
  }

  if (SkJpegDecoder::IsJpeg(data->data(), data->size())) {
    return SkJpegDecoder::Decode(data, nullptr);
  }

  if (SkPngDecoder::IsPng(data->data(), data->size())) {
    return SkPngDecoder::Decode(data, nullptr);
  }

  if (SkWebpDecoder::IsWebp(data->data(), data->size())) {
    return SkWebpDecoder::Decode(data, nullptr);
  }
  return nullptr;
}

class SkottieAssetProvider : public skottie::ResourceProvider {
public:
  using AssetMap = std::unordered_map<std::string, sk_sp<SkData>>;

  static sk_sp<SkottieAssetProvider> Make(AssetMap assets,
                                          sk_sp<SkFontMgr> fontMgr) {
    return sk_sp<SkottieAssetProvider>(
        new SkottieAssetProvider(std::move(assets), std::move(fontMgr)));
  }

  ~SkottieAssetProvider() override = default;

  sk_sp<skottie::ImageAsset>
  loadImageAsset(const char[] /* path */, const char name[],
                 const char[] /* id */) const override {
    // For CK/Skottie we ignore paths & IDs, and identify images based solely on
    // name.
    if (auto data = this->findAsset(name)) {
      auto codec = DecodeImageData(data);
      if (!codec) {
        return nullptr;
      }
      return skresources::MultiFrameImageAsset::Make(std::move(codec));
    }

    return nullptr;
  }

  sk_sp<skresources::ExternalTrackAsset>
  loadAudioAsset(const char[] /* path */, const char[] /* name */,
                 const char id[]) override {

    return nullptr;
  }

  sk_sp<SkTypeface> loadTypeface(const char name[],
                                 const char[] /* url */) const override {
    RNSkLogger::logToConsole("loadTypeface %s", name);
    sk_sp<SkData> faceData = this->findAsset(name);
    if (!faceData) {
      return nullptr;
    }
    return fFontMgr->makeFromData(std::move(faceData));
  }

  sk_sp<SkData> load(const char[] /*path*/, const char name[]) const override {
    // Ignore paths.
    return this->findAsset(name);
  }

private:
  explicit SkottieAssetProvider(AssetMap assets, sk_sp<SkFontMgr> fontMgr)
      : fAssets(std::move(assets)), fFontMgr(std::move(fontMgr)) {}
  const AssetMap fAssets;
  const sk_sp<SkFontMgr> fFontMgr;

  sk_sp<SkData> findAsset(const char name[]) const {
    auto it = fAssets.find(name);
    if (it != fAssets.end()) {
      return it->second;
    }
    return nullptr;
  }
};

class ManagedAnimation {
public:
  ManagedAnimation(std::string json, SkottieAssetProvider::AssetMap assets,
                   sk_sp<SkFontMgr> fontMgr) {
    _propManager = std::make_unique<CustomPropertyManager>(
        CustomPropertyManager::Mode::kCollapseProperties, "");
    _resourceProvider =
        SkottieAssetProvider::Make(std::move(assets), std::move(fontMgr));
    // There is a bug in the ref counting that we address here.
    _resourceProvider->ref();
    auto builder = std::make_shared<skottie::Animation::Builder>();
    builder->setResourceProvider(_resourceProvider);
    builder->setPropertyObserver(_propManager->getPropertyObserver());
    _animation = builder->make(json.c_str(), json.size());
    _slotManager = builder->getSlotManager();
  }

  ~ManagedAnimation() {
    _animation = nullptr;
    _slotManager = nullptr;
    // Here the ref count is 0 but it's because of a bug, we need to still
    // delete the resource provider
    if (_resourceProvider) {
      auto *raw_ptr = _resourceProvider.get();
      _resourceProvider = nullptr;
      delete raw_ptr; // Direct delete - bypasses ref counting entirely
    }
  }

public:
  sk_sp<skottie::Animation> _animation = nullptr;
  sk_sp<skottie::SlotManager> _slotManager = nullptr;
  sk_sp<SkottieAssetProvider> _resourceProvider = nullptr;
  std::unique_ptr<CustomPropertyManager> _propManager = nullptr;
};

class JsiSkSkottie
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkSkottie,
                                                ManagedAnimation> {
public:
  static constexpr const char *CLASS_NAME = "Skottie";

  // #region Properties
  double duration() {
    return static_cast<double>(getObject()->_animation->duration());
  }
  double fps() { return static_cast<double>(getObject()->_animation->fps()); }
  // #endregion

  // #region Methods
  void seekFrame(double frame,
                 std::optional<std::shared_ptr<SkRect>> rectParam) {
    sksg::InvalidationController ic;
    getObject()->_animation->seekFrame(frame, &ic);
    auto bounds = ic.bounds();
    if (rectParam.has_value() && *rectParam != nullptr) {
      auto rect = *rectParam;
      rect->setXYWH(bounds.x(), bounds.y(), bounds.width(), bounds.height());
    }
  }

  SkSize size() { return getObject()->_animation->size(); }

  void render(std::shared_ptr<JsiSkCanvas> jsiCanvas,
              std::optional<std::shared_ptr<SkRect>> rect) {
    auto canvas = jsiCanvas->getCanvas();
    if (rect.has_value()) {
      getObject()->_animation->render(canvas, rect->get());
    } else {
      getObject()->_animation->render(canvas);
    }
  }

  std::string version() {
    return std::string(getObject()->_animation->version().c_str());
  }

  bool setColor(JsiOptional<std::string> key, JsiOptional<JsiColor> color) {
    if (!key.has_value() || !color.has_value()) {
      return false;
    }
    return getObject()->_propManager->setColor(*key, *color);
  }

  bool setOpacity(JsiOptional<std::string> key, JsiOptional<double> opacity) {
    if (!key.has_value() || !opacity.has_value()) {
      return false;
    }
    return getObject()->_propManager->setOpacity(*key, *opacity);
  }

  bool setText(JsiOptional<std::string> key, JsiOptional<std::string> text,
               JsiOptional<double> size) {
    if (!key.has_value() || !text.has_value() || !size.has_value()) {
      return false;
    }
    // preserve all other text fields
    auto t = getObject()->_propManager->getText(*key);
    t.fText = SkString(*text);
    t.fTextSize = *size;
    return getObject()->_propManager->setText(*key, t);
  }

  JSI_HOST_FUNCTION(getTextProps) {
    auto textProps = getObject()->_propManager->getTextProps();
    int i = 0;
    auto props = jsi::Array(runtime, textProps.size());
    for (const auto &prop : textProps) {
      auto txt = getObject()->_propManager->getText(prop);
      auto txtVal = jsi::Object(runtime);
      txtVal.setProperty(runtime, "text", txt.fText.c_str());
      txtVal.setProperty(runtime, "size", txt.fTextSize);
      auto val = jsi::Object(runtime);
      val.setProperty(runtime, "key", prop);
      val.setProperty(runtime, "value", txtVal);
      props.setValueAtIndex(runtime, i, val);
      i++;
    }
    return props;
  }

  bool setTransform(JsiOptional<std::string> key, JsiOptional<SkPoint> anchor,
                    JsiOptional<SkPoint> position, JsiOptional<SkPoint> scale,
                    JsiOptional<double> rotation, JsiOptional<double> skew,
                    JsiOptional<double> skewAxis) {
    if (!key.has_value() || !anchor.has_value() || !position.has_value() ||
        !scale.has_value() || !rotation.has_value() || !skew.has_value() ||
        !skewAxis.has_value()) {
      return false;
    }

    skottie::TransformPropertyValue transform;
    transform.fAnchorPoint = {anchor->x(), anchor->y()};
    transform.fPosition = {position->x(), position->y()};
    transform.fScale = {scale->x(), scale->y()};
    transform.fRotation = *rotation;
    transform.fSkew = *skew;
    transform.fSkewAxis = *skewAxis;
    return getObject()->_propManager->setTransform(*key, transform);
  }

  JSI_HOST_FUNCTION(getSlotInfo) {
    jsi::Object slotInfoJS = jsi::Object(runtime);
    auto slotInfo = getObject()->_slotManager->getSlotInfo();

    auto colorSlotIDs = jsi::Array(runtime, slotInfo.fColorSlotIDs.size());
    for (size_t i = 0; i < slotInfo.fColorSlotIDs.size(); i++) {
      colorSlotIDs.setValueAtIndex(
          runtime, i,
          jsi::String::createFromUtf8(runtime,
                                      slotInfo.fColorSlotIDs[i].c_str()));
    }
    slotInfoJS.setProperty(runtime, "colorSlotIDs", colorSlotIDs);

    auto scalarSlotIDs = jsi::Array(runtime, slotInfo.fScalarSlotIDs.size());
    for (size_t i = 0; i < slotInfo.fScalarSlotIDs.size(); i++) {
      scalarSlotIDs.setValueAtIndex(
          runtime, i,
          jsi::String::createFromUtf8(runtime,
                                      slotInfo.fScalarSlotIDs[i].c_str()));
    }
    slotInfoJS.setProperty(runtime, "scalarSlotIDs", scalarSlotIDs);

    auto vec2SlotIDs = jsi::Array(runtime, slotInfo.fVec2SlotIDs.size());
    for (size_t i = 0; i < slotInfo.fVec2SlotIDs.size(); i++) {
      vec2SlotIDs.setValueAtIndex(
          runtime, i,
          jsi::String::createFromUtf8(runtime,
                                      slotInfo.fVec2SlotIDs[i].c_str()));
    }
    slotInfoJS.setProperty(runtime, "vec2SlotIDs", vec2SlotIDs);

    auto imageSlotIDs = jsi::Array(runtime, slotInfo.fImageSlotIDs.size());
    for (size_t i = 0; i < slotInfo.fImageSlotIDs.size(); i++) {
      imageSlotIDs.setValueAtIndex(
          runtime, i,
          jsi::String::createFromUtf8(runtime,
                                      slotInfo.fImageSlotIDs[i].c_str()));
    }
    slotInfoJS.setProperty(runtime, "imageSlotIDs", imageSlotIDs);

    auto textSlotIDs = jsi::Array(runtime, slotInfo.fTextSlotIDs.size());
    for (size_t i = 0; i < slotInfo.fTextSlotIDs.size(); i++) {
      textSlotIDs.setValueAtIndex(
          runtime, i,
          jsi::String::createFromUtf8(runtime,
                                      slotInfo.fTextSlotIDs[i].c_str()));
    }
    slotInfoJS.setProperty(runtime, "textSlotIDs", textSlotIDs);
    return slotInfoJS;
  }

  bool setColorSlot(JsiOptional<std::string> slotID,
                    JsiOptional<JsiColor> color) {
    if (!slotID.has_value() || !color.has_value()) {
      return false;
    }
    return getObject()->_slotManager->setColorSlot(SkString(*slotID), *color);
  }

  bool setScalarSlot(JsiOptional<std::string> slotID,
                     JsiOptional<double> scalar) {
    if (!slotID.has_value() || !scalar.has_value()) {
      return false;
    }
    return getObject()->_slotManager->setScalarSlot(SkString(*slotID),
                                                    *scalar);
  }

  bool setVec2Slot(JsiOptional<std::string> slotID,
                   JsiOptional<SkPoint> point) {
    if (!slotID.has_value() || !point.has_value()) {
      return false;
    }
    SkV2 vec2{point->x(), point->y()};
    return getObject()->_slotManager->setVec2Slot(SkString(*slotID), vec2);
  }

  // The text value argument is intentionally not declared: the raw binding
  // never read it (the method is not implemented yet).
  bool setTextSlot(JsiOptional<std::string> key) {
    // TODO: Implement proper text slot setting
    return false;
  }

  bool setImageSlot(JsiOptional<std::string> slotID,
                    JsiOptional<std::string> assetName) {
    if (!slotID.has_value() || !assetName.has_value()) {
      return false;
    }
    return getObject()->_slotManager->setImageSlot(
        SkString(*slotID), getObject()->_resourceProvider->loadImageAsset(
                               nullptr, assetName->data(), nullptr));
  }

  JSI_HOST_FUNCTION(getColorSlot) {
    if (count < 1) {
      return jsi::Value::null();
    }
    auto slotID = arguments[0].asString(runtime).utf8(runtime);
    if (auto v = getObject()->_slotManager->getColorSlot(SkString(slotID))) {
      return JsiSkColor::toValue(runtime, v.value());
    }
    return jsi::Value::null();
  }

  std::variant<double, std::nullptr_t>
  getScalarSlot(JsiOptional<std::string> slotID) {
    if (!slotID.has_value()) {
      return nullptr;
    }
    if (auto v = getObject()->_slotManager->getScalarSlot(SkString(*slotID))) {
      return static_cast<double>(v.value());
    }
    return nullptr;
  }

  JSI_HOST_FUNCTION(getVec2Slot) {
    if (count < 1) {
      return jsi::Value::null();
    }
    auto slotID = arguments[0].asString(runtime).utf8(runtime);
    if (auto v = getObject()->_slotManager->getVec2Slot(SkString(slotID))) {
      auto point = jsi::Object(runtime);
      point.setProperty(runtime, "x", static_cast<double>(v->x));
      point.setProperty(runtime, "y", static_cast<double>(v->y));
      return point;
    }
    return jsi::Value::null();
  }

  JSI_HOST_FUNCTION(getTextSlot) {
    if (count < 1) {
      return jsi::Value::null();
    }
    auto slotID = arguments[0].asString(runtime).utf8(runtime);
    if (auto textProp =
            getObject()->_slotManager->getTextSlot(SkString(slotID))) {
      jsi::Object textVal(runtime);
      // text_val.set("typeface", textProp->fTypeface);
      // text_val.set("text", emscripten::val(textProp->fText.c_str()));
      // text_val.set("textSize", textProp->fTextSize);
      // text_val.set("minTextSize", textProp->fMinTextSize);
      // text_val.set("maxTextSize", textProp->fMaxTextSize);
      // text_val.set("strokeWidth", textProp->fStrokeWidth);
      // text_val.set("lineHeight", textProp->fLineHeight);
      // text_val.set("lineShift", textProp->fLineShift);
      // text_val.set("ascent", textProp->fAscent);
      // text_val.set("maxLines", textProp->fMaxLines);

      // switch (textProp->fHAlign) {
      // case SkTextUtils::Align::kLeft_Align:
      //   text_val.set("horizAlign", para::TextAlign::kLeft);
      //   break;
      // case SkTextUtils::Align::kRight_Align:
      //   text_val.set("horizAlign", para::TextAlign::kRight);
      //   break;
      // case SkTextUtils::Align::kCenter_Align:
      //   text_val.set("horizAlign", para::TextAlign::kCenter);
      //   break;
      // default:
      //   text_val.set("horizAlign", para::TextAlign::kLeft);
      //   break;
      // }

      // text_val.set("vertAlign", textProp->fVAlign);
      // text_val.set("resize", textProp->fResize);

      // if (textProp->fLineBreak ==
      //     skottie::Shaper::LinebreakPolicy::kParagraph) {
      //   text_val.set("linebreak", SkUnicode::LineBreakType::kSoftLineBreak);
      // } else {
      //   text_val.set("linebreak", SkUnicode::LineBreakType::kHardLineBreak);
      // }

      // if (textProp->fDirection == skottie::Shaper::Direction::kLTR) {
      //   text_val.set("direction", para::TextDirection::kLtr);
      // } else {
      //   text_val.set("direction", para::TextDirection::kRtl);
      // }
      // text_val.set("strokeJoin", textProp->fStrokeJoin);

      // text_val.set(
      //     "fillColor",
      //     MakeTypedArray(4,
      //     SkColor4f::FromColor(textProp->fFillColor).vec()));

      // text_val.set("strokeColor",
      //              MakeTypedArray(
      //                  4,
      //                  SkColor4f::FromColor(textProp->fStrokeColor).vec()));

      // const float box[] = {textProp->fBox.fLeft, textProp->fBox.fTop,
      //                      textProp->fBox.fRight, textProp->fBox.fBottom};
      // text_val.set("boundingBox", MakeTypedArray(4, box));
      return textVal;
    }
    return jsi::Value::null();
  }

  JSI_HOST_FUNCTION(getColorProps) {
    auto props = getObject()->_propManager->getColorProps();
    auto colorProps =
        jsi::Array(runtime, getObject()->_propManager->getColorProps().size());
    int i = 0;
    for (const auto &cp : getObject()->_propManager->getColorProps()) {
      auto colorProp = jsi::Object(runtime);
      colorProp.setProperty(runtime, "key", cp);
      auto colorPropValue = getObject()->_propManager->getColor(cp);
      colorProp.setProperty(runtime, "value",
                            JsiSkColor::toValue(runtime, colorPropValue));
      colorProps.setValueAtIndex(runtime, i, colorProp);
      i++;
    }

    return colorProps;
  }

  JSI_HOST_FUNCTION(getOpacityProps) {
    auto props = getObject()->_propManager->getOpacityProps();
    auto opacityProps = jsi::Array(
        runtime, getObject()->_propManager->getOpacityProps().size());
    int i = 0;
    for (const auto &op : getObject()->_propManager->getOpacityProps()) {
      auto opacityProp = jsi::Object(runtime);
      opacityProp.setProperty(runtime, "key", op);
      opacityProp.setProperty(runtime, "value",
                              getObject()->_propManager->getOpacity(op));
      opacityProps.setValueAtIndex(runtime, i, opacityProp);
      i++;
    }
    return opacityProps;
  }

  JSI_HOST_FUNCTION(getTransformProps) {
    auto props = getObject()->_propManager->getTransformProps();
    auto transformProps = jsi::Array(
        runtime, getObject()->_propManager->getTransformProps().size());
    int i = 0;
    for (const auto &tp : getObject()->_propManager->getTransformProps()) {
      const auto transform = getObject()->_propManager->getTransform(tp);

      auto transformProp = jsi::Object(runtime);
      transformProp.setProperty(runtime, "key", tp);
      jsi::Object transformPropValue(runtime);
      auto anchor = jsi::Object(runtime);

      anchor.setProperty(runtime, "x", transform.fAnchorPoint.x());
      anchor.setProperty(runtime, "y", transform.fAnchorPoint.y());
      transformPropValue.setProperty(runtime, "anchor", anchor);

      auto position = jsi::Object(runtime);
      position.setProperty(runtime, "x", transform.fPosition.x());
      position.setProperty(runtime, "y", transform.fPosition.y());
      transformPropValue.setProperty(runtime, "position", position);

      auto scale = jsi::Object(runtime);
      scale.setProperty(runtime, "x", transform.fScale.x());
      scale.setProperty(runtime, "y", transform.fScale.y());
      transformPropValue.setProperty(runtime, "scale", scale);

      transformPropValue.setProperty(runtime, "rotation", transform.fRotation);
      transformPropValue.setProperty(runtime, "skew", transform.fSkew);
      transformPropValue.setProperty(runtime, "skewAxis", transform.fSkewAxis);
      transformProp.setProperty(runtime, "value", transformPropValue);
      transformProps.setValueAtIndex(runtime, i, transformProp);
      i++;
    }
    return transformProps;
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "duration", &JsiSkSkottie::duration);
    installMethod(runtime, prototype, "fps", &JsiSkSkottie::fps);
    installMethod(runtime, prototype, "seekFrame", &JsiSkSkottie::seekFrame);
    installMethod(runtime, prototype, "render", &JsiSkSkottie::render);
    installMethod(runtime, prototype, "size", &JsiSkSkottie::size);
    installMethod(runtime, prototype, "version", &JsiSkSkottie::version);
    installHostMethod(runtime, prototype, "getSlotInfo",
                      &JsiSkSkottie::getSlotInfo);
    installMethod(runtime, prototype, "setColorSlot",
                  &JsiSkSkottie::setColorSlot);
    installMethod(runtime, prototype, "setScalarSlot",
                  &JsiSkSkottie::setScalarSlot);
    installMethod(runtime, prototype, "setVec2Slot",
                  &JsiSkSkottie::setVec2Slot);
    installMethod(runtime, prototype, "setTextSlot",
                  &JsiSkSkottie::setTextSlot);
    installMethod(runtime, prototype, "setImageSlot",
                  &JsiSkSkottie::setImageSlot);
    installHostMethod(runtime, prototype, "getColorSlot",
                      &JsiSkSkottie::getColorSlot);
    installMethod(runtime, prototype, "getScalarSlot",
                  &JsiSkSkottie::getScalarSlot);
    installHostMethod(runtime, prototype, "getVec2Slot",
                      &JsiSkSkottie::getVec2Slot);
    installHostMethod(runtime, prototype, "getTextSlot",
                      &JsiSkSkottie::getTextSlot);
    installHostMethod(runtime, prototype, "getColorProps",
                      &JsiSkSkottie::getColorProps);
    installHostMethod(runtime, prototype, "getOpacityProps",
                      &JsiSkSkottie::getOpacityProps);
    installHostMethod(runtime, prototype, "getTransformProps",
                      &JsiSkSkottie::getTransformProps);
    installHostMethod(runtime, prototype, "getTextProps",
                      &JsiSkSkottie::getTextProps);
    installMethod(runtime, prototype, "setColor", &JsiSkSkottie::setColor);
    installMethod(runtime, prototype, "setText", &JsiSkSkottie::setText);
  }
  // #endregion

  /**
    Constructor
  */
  JsiSkSkottie(std::shared_ptr<RNSkPlatformContext> context,
               std::shared_ptr<ManagedAnimation> animation)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkSkottie, ManagedAnimation>(
            std::move(context), std::move(animation)) {}

  size_t getMemoryPressure() override {
    auto animation = getObject();
    if (!animation || !animation->_animation) {
      return 1024; // Base size if no animation
    }

    auto size = animation->_animation->size();
    auto duration = animation->_animation->duration();
    auto fps = animation->_animation->fps();

    // Estimate memory usage based on animation properties
    // Base calculation: width * height * 4 bytes per pixel * estimated frame
    // count
    size_t frameCount = static_cast<size_t>(duration * fps);
    size_t estimatedFrameSize =
        static_cast<size_t>(size.width() * size.height() * 4);

    // Conservative estimate: assume some frames are cached
    size_t cachedFrames =
        std::min(frameCount, static_cast<size_t>(60)); // Max 60 cached frames
    size_t animationMemory = estimatedFrameSize * cachedFrames;

    // Add base overhead for animation data structures
    size_t baseOverhead =
        64 * 1024; // 64KB for metadata, property managers, etc.

    return animationMemory + baseOverhead;
  }
};
} // namespace RNSkia
