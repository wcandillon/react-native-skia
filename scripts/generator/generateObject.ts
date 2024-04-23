import _ from "lodash";
import { Arg, JSIObject, Method } from "./model";
import { computeDependencies, isAtomicType, objectName } from './common';

// Special builtin: char, uint64_t, check if uint64_t is big it on Web

const generateArg = (index: number, arg: Arg) => {
  const name = _.camelCase(arg.name);
  let unwrap = '';
  if (arg.type === "bool") {
    unwrap = `${name}.asBool()`;
  } else if (arg.type === "uint32_t") {
    unwrap = `${name}.asNumber()`;
  } else {
    const name = objectName(arg.name);
    const className = `JsiWGPU${name}`;
    unwrap = `${className}::fromValue(runtime, arguments[${index}])`;
  }
  return `auto ${name} = ${unwrap};`;
};

export const wrapReturnValue = (returns: string | undefined) => {
  if (returns === undefined) {
    return "jsi::Value::undefined()";
  } else if (isAtomicType(returns)) {
    return "jsi::Value(ret)";
  } else {
    const name = objectName(returns);
    const className = `JsiWGPU${name}`;
    return `jsi::Object::createFromHostObject(runtime, std::make_shared<${className}>(getContext(), ret)`
  }
};

const generatorMethod = (method: Method) => {
  const args = method.args;
  const returns = method.returns;
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}
    ${returns ? 'auto ret = ' : ''}getObject()->${_.camelCase(method.name)}(${args.map(arg => arg.name).join(", ")});
    return ${wrapReturnValue(returns)};
  }
`;
};

const generatorAsyncMethod = (method: Method) => {
  const args = method.args;
  return `JSI_HOST_FUNCTION(${_.camelCase(method.name)}) {
    ${args.map((arg, index) => generateArg(index, arg)).join("\n    ")}
    auto context = getContext();
    auto instance = getObject();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [context = std::move(context), instance](
            jsi::Runtime &runtime,
            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
          wgpu::RequestAdapterOptions adapterOpts;
          // adapterOpts.compatibleSurface = surface;
          auto ret = instance->requestAdapter(adapterOpts);
          promise->resolve(jsi::Object::createFromHostObject(
              runtime, std::make_shared<Jsi${method.returns}>(std::move(context),
                                                    std::move(ret))));
        });
  }
`;
};

export const generateObject = (object: JSIObject) => {
  const className = `Jsi${object.name}`;
  const objectName = `wgpu::${object.host ? object.host : object.name}`;
  const methods = object.methods ?? [];
  return `#pragma once

#include "webgpu.hpp"

#include <jsi/jsi.h>

#include "JsiHostObject.h"
#include "JsiPromises.h"
#include "JsiSkHostObjects.h"
#include "RNSkPlatformContext.h"

${computeDependencies(object)}

namespace RNSkia {

namespace jsi = facebook::jsi;

class ${className} : public JsiSkWrappingSharedPtrHostObject<${objectName}> {
public:
${className}(std::shared_ptr<RNSkPlatformContext> context, ${objectName} m)
      : JsiSkWrappingSharedPtrHostObject<${objectName}>(
            context, std::make_shared<${objectName}>(std::move(m))) {}

  ${methods.filter(method => !method.async).map(method => generatorMethod(method)).join("\n  ")}
  ${methods.filter(method => method.async).map(method => generatorAsyncMethod(method)).join("\n  ")}

  EXPORT_JSI_API_BRANDNAME(${className}, ${object.name})

  ${methods.length > 0 ? `JSI_EXPORT_FUNCTIONS(
    ${methods.map(method => `JSI_EXPORT_FUNC(${className}, ${_.camelCase(method.name)})`).join(",\n    ")}
  )` : ''}

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