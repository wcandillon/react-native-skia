#pragma once

#include "JsiDomNodeProp.h"


#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <SkPaint.h>

#pragma clang diagnostic pop

namespace RNSkia {

static PropId PropNameColor = JsiPropId::get("color");
static PropId PropNameStyle = JsiPropId::get("style");
static PropId PropNameStrokeWidth = JsiPropId::get("strokeWidth");
static PropId PropNameBlendMode = JsiPropId::get("blendMode");
static PropId PropNameStrokeJoin = JsiPropId::get("strokeJoin");
static PropId PropNameStrokeCap = JsiPropId::get("strokeCap");
static PropId PropNameStrokeMiter = JsiPropId::get("strokeMiter");
static PropId PropNameAntiAlias = JsiPropId::get("antiAlias");

class PaintProp:
public JsiDerivedDomNodeProp<std::shared_ptr<SkPaint>> {
public:
  PaintProp(): JsiDerivedDomNodeProp<std::shared_ptr<SkPaint>>() {
    _color = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameColor, PropType::String));
    _style = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameStyle, PropType::String));
    _strokeWidth = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameStrokeWidth, PropType::Number));
    _blendMode = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameBlendMode, PropType::String));
    _strokeJoin = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameStrokeJoin, PropType::String));
    _strokeCap = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameStrokeCap, PropType::Number));
    _strokeMiter = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameStrokeMiter, PropType::Number));
    _antiAlias = addChildProp(std::make_shared<JsiDomNodeProp>(PropNameAntiAlias, PropType::Number));
  }
  
  void setParentPaint(std::shared_ptr<SkPaint> paint) {
    if (_parentPaint != paint) {
      _parentPaint = paint;
      _parentPaintWasReset = true;
      setDerivedValue(nullptr);
    }
  }
  
  bool hasChanged(JsiDomNodeProps* props) {
    if (!props->getHasPropChanges()) {
      return false;
    }
    
    return props->getHasPropChanges(PropNameColor) ||
      props->getHasPropChanges(PropNameStyle) ||
      props->getHasPropChanges(PropNameStrokeWidth) ||
      props->getHasPropChanges(PropNameBlendMode) ||
      props->getHasPropChanges(PropNameStrokeJoin) ||
      props->getHasPropChanges(PropNameStrokeCap) ||
      props->getHasPropChanges(PropNameStrokeMiter) ||
      props->getHasPropChanges(PropNameAntiAlias);
  }
  
  void updateDerivedValue(JsiDomNodeProps* props) override {
    // We only get here if something has changed - start with COLOR
    if (_color->hasValue() && (_parentPaintWasReset || props->getHasPropChanges(PropNameColor))) {
      ensureDerivedValue();
      auto parsedColor = CSSColorParser::parse(_color->getPropValue()->getAsString());
      if (parsedColor.a == -1.0f) {
        getDerivedValue()->setColor(SK_ColorBLACK);
      } else {
        getDerivedValue()->setColor(SkColorSetARGB(parsedColor.a * 255,
                                                   parsedColor.r,
                                                   parsedColor.g,
                                                   parsedColor.b));
      }
    }
    // Style
    if (_style->hasValue() && (_parentPaintWasReset || props->getHasPropChanges(PropNameStyle))) {
      ensureDerivedValue();
      auto styleValue = _style->getPropValue()->getAsString();
      if (styleValue == "stroke") {
        getDerivedValue()->setStyle(SkPaint::Style::kStroke_Style);
      } else if (styleValue == "fill") {
        getDerivedValue()->setStyle(SkPaint::Style::kFill_Style);
      } else {
        throw std::runtime_error(styleValue + " is not a valud value for the style property.");
      }
    }
    // Stroke Width
    if (_strokeWidth->hasValue() && (_parentPaintWasReset || props->getHasPropChanges(PropNameStrokeWidth))) {
      ensureDerivedValue();
      getDerivedValue()->setStrokeWidth(_strokeWidth->getPropValue()->getAsNumber());
    }
    // Blend mode
    if (_blendMode->hasValue() &&  (_parentPaintWasReset || props->getHasPropChanges(PropNameBlendMode))) {
      ensureDerivedValue();
      auto blendValue = (int)_strokeJoin->getPropValue()->getAsNumber();
      getDerivedValue()->setBlendMode((SkBlendMode)blendValue);
    }
    // Stroke Join
    if (_strokeJoin->hasValue() &&  (_parentPaintWasReset || props->getHasPropChanges(PropNameStrokeJoin))) {
      ensureDerivedValue();
      auto joinValue = (int)_strokeJoin->getPropValue()->getAsNumber();
      getDerivedValue()->setStrokeJoin((SkPaint::Join)joinValue);
    }
    // Stroke Cap
    if (_strokeCap->hasValue() &&  (_parentPaintWasReset || props->getHasPropChanges(PropNameStrokeCap))) {
      ensureDerivedValue();
      auto capValue = (int)_strokeCap->getPropValue()->getAsNumber();
      getDerivedValue()->setStrokeCap((SkPaint::Cap)capValue);
    }
    // Stroke Miter
    if (_strokeMiter->hasValue() &&  (_parentPaintWasReset || props->getHasPropChanges(PropNameStrokeMiter))) {
      ensureDerivedValue();
      getDerivedValue()->setStrokeMiter(_strokeMiter->getPropValue()->getAsNumber());
    }
    // AntiAlias
    if (_antiAlias->hasValue() &&  (_parentPaintWasReset || props->getHasPropChanges(PropNameAntiAlias))) {
      ensureDerivedValue();
      getDerivedValue()->setAntiAlias(_antiAlias->getPropValue()->getAsNumber());
    }
    
    // TODO: Add shaders and filters

    // Reset parent paint flag - will only be set next time the parent paint is changed
    // meaning that we can keep our cache for a while.
    _parentPaintWasReset = false;
  }

  void ensureDerivedValue() {
    // We can bail out if we already have a value and parent paint didn't change
    if (getDerivedValue() != nullptr) {
      return;
    }
    // Now lets create a new paint object
    setDerivedValue(std::make_shared<SkPaint>(*_parentPaint));
  }
private:
  bool _parentPaintWasReset = true;
  std::shared_ptr<SkPaint> _parentPaint;
  std::shared_ptr<JsiDomNodeProp> _color;
  std::shared_ptr<JsiDomNodeProp> _style;
  std::shared_ptr<JsiDomNodeProp> _strokeWidth;
  std::shared_ptr<JsiDomNodeProp> _blendMode;
  std::shared_ptr<JsiDomNodeProp> _strokeJoin;
  std::shared_ptr<JsiDomNodeProp> _strokeCap;
  std::shared_ptr<JsiDomNodeProp> _strokeMiter;
  std::shared_ptr<JsiDomNodeProp> _antiAlias;
};

}
