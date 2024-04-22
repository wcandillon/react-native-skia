import _ from "lodash";
import { MemberTag, WGPUObject } from "./model";

export const generateObject = (name: string, object: WGPUObject) => {
  const className = `JsiWGPU${name}`;
  const objectName = `wgpu::${name}`;
  const methods = object.methods.filter(method => !(method.tags ?? []).includes(MemberTag.Emscripten))
  return `#pragma once

#include "webgpu.hpp"

namespace RNSkia {

namespace jsi = facebook::jsi;

class ${className} : public JsiSkWrappingSharedPtrHostObject<${objectName}> {
public:
${className}(std::shared_ptr<RNSkPlatformContext> context, ${objectName} m)
      : JsiSkWrappingSharedPtrHostObject<${objectName}>(
            context, std::make_shared<${objectName}>(std::move(m))) {}


  JSI_HOST_FUNCTION(get) {
    auto values = jsi::Array(runtime, 9);
    for (auto i = 0; i < 9; i++) {
      values.setValueAtIndex(runtime, i, getObject()->get(i));
    }
    return values;
  }

  EXPORT_JSI_API_TYPENAME(${className}, WGPU${name})

  JSI_EXPORT_FUNCTION(
    ${methods.map(method => `JSI_EXPORT_FUNC(${className}, ${_.camelCase(method.name)})`).join(",\n    ")}
  )

  /**
   * Returns the underlying object from a host object of this type
   */
  static std::shared_ptr<${objectName}> fromValue(jsi::Runtime &runtime,
                                             const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    return object.asHostObject<${className}>(runtime)->getObject();
  }
};
} // namespace RNSkia
`;
};