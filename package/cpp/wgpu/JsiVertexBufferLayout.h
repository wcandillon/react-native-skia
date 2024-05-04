#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dawn/webgpu_cpp.h"

#include <jsi/jsi.h>

#include "JsiEnums.h"
#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureView.h"
#include "JsiVertexAttribute.h"
#include "MutableJSIBuffer.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiVertexBufferLayout
    : public JsiSkWrappingSharedPtrHostObject<wgpu::VertexBufferLayout> {
public:
  JsiVertexBufferLayout(std::shared_ptr<RNSkPlatformContext> context,
                        wgpu::VertexBufferLayout m)
      : JsiSkWrappingSharedPtrHostObject<wgpu::VertexBufferLayout>(
            context, std::make_shared<wgpu::VertexBufferLayout>(std::move(m))) {
  }

  // TODO: this fix, use JSI_EXPORT_PROPERTY_GETTERS instead
  EXPORT_JSI_API_BRANDNAME(JsiVertexBufferLayout, VertexBufferLayout)

  /**
   * Returns the underlying object from a host object of this type
   */
  static wgpu::VertexBufferLayout *fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &raw) {
    const auto &obj = raw.asObject(runtime);
    if (obj.isHostObject(runtime)) {
      return obj.asHostObject<JsiVertexBufferLayout>(runtime)
          ->getObject()
          .get();
    } else {
      auto object = new wgpu::VertexBufferLayout();

      if (obj.hasProperty(runtime, "arrayStride")) {
        auto arrayStride = obj.getProperty(runtime, "arrayStride");

        object->arrayStride = static_cast<uint64_t>(arrayStride.getNumber());
      } else {
        throw jsi::JSError(
            runtime,
            "Missing mandatory prop arrayStride in VertexBufferLayout");
      }
      if (obj.hasProperty(runtime, "stepMode")) {
        auto stepMode = obj.getProperty(runtime, "stepMode");

        object->stepMode = getVertexStepMode(
            stepMode.getString(runtime).utf8(runtime).c_str());
      }
      if (obj.hasProperty(runtime, "attributes")) {
        auto attributes = obj.getProperty(runtime, "attributes");
        auto jsiArray2 = attributes.asObject(runtime).asArray(runtime);
        auto jsiArray2Size = static_cast<int>(jsiArray2.size(runtime));
        auto array2 = new std::vector<wgpu::VertexAttribute>();
        array2->reserve(jsiArray2Size);
        for (int i = 0; i < jsiArray2Size; i++) {
          auto element = JsiVertexAttribute::fromValue(
              runtime, jsiArray2.getValueAtIndex(runtime, i));
          array2->push_back(*element);
        }

        object->attributeCount = jsiArray2Size;
        object->attributes = array2->data();
      } else {
        throw jsi::JSError(
            runtime, "Missing mandatory prop attributes in VertexBufferLayout");
      }
      return object;
    }
  }
};
} // namespace RNSkia
