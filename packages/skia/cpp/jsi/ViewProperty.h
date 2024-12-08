#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>

#include "JsiDomRenderNode.h"
#include "JsiSkPicture.h"

namespace RNJsi {
namespace jsi = facebook::jsi;

class ViewProperty {
public:
  ViewProperty(jsi::Runtime &runtime, const jsi::Value &value) {
    if (value.isObject()) {
      auto object = value.asObject(runtime);
      if (object.isHostObject(runtime)) {
        auto hostObject = object.asHostObject(runtime);
        auto dom =
            std::dynamic_pointer_cast<RNSkia::JsiDomRenderNode>(hostObject);
        if (dom) {
          _value = dom;
        } else {
          auto jsiPicture =
              std::dynamic_pointer_cast<RNSkia::JsiSkPicture>(hostObject);
          if (jsiPicture) {
            _value = jsiPicture->getObject();
          }
        }
      }
    }
  }

  bool isNull() { return std::holds_alternative<nullptr_t>(_value); }

  std::shared_ptr<RNSkia::JsiDomRenderNode> getDomRenderNode() {
    return std::get<std::shared_ptr<RNSkia::JsiDomRenderNode>>(_value);
  }

  sk_sp<SkPicture> getPicture() { return std::get<sk_sp<SkPicture>>(_value); }

private:
  std::variant<nullptr_t, sk_sp<SkPicture>,
               std::shared_ptr<RNSkia::JsiDomRenderNode>>
      _value = nullptr;
};
} // namespace RNJsi
