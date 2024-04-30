#pragma once
#include <memory>
#include <string>
#include <utility>

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiColorTargetState.h"
#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiShaderModule.h"
#include "JsiSkHostObjects.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiFragmentState
    : public JsiSkWrappingSharedPtrHostObject<wgpu::FragmentState> {
public:
  JsiFragmentState(std::shared_ptr<RNSkPlatformContext> context,
                   wgpu::FragmentState m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::FragmentState>(
            context, std::make_shared<wgpu::FragmentState>(std::move(m))) {}

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiFragmentState, FragmentState)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::FragmentState *fromValue(jsi::Runtime &runtime,
                                        const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiFragmentState>(runtime)->getObject().get();
    } else {
      auto object = new wgpu::FragmentState();
      object->setDefault();

      if (obj.hasProperty(runtime, "module")) {
        auto module = obj.getProperty(runtime, "module");

        object->module = *JsiShaderModule::fromValue(runtime, module);
      } else {
        throw jsi::JSError(runtime,
                           "Missing mandatory prop module in FragmentState");
      }
      if (obj.hasProperty(runtime, "entryPoint")) {
        auto entryPoint = obj.getProperty(runtime, "entryPoint");

        object->entryPoint =
            strdup(entryPoint.getString(runtime).utf8(runtime).c_str());
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop entryPoint in FragmentState");
      }
      if (obj.hasProperty(runtime, "targets")) {
        auto targets = obj.getProperty(runtime, "targets");
        auto jsiArray2 = targets.asObject(runtime).asArray(runtime);
        auto jsiArray2Size = static_cast<int>(jsiArray2.size(runtime));
        auto array2 = new std::vector<wgpu::ColorTargetState>();
        array2->reserve(jsiArray2Size);
        for (int i = 0; i < jsiArray2Size; i++) {
          auto element = JsiColorTargetState::fromValue(
              runtime, jsiArray2.getValueAtIndex(runtime, i));
          array2->push_back(*element);
        }

        object->targetCount = jsiArray2Size;
        object->targets = array2->data();
      }
      return object;
    }
  }
};
} // namespace RNSkia
