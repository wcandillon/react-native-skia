#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiQuerySet : public JsiSkWrappingSharedPtrHostObject<wgpu::QuerySet> {
public:
  JsiQuerySet(std::shared_ptr<RNSkPlatformContext> context, wgpu::QuerySet m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::QuerySet>(
            context, std::make_shared<wgpu::QuerySet>(std::move(m))) {}

  JSI_HOST_FUNCTION(setLabel) {
    auto label = JsiChar::fromValue(runtime, arguments[0]);
    auto ret = getObject()->setLabel(*label.get());
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(getType) {

    auto ret = getObject()->getType();
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiQueryType>(getContext(), ret));
  }

  JSI_HOST_FUNCTION(getCount) {

    auto ret = getObject()->getCount();
    return jsi::Value(ret);
  }

  JSI_HOST_FUNCTION(destroy) {

    getObject()->destroy();
    return jsi::Value::undefined();
  }

  EXPORT_JSI_API_TYPENAME(JsiQuerySet, QuerySet)

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiQuerySet, setLabel),
                       JSI_EXPORT_FUNC(JsiQuerySet, getType),
                       JSI_EXPORT_FUNC(JsiQuerySet, getCount),
                       JSI_EXPORT_FUNC(JsiQuerySet, destroy))

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<wgpu::QuerySet> fromValue(jsi::Runtime &runtime,
                                                   const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<JsiQuerySet>(runtime)->getObject();
  }
};
} // namespace RNSkia
